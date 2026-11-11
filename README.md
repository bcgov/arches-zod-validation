# arches-zod-validation

![Lifecycle:Experimental](https://img.shields.io/badge/Lifecycle-Experimental-339999)

A TypeScript validation library that provides generic Zod schemas aligned with the data structures returned by Arches QuerySets, plus a Django code-generation pipeline that produces them from your project's resource graphs.

## Overview

`arches-zod-validation` bridges the gap between the dynamic JSON structures produced by Arches graph queries and the type safety expected in modern TypeScript applications.

The library provides a collection of composable Zod schemas that model the generic patterns found in Arches graph data, and a management-command pipeline that generates, per resource graph: read-only DRF views, an OpenAPI spec, and a Zod client — making the graph definitions the single source of truth from database to frontend.

## Features

- Generic schemas for common Arches QuerySet response structures
- Runtime validation using Zod
- Automatic TypeScript type inference
- Composable building blocks for custom graph schemas
- Generation of Zod schemas from Arches Resource models to provide a single source of truth

## Getting started

A complete recipe for a project that has never run the pipeline. The example project is `bcrhp`; substitute your own project package name throughout.

### 1. Install the Python dependencies

Add to the project's Python requirements and install:

```
arches-zod-validation
drf-spectacular
black
```

`drf_spectacular` is load-bearing even outside schema generation: the generated views import `extend_schema` at module load, so any process that imports the URLconf needs it. `black` formats the generated Python so output is byte-identical to your pre-commit formatting.

### 2. Configure Django settings

In `bcrhp/settings.py`:

```python
INSTALLED_APPS = [
    # ...
    "arches_zod_validation",
    "drf_spectacular",
]

REST_FRAMEWORK = {
    # merge with whatever you already have
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "My Project API",
    "DESCRIPTION": "My Project description",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_URLCONF": "bcrhp.urls_api_documented",
    "SCHEMA_PATH_PREFIX": "/bcrhp",
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "arches_zod_validation.schema.sort_generated_schema_properties",
        "arches_zod_validation.schema.strip_aliased_node_data_titles",
        "arches_zod_validation.schema.type_base_serializer_fields",
    ],
}
```

Key settings:

- **`SERVE_URLCONF`** — the urlconf spectacular documents. Set this to `<project>.urls_api_documented` (the file scaffolded by `bootstrap_api`), not the project's main `urls.py`. This keeps the documented API surface separate from internal routes.
- **`SCHEMA_PATH_PREFIX`** — pin this to the context root of your API (e.g. `"/bcrhp"`). Without it, drf-spectacular estimates the prefix dynamically from the registered routes, which can change as routes are added or removed and cause spurious renames in the generated Zod types.
- **`POSTPROCESSING_HOOKS`** — the three `arches_zod_validation.schema` hooks are required for correct Zod output:
  - `sort_generated_schema_properties` — orders tile-schema properties by node sortorder for stable diffs between regenerations.
  - `strip_aliased_node_data_titles` — removes node-specific titles from shared `AliasedNodeData` components so they remain generic across graphs.
  - `type_base_serializer_fields` — types the Arches base-serializer fields (`name`, `descriptors`, `provisional_edits`) that drf-spectacular cannot infer automatically.
  - `drf_spectacular.hooks.postprocess_schema_enums` is the drf-spectacular default enum hook; include it alongside the arches ones.

Without `DEFAULT_SCHEMA_CLASS`, the `spectacular` command runs but introspects views with DRF's legacy generator and produces a near-empty spec. The app ships a system check that reports both misconfigurations explicitly at startup.

### 3. Install the Node dependencies

```bash
npm install --save-dev @hey-api/openapi-ts prettier
```

(`prettier` is already standard in these Django projects; listed for completeness.) No `package.json` script entry is required — the pipeline invokes the project's pinned binaries directly from `node_modules/.bin/`.

### 4. Run the pipeline

```bash
python manage.py regenerate_api
```

On a first run this bootstraps everything it needs (see [The generation pipeline](#the-generation-pipeline)): a `urls_api_generated.py` stub, a `urls_api_documented.py` urlconf, and a default `openapi-ts.config.ts` — then generates the views, `schema.yml`, and the Zod client, and formats them with black and prettier.

If the app is served behind a reverse proxy with a context root (e.g. all URLs live under `/bcrhp/...` and the proxy passes the prefix through to Django):

```bash
python manage.py regenerate_api --context-root /bcrhp/
```

Any slash style works: `/bcrhp/`, `/bcrhp`, `bcrhp`, and `bcrhp/` are equivalent. See [Reverse proxies and context roots](#reverse-proxies-and-context-roots) before using this — it is only correct when the proxy does **not** strip the prefix.

### 5. Wire the routes into urls.py

Add one unconditional include to `bcrhp/urls.py`:

```python
from django.urls import include, path

urlpatterns = [
    # ...
    path("", include("bcrhp.urls_api_generated")),
]
```

No existence guard or try/except is needed: the bootstrap step commits a stub before the routes exist, so this include is always importable. Use `path("")` regardless of context root — the prefix is already inside the generated routes.

### 6. Verify

```bash
python manage.py runserver
# GET http://localhost:8000/api/<some_graph_slug>/   (authenticated)

python manage.py regenerate_api --check    # should report: No drift detected.
```

### 7. Commit everything

```bash
git add schema.yml openapi-ts.config.ts \
        bcrhp/urls.py bcrhp/urls_api_documented.py bcrhp/urls_api_generated.py \
        bcrhp/views bcrhp/src/bcrhp/client
git commit -m "Add generated API (views, OpenAPI spec, zod client)"
```

All pipeline outputs are committed artifacts — see [Workflow and commit policy](#workflow-and-commit-policy).

## The generation pipeline

One entry point, five stages, each failing fast:

```
python manage.py regenerate_api
```

0. **`bootstrap_api`** — scaffolds first-run files, strictly write-if-missing (a no-op on every later run): a `urls_api_generated.py` stub containing `urlpatterns = []`, and `urls_api_documented.py` (the urlconf spectacular documents — yours to edit, never overwritten). Runnable standalone as `python manage.py bootstrap_api`.
1. **`generate_graph_views`** — queries the project's resource graphs (excluding `arches_system_settings` and any graph with a `source_identifier`) and renders, per graph, a module containing a serializer pinned to the graph slug plus owner-scoped, read-only List and Retrieve views. Also renders `urls_api_generated.py` routing them, and scaffolds a default `openapi-ts.config.ts` at the repo root **only if missing** — that file is hand-tuned and is never overwritten.
2. **`spectacular`** — generates `schema.yml` from the dedicated urlconf `<project>.urls_api_documented`. Run in a **fresh subprocess** on purpose: Django's startup system checks import the URLconf, so the orchestrating process may hold the previous generation of the modules in `sys.modules`; a fresh interpreter is guaranteed to document the views just written.
3. **`openapi-ts`** — generates the Zod client from `schema.yml` into `<project>/src/<project>/client`, using the binary from the project's `node_modules/.bin/` (lockfile-pinned), falling back to `npx --no-install openapi-ts`.
4. **black + prettier** — formats the generated Python (`views/generated`, `urls_api_generated.py`) and the generated client's `.ts`/`.json`. Committed artifacts are formatted by pre-commit tooling; the pipeline must emit identical formatting or every run (and `--check`) would produce spurious diffs.

The pipeline commands set `requires_system_checks = []` so they can run on a fresh project whose URLconf is not yet importable; nothing is lost, because stage 2's subprocess performs full system checks against the files stages 0–1 just wrote.

### Generated layout (in the project, e.g. `bcrhp`)

```
<repo root>/
    openapi-ts.config.ts            scaffolded once; yours to edit
    schema.yml                      generated (stage 2)
    bcrhp/
        urls.py                     yours; one include() of urls_api_generated
        urls_api_documented.py      scaffolded once; yours to edit -- the
                                    urlconf spectacular documents
        urls_api_generated.py       generated (stage 1)
        views/
            generated/              generated (stage 1); fully owned by the pipeline
        src/bcrhp/client/           generated (stage 3)
```

The `urls_` naming keeps the three files adjacent in the filesystem: `urls.py`, `urls_api_documented.py`, `urls_api_generated.py`.

### Command reference

`python manage.py regenerate_api [options]`

| Option | Purpose |
| --- | --- |
| `--project NAME` | Project package (default: auto-detected from `settings.APP_NAME`, falling back to the settings module path). |
| `--urlconf DOTTED` | Urlconf for spectacular (default: `<project>.urls_api_documented`). |
| `--context-root PREFIX` | Reverse-proxy context root prepended to all generated routes, e.g. `/bcrhp/`. Any slash style accepted. See [Reverse proxies and context roots](#reverse-proxies-and-context-roots). |
| `--schema-file FILE` | OpenAPI spec path (default: `schema.yml`). |
| `--strict` | Pass `--validate --fail-on-warn` to spectacular. Off by default; enable once the schema is warning-clean, then keep it on — schema warnings are places where the Zod output is guessing. |
| `--skip-views` | Reuse the committed generated views (graphs unchanged). |
| `--skip-zod` | Backend-only environments without Node (prettier is skipped with it). |
| `--skip-format` | Skip stage 4. Note: `--check` will then report drift against the formatted committed artifacts. |
| `--zod-cmd "CMD"` | Override the openapi-ts invocation. |
| `--check` | After regenerating and formatting, fail if any pipeline-owned artifact differs from the git index (CI drift check). |

`bootstrap_api` and `generate_graph_views` can also be run standalone; see their `--help` for additional options (`--url-prefix`, `--dry-run`, `--overwrite`). Note that `regenerate_api` always regenerates views with `--overwrite` — pipeline runs must be deterministic.

### Reverse proxies and context roots

`--context-root` bakes the prefix into the generated route table, producing paths like `bcrhp/api/heritage_site/`. This is correct **only when the proxy passes the prefix through** and Django actually receives `/bcrhp/...` requests.

If the proxy **strips** the prefix before forwarding (Django receives `/api/...`), do **not** use `--context-root` — prefixed routes would 404 on every request. Use the Django-idiomatic pair instead: `FORCE_SCRIPT_NAME = "/bcrhp"` in settings for URL reversal, and `SPECTACULAR_SETTINGS["SERVERS"] = [{"url": "/bcrhp"}]` so the OpenAPI spec (and any client built on it) advertises the externally visible base path while route paths stay proxy-agnostic.

Check which behaviour your route/ingress is configured for before choosing.

## Workflow and commit policy

Stages 0–2 depend on **database state** (the graph definitions), not just source code, so CI generally cannot regenerate from scratch. All pipeline outputs are therefore **committed artifacts**, regenerated locally whenever graphs change — the same category of workflow as `makemigrations`, and not something to run in deploy scripts.

After changing a graph:

```bash
python manage.py regenerate_api
git add schema.yml bcrhp/views/generated bcrhp/urls_api_generated.py bcrhp/src/bcrhp/client
git commit
```

In CI, verify internal consistency of what's committed (no graph data needed):

```bash
python manage.py regenerate_api --skip-views --check
```

This reruns stages 2–4 against the committed views and fails on drift, catching the "edited the views or graphs but forgot to regenerate" class of error. If your CI does load the graphs, drop `--skip-views` for full coverage.

## Troubleshooting

**`--check` always reports drift.** Almost always formatting: the committed artifacts are black/prettier-formatted, so the pipeline must format too (stage 4) — make sure you are not passing `--skip-format`. If drift persists, look at which paths `git diff` printed above the error. If it is `schema.yml`, your prettier config is probably formatting YAML on commit while spectacular emits its own style: either add `schema.yml` to `.prettierignore` (preferred — let spectacular own its file) or extend formatting to cover it.

**Pipeline fails on a brand-new project.** It shouldn't — stage 0 scaffolds the missing files, and the commands skip Django's pre-command system checks precisely so they can run before `urls_api_generated.py` exists. If you see a URLconf import error from another command (`runserver`, `migrate`), run `python manage.py bootstrap_api` once, or run the full pipeline.

**Management commands disappear from `manage.py --help`, or `import arches_zod_validation` shows `__file__ == None`.** A stray `arches_zod_validation/` directory (no `__init__.py`) in the project root is shadowing the real app as a PEP 420 namespace package. Remove it. Current versions of the generator resolve output paths by importing the target package and refuse to write into namespace packages, so this cannot recur from the pipeline itself.

**`CommandError: ... would shadow it` mentioning `views.py`.** The project has a legacy `bcrhp/views.py` module; creating `bcrhp/views/` beside it would shadow the module (packages win) and break existing imports. Convert `views.py` into a `views/` package first.

**`Unknown command: 'spectacular'`.** `drf_spectacular` is missing from `INSTALLED_APPS` in the settings the process resolved (Django builds its command registry from `INSTALLED_APPS`). See [Getting started](#getting-started) step 2.

**`spectacular failed (exit 1)` with `--strict`.** Warnings were promoted to failures; the warning text is printed above the error. Fix with `@extend_schema` annotations or type hints on the offending views/mixins, or drop `--strict` until ready.

**Routes 404 in the deployed environment but work locally.** Context-root mismatch — see [Reverse proxies and context roots](#reverse-proxies-and-context-roots): either the proxy strips the prefix and the routes shouldn't contain it, or vice versa.

**Zod output differs between machines.** Ensure openapi-ts resolves from the project's `node_modules` (run `npm ci`); the pipeline deliberately refuses to let `npx` fetch an unpinned version.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

The AGPL ensures that modifications to this software remain available to the community, including when the software is used to provide network services. If you distribute this software, or make modified versions available over a network, you must also make the corresponding source code available under the same license.

For the full license text, see the LICENSE file in this repository or visit:
https://www.gnu.org/licenses/agpl-3.0.en.html
