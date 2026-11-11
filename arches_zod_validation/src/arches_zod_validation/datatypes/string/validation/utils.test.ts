import { describe, it, expect } from "vitest";
import {
    convertNbspStringToSpaces,
    convertNbspToSpaces,
    htmlToPlainText,
} from "./utils.ts";
import type { StringValue } from "@/arches_component_lab/datatypes/string/types.ts";

function makeStringValue(
    nodeValues: Record<string, string>,
    displayValue: string,
): StringValue {
    const node_value: Record<
        string,
        { value: string; direction: "ltr" | "rtl" }
    > = {};
    for (const [lang, value] of Object.entries(nodeValues)) {
        node_value[lang] = { value, direction: "ltr" };
    }
    return {
        node_value,
        display_value: displayValue,
        details: [],
    } as StringValue;
}

describe("convertNbspStringToSpaces", () => {
    it("returns falsy values unchanged", () => {
        expect(convertNbspStringToSpaces("")).toBe("");
        // @ts-expect-error -- testing with null which is not a valid string argument
        expect(convertNbspStringToSpaces(null)).toBeNull();
        // @ts-expect-error -- testing with undefined which is not a valid string argument
        expect(convertNbspStringToSpaces(undefined)).toBeUndefined();
    });

    it("replaces &nbsp; HTML entities with regular spaces", () => {
        expect(convertNbspStringToSpaces("Hello&nbsp;world")).toBe(
            "Hello world",
        );
        expect(convertNbspStringToSpaces("a&nbsp;b&nbsp;c")).toBe("a b c");
    });

    it("replaces \\u00A0 non-breaking space characters with regular spaces", () => {
        expect(convertNbspStringToSpaces("Hello\u00A0world")).toBe(
            "Hello world",
        );
        expect(convertNbspStringToSpaces("a\u00A0b\u00A0c")).toBe("a b c");
    });

    it("replaces both &nbsp; entities and \\u00A0 characters in the same string", () => {
        expect(convertNbspStringToSpaces("a&nbsp;b\u00A0c")).toBe("a b c");
    });

    it("returns the string unchanged when no non-breaking spaces are present", () => {
        expect(convertNbspStringToSpaces("Hello world")).toBe("Hello world");
        expect(convertNbspStringToSpaces("<p>Normal text</p>")).toBe(
            "<p>Normal text</p>",
        );
    });
});

describe("convertNbspToSpaces", () => {
    it("returns falsy values unchanged", () => {
        // @ts-expect-error -- testing with null which is not a valid StringValue argument
        expect(convertNbspToSpaces(null)).toBeNull();
        // @ts-expect-error -- testing with undefined which is not a valid StringValue argument
        expect(convertNbspToSpaces(undefined)).toBeUndefined();
    });

    it("replaces &nbsp; in node_value language entries", () => {
        const val = makeStringValue(
            { en: "Hello&nbsp;world" },
            "Hello&nbsp;world",
        );
        const result = convertNbspToSpaces(val);
        expect(result?.node_value?.["en"].value).toBe("Hello world");
    });

    it("replaces &nbsp; in display_value", () => {
        const val = makeStringValue({ en: "Hello world" }, "Hello&nbsp;world");
        const result = convertNbspToSpaces(val);
        expect(result?.display_value).toBe("Hello world");
    });

    it("replaces \\u00A0 in both node_value and display_value", () => {
        const val = makeStringValue({ en: "a\u00A0b" }, "c\u00A0d");
        const result = convertNbspToSpaces(val);
        expect(result?.node_value?.["en"].value).toBe("a b");
        expect(result?.display_value).toBe("c d");
    });

    it("processes multiple language entries", () => {
        const val = makeStringValue(
            { en: "Hello&nbsp;world", fr: "Bonjour&nbsp;monde" },
            "Hello&nbsp;world",
        );
        const result = convertNbspToSpaces(val);
        expect(result?.node_value?.["en"].value).toBe("Hello world");
        expect(result?.node_value?.["fr"].value).toBe("Bonjour monde");
    });

    it("skips language entries where value is falsy", () => {
        const val = makeStringValue({}, "Hello&nbsp;world");
        val.node_value = { en: { value: "", direction: "ltr" } };
        const result = convertNbspToSpaces(val);
        expect(result?.node_value?.["en"].value).toBe("");
    });

    it("mutates and returns the same object reference", () => {
        const val = makeStringValue(
            { en: "Hello&nbsp;world" },
            "Hello&nbsp;world",
        );
        const result = convertNbspToSpaces(val);
        expect(result).toBe(val);
    });
});

describe("htmlToPlainText – DOM environment", () => {
    // If tests are running in a pure Node env without jsdom, we skip DOM-specific tests.
    if (typeof document === "undefined") {
        it("skips DOM-specific tests when document is not available", () => {
            expect(typeof document).toBe("undefined");
        });
        return;
    }

    it("returns empty string for empty / falsy input", () => {
        expect(htmlToPlainText("")).toBe("");
        // @ts-expect-error -- testing with null which is not a valid string argument
        expect(htmlToPlainText(null)).toBe("");
        // @ts-expect-error -- testing with undefined which is not a valid string argument
        expect(htmlToPlainText(undefined)).toBe("");
    });

    it("converts a simple paragraph to plain text", () => {
        const html = "<p>Hello world</p>";
        const result = htmlToPlainText(html);
        expect(result).toBe("Hello world");
    });

    it("converts <br> tags into newline characters", () => {
        const html = "Hello<br>World";
        const result = htmlToPlainText(html);
        expect(result).toBe("Hello\nWorld");
    });

    it("trims spaces before newlines created from <br>", () => {
        const html = "<p>Hello   <br>World</p>";
        const result = htmlToPlainText(html);
        // note: spaces before the newline should be removed
        expect(result).toBe("Hello\nWorld");
    });

    it("handles multiple paragraphs (each ending with a single newline)", () => {
        const html = "<p>First paragraph.</p><p>Second paragraph.</p>";
        const result = htmlToPlainText(html);

        // Current implementation appends a single "\n" per <p>,
        // so the paragraphs end up as:
        // "First paragraph.\nSecond paragraph."
        expect(result).toBe("First paragraph.\nSecond paragraph.");
    });

    it("renders unordered lists with bullet prefixes and newline after each item", () => {
        const html = `
            <ul>
                <li>First item</li>
                <li>Second item</li>
            </ul>
        `;
        const result = htmlToPlainText(html);

        // Each <li> gets "• " prefix and a trailing "\n".
        // .trim() at the end removes the last newline only.
        expect(result).toBe("• First item\n• Second item");
    });

    it("renders ordered lists with numeric prefixes and newline after each item", () => {
        const html = `
            <ol>
                <li>First</li>
                <li>Second</li>
                <li>Third</li>
            </ol>
        `;
        const result = htmlToPlainText(html);

        expect(result).toBe("1. First\n2. Second\n3. Third");
    });

    it("normalizes non-breaking spaces to regular spaces", () => {
        const html = "<p>Hello&nbsp;world&nbsp;&nbsp;!</p>";
        const result = htmlToPlainText(html);

        // &nbsp; → "\u00a0" in the DOM, which should be converted to " "
        expect(result).toBe("Hello world  !");
    });
});

describe("htmlToPlainText – fallback without document (stripTagsFallback)", () => {
    it("uses the non-DOM fallback when document is not available", () => {
        const hadDocument = "document" in globalThis;
        const originalDocument = (globalThis as Record<string, unknown>)
            .document;

        if (hadDocument) {
            // Remove `document` from the global object so that
            // `typeof document === "undefined"` inside the function becomes true.
            delete (globalThis as Record<string, unknown>).document;
        }

        try {
            const html = "<p>Hello<br>World</p>";
            const result = htmlToPlainText(html);

            // stripTagsFallback behavior:
            // <br> -> "\n", </p> -> "\n", then tags stripped, then
            // whitespace collapsed to single spaces.
            // "<p>Hello<br>World</p>" -> "Hello World"
            expect(result).toBe("Hello World");
        } finally {
            // Restore original document so other tests (or other suites)
            // aren’t affected.
            if (hadDocument) {
                (globalThis as Record<string, unknown>).document =
                    originalDocument;
            }
        }
    });
});
