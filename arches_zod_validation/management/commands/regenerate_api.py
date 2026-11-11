"""Umbrella command orchestrating the full API codegen pipeline:

    1. generate_graph_views        (in-process: it only writes files)
    2. manage.py spectacular       (fresh subprocess -- see below)
    3. openapi-ts                  (subprocess: Node)
    4. black + prettier            (format generated artifacts)

Why step 2 is a subprocess and not call_command(): Django's startup system
checks import the URLconf, so THIS process may already hold the previous
generation of ``<project>.views.generated`` / ``urls_api_generated`` in
sys.modules. An in-process spectacular run would document the stale modules.
A fresh interpreter imports the files step 1 just wrote.

Why step 4 exists: the committed artifacts are formatted by the project's
pre-commit tooling (black, prettier). If the pipeline emitted unformatted
output, every run would differ from the committed files and --check would
always report drift. Formatting inside the pipeline makes its output
byte-identical to final committed form.

Usage:

    python manage.py regenerate_api
    python manage.py regenerate_api --check          # CI: fail if artifacts drifted
    python manage.py regenerate_api --skip-views     # graphs unchanged; redo 2-4 only
    python manage.py regenerate_api --skip-zod       # backend-only environments

Place at:
    arches_zod_validation/management/commands/regenerate_api.py
"""

import shutil
import subprocess
import sys
from importlib.util import find_spec
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from .generate_graph_views import default_project_name


class Command(BaseCommand):
    # Skip pre-command system checks: on a fresh project, ROOT_URLCONF may
    # include() the not-yet-existing urls_api_generated module, and default
    # checks import the URLconf -- the command would die before step 0 could
    # scaffold the stub that fixes it. Nothing is lost: step 2 runs
    # spectacular in a fresh subprocess, which performs full system checks
    # against the files written by steps 0-1.
    requires_system_checks = []

    help = (
        "Run the full API codegen pipeline: generated views -> OpenAPI spec "
        "(drf_spectacular) -> zod client (openapi-ts) -> formatting "
        "(black, prettier)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--project",
            default=None,
            help="Project package name (default: auto-detected, e.g. 'bcrhp').",
        )
        parser.add_argument(
            "--urlconf",
            default=None,
            help=(
                "Urlconf for spectacular " "(default: <project>.urls_api_documented)."
            ),
        )
        parser.add_argument(
            "--context-root",
            default="",
            help=(
                "Reverse-proxy context root prepended to generated routes "
                "(e.g. '/bcrhp/'). Any slash style accepted. Passed through "
                "to generate_graph_views. Default: none."
            ),
        )
        parser.add_argument(
            "--schema-file",
            default="schema.yml",
            help="OpenAPI spec output file. Default: schema.yml",
        )
        parser.add_argument(
            "--zod-cmd",
            default=None,
            help=(
                "Override the zod-generation command (space-separated). "
                "Default: the project's node_modules/.bin/openapi-ts, "
                "falling back to 'npx --no-install openapi-ts'."
            ),
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help=(
                "Pass --validate --fail-on-warn to spectacular, turning "
                "schema warnings into pipeline failures. Off by default."
            ),
        )
        parser.add_argument(
            "--skip-views",
            action="store_true",
            help="Skip step 1 (use the committed generated views as-is).",
        )
        parser.add_argument(
            "--skip-zod",
            action="store_true",
            help="Skip step 3 (e.g. backend-only environments without npm).",
        )
        parser.add_argument(
            "--skip-format",
            action="store_true",
            help=(
                "Skip step 4 (black/prettier). Note: --check will report "
                "drift against formatted committed artifacts if you skip "
                "formatting."
            ),
        )
        parser.add_argument(
            "--check",
            action="store_true",
            help=(
                "After regenerating and formatting, fail if any "
                "pipeline-owned artifact differs from the git index "
                "(CI drift check)."
            ),
        )

    def banner(self, text):
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n==> {text}"))

    def run_subprocess(self, argv, step, cwd=None):
        self.stdout.write(f"    $ {' '.join(str(a) for a in argv)}")
        result = subprocess.run(argv, cwd=cwd)
        if result.returncode != 0:
            raise CommandError(
                f"{step} failed (exit {result.returncode}); aborting pipeline. "
                "The tool's own error output is printed above this message."
            )

    def resolve_manage_py(self):
        """The manage.py this process was started with, for re-invocation."""
        candidate = Path(sys.argv[0]).resolve()
        if candidate.name != "manage.py" or not candidate.exists():
            raise CommandError(
                "Could not locate manage.py from sys.argv[0] "
                f"(got {candidate}). Run this command via manage.py."
            )
        return candidate

    def resolve_node_bin(self, name, repo_root):
        """Command vector for a Node CLI, preferring the project's pinned copy.

        Order: the binary npm installed into the project's node_modules/.bin
        (version pinned by the lockfile); then 'npx --no-install <name>'
        (still local-only: --no-install refuses to silently fetch an
        arbitrary latest version). Returns None if neither is available.
        """
        for candidate in (name, f"{name}.cmd"):  # .cmd: Windows npm shims
            local_bin = repo_root / "node_modules" / ".bin" / candidate
            if local_bin.exists():
                return [str(local_bin)]
        npx = shutil.which("npx")
        if npx:
            return [npx, "--no-install", name]
        return None

    def handle(self, *args, **options):
        project = options["project"] or default_project_name()
        urlconf = options["urlconf"] or f"{project}.urls_api_documented"
        schema_file = options["schema_file"]
        manage_py = self.resolve_manage_py()
        repo_root = manage_py.parent

        python_outputs = [
            f"{project}/views/generated",
            f"{project}/urls_api_generated.py",
        ]
        client_dir = f"{project}/src/{project}/client"

        # --- Step 0: scaffold first-run files (write-if-missing) -------------
        # Idempotent; a no-op on already-bootstrapped projects.
        self.banner("Step 0/4: bootstrap_api")
        call_command("bootstrap_api", project=project)

        # --- Step 1: generated views + urls (in-process; writes only) -------
        if options["skip_views"]:
            self.banner("Step 1/4: generate_graph_views (skipped)")
        else:
            self.banner("Step 1/4: generate_graph_views")
            call_command(
                "generate_graph_views",
                project=project,
                schema_file=schema_file,
                context_root=options["context_root"],
                overwrite=True,  # pipeline runs must be deterministic
            )

        # --- Step 2: OpenAPI spec (MUST be a fresh process) -----------------
        self.banner("Step 2/4: drf_spectacular schema")
        spectacular_argv = [
            sys.executable,
            str(manage_py),
            "spectacular",
            "--urlconf",
            urlconf,
            "--file",
            schema_file,
        ]
        if options["strict"]:
            # Promote schema warnings to failures. Opt-in: enable once the
            # schema is warning-clean, then keep it on to stay clean.
            spectacular_argv += ["--validate", "--fail-on-warn"]
        self.run_subprocess(spectacular_argv, step="spectacular", cwd=repo_root)

        # --- Step 3: zod client via openapi-ts -------------------------------
        # Invoked directly (no package.json script needed). openapi-ts reads
        # openapi-ts.config.ts from cwd, which step 1 scaffolds at repo root.
        if options["skip_zod"]:
            self.banner("Step 3/4: zod generation (skipped)")
        else:
            self.banner("Step 3/4: zod generation (openapi-ts)")
            if options["zod_cmd"]:
                argv = options["zod_cmd"].split()
            else:
                argv = self.resolve_node_bin("openapi-ts", repo_root)
                if argv is None:
                    raise CommandError(
                        "openapi-ts not found. Add @hey-api/openapi-ts to the "
                        "project's devDependencies and run 'npm install', or "
                        "pass --skip-zod."
                    )
            self.run_subprocess(argv, step="openapi-ts", cwd=repo_root)

        # --- Step 4: format generated artifacts ------------------------------
        # The committed artifacts are black/prettier-formatted (pre-commit),
        # so the pipeline must emit identical formatting or --check (and
        # every regeneration) produces spurious diffs.
        if options["skip_format"]:
            self.banner("Step 4/4: formatting (skipped)")
        else:
            self.banner("Step 4/4: formatting (black, prettier)")
            if find_spec("black") is None:
                raise CommandError(
                    "black is not installed in this environment. Install it "
                    "(it is part of the project toolchain) or pass "
                    "--skip-format."
                )
            self.run_subprocess(
                [sys.executable, "-m", "black", *python_outputs],
                step="black",
                cwd=repo_root,
            )
            if not options["skip_zod"]:
                prettier = self.resolve_node_bin("prettier", repo_root)
                if prettier is None:
                    raise CommandError(
                        "prettier not found in the project's node_modules. "
                        "Run 'npm install', or pass --skip-format."
                    )
                # Format the generated client's .ts/.json. Prettier formats
                # all supported files under a directory; scope it to the
                # generated output only, mirroring 'npm run prettier:fix'
                # without touching the rest of the tree.
                self.run_subprocess(
                    [*prettier, "--write", f"{client_dir}/**/*.{{ts,json}}"],
                    step="prettier",
                    cwd=repo_root,
                )

        # --- Optional CI drift check -----------------------------------------
        if options["check"]:
            self.banner("Drift check")
            owned = [schema_file, *python_outputs, client_dir]
            git = shutil.which("git")
            if git is None:
                raise CommandError("--check requires git on PATH.")
            result = subprocess.run(
                [git, "diff", "--exit-code", "--", *owned], cwd=repo_root
            )
            if result.returncode != 0:
                raise CommandError(
                    "Generated API artifacts are stale. Run "
                    "'python manage.py regenerate_api' and commit the changes."
                )
            self.stdout.write(self.style.SUCCESS("    No drift detected."))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nAPI codegen pipeline complete ({schema_file}, "
                f"{', '.join(python_outputs)}"
                + ("" if options["skip_zod"] else f", {client_dir}")
                + ")."
            )
        )
