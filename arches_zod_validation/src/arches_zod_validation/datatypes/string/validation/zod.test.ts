// zod.string.test.ts
import { describe, it, expect } from "vitest";
import type { StringValue } from "@/arches_vue_components/datatypes/string/types.ts";
import {
    StringValueSchema,
    StringValueRequiredSchema,
    getStringValueSchema,
    getStringValueRequiredSchema,
    getRichTextValueSchema,
    getRichTextValueRequiredSchema,
    getBCPostalCodeSchema,
    formatBCPostalCode,
    getBCPostalCodeRequiredSchema,
    getURLValueRequiredSchema,
} from "./zod";

// Helpers
const baseNode = (overrides: Record<string, unknown> = {}) => ({
    en: { value: "Hello", direction: "ltr", ...overrides },
});
const base = (overrides: Partial<StringValue> = {}) => ({
    display_value: "Hello",
    node_value: baseNode(),
    ...overrides,
});

describe("StringValueSchema (optional value, required object)", () => {
    it("parses a valid object with en.value string and direction", () => {
        const parsed = StringValueSchema.parse(base());
        expect(parsed.display_value).toBe("Hello");
        expect(parsed.node_value.en.value).toBe("Hello");
        expect(parsed.node_value.en.direction).toBe("ltr");
    });

    it("accepts null for en.value (schema uses nullable())", () => {
        const parsed = StringValueSchema.parse(
            base({ node_value: baseNode({ value: null }) }),
        );
        expect(parsed.node_value.en.value).toBeNull();
    });

    it("rejects invalid direction values", () => {
        const bad = base({ node_value: baseNode({ direction: "ttb" }) });
        expect(() => StringValueSchema.parse(bad)).toThrow();
    });

    it("rejects when node_value is null (schema expects an object)", () => {
        const bad = base({ node_value: null });
        expect(() => StringValueSchema.parse(bad)).toThrow();
    });

    it('rejects when "en" key is missing in node_value', () => {
        const bad = base({ node_value: {} });
        expect(() => StringValueSchema.parse(bad)).toThrow();
    });
});

describe("StringValueRequiredSchema (en.value required non-empty)", () => {
    it("parses when en.value is a non-empty string", () => {
        const parsed = StringValueRequiredSchema.parse(base());
        expect(parsed.node_value.en.value).toBe("Hello");
    });

    it("rejects empty string for en.value", () => {
        const bad = base({ node_value: baseNode({ value: "" }) });
        expect(() => StringValueRequiredSchema.parse(bad)).toThrow(
            /Value is required/i,
        );
    });

    it("rejects null for en.value in required schema", () => {
        const bad = base({ node_value: baseNode({ value: null }) });
        expect(() => StringValueRequiredSchema.parse(bad)).toThrow();
    });
});

describe("getStringValueSchema(maxLength)", () => {
    it("with maxLength=5, accepts strings up to 5 chars", () => {
        const Schema5 = getStringValueSchema(5);
        const ok = base({
            node_value: { en: { value: "Hello", direction: "ltr" } },
        });
        const parsed = Schema5.parse(ok);
        expect(parsed.node_value.en.value).toBe("Hello");
    });

    it("with maxLength=5, rejects longer strings", () => {
        const Schema5 = getStringValueSchema(5);
        const bad = base({
            node_value: { en: { value: "Hellooo", direction: "ltr" } },
        });
        expect(() => Schema5.parse(bad)).toThrow(/Maximum length is 5/);
    });

    it("with maxLength=0 (default), does not enforce max length", () => {
        const Schema0 = getStringValueSchema(); // no cap
        const ok = base({
            node_value: {
                en: { value: "A very very long string", direction: "ltr" },
            },
        });
        expect(Schema0.safeParse(ok).success).toBe(true);
    });

    it("with maxLength=5, still allows null for en.value (nullable in non-required)", () => {
        const Schema5 = getStringValueSchema(5);
        const okNull = base({
            node_value: { en: { value: null, direction: "ltr" } },
        });
        const parsed = Schema5.parse(okNull);
        expect(parsed.node_value.en.value).toBeNull();
    });
});

describe("getStringValueRequiredSchema(maxLength)", () => {
    it("with maxLength=5, en.value must be non-empty and ≤5 chars", () => {
        const Req5 = getStringValueRequiredSchema(5);
        const ok = base({
            node_value: { en: { value: "Hi!!!", direction: "ltr" } },
        });
        const parsed = Req5.parse(ok);
        expect(parsed.node_value.en.value).toBe("Hi!!!");
    });

    it("with maxLength=5, rejects longer strings", () => {
        const Req5 = getStringValueRequiredSchema(5);
        const bad = base({
            node_value: { en: { value: "TooLong", direction: "ltr" } },
        });
        expect(() => Req5.parse(bad)).toThrow(/Maximum length is 5/);
    });

    // NOTE: In your current implementation, when maxLength > 0 the required schema
    // does `...min(1).max(max).nullable()`, which makes null pass despite "required".
    // This test documents the present behavior so you can decide whether to remove `.nullable()`.
    it("DOCUMENTS CURRENT BEHAVIOR: with maxLength>0, null is accepted due to `.nullable()`", () => {
        const Req5 = getStringValueRequiredSchema(5);
        const currentBehavior = base({
            node_value: { en: { value: null, direction: "ltr" } },
        });
        const parsed = Req5.parse(currentBehavior);
        expect(parsed.node_value.en.value).toBeNull();
    });
});

describe("getRichTextValueSchema(maxLength)", () => {
    it("with no maxLength, accepts any html string", () => {
        const Schema = getRichTextValueSchema();
        const ok = base({
            node_value: {
                en: { value: "<p>Hello world</p>", direction: "ltr" },
            },
        });
        expect(Schema.safeParse(ok).success).toBe(true);
    });

    it("with no maxLength, accepts null for en.value", () => {
        const Schema = getRichTextValueSchema();
        const ok = base({
            node_value: { en: { value: null, direction: "ltr" } },
        });
        const parsed = Schema.parse(ok);
        expect(parsed.node_value.en.value).toBeNull();
    });

    it("with maxLength=5, accepts html whose plain-text length is within limit", () => {
        const Schema5 = getRichTextValueSchema(5);
        const ok = base({
            node_value: { en: { value: "<p>Hello</p>", direction: "ltr" } },
        });
        expect(Schema5.safeParse(ok).success).toBe(true);
    });

    it("with maxLength=5, rejects html whose plain-text length exceeds limit", () => {
        const Schema5 = getRichTextValueSchema(5);
        const bad = base({
            node_value: { en: { value: "<p>Too Long</p>", direction: "ltr" } },
        });
        expect(() => Schema5.parse(bad)).toThrow(/Maximum length is 5/);
    });

    it("with maxLength=5, counts only plain-text content (not html tags)", () => {
        const Schema5 = getRichTextValueSchema(5);
        // "<strong>Hi</strong>" is 2 plain-text chars
        const ok = base({
            node_value: {
                en: { value: "<strong>Hi</strong>", direction: "ltr" },
            },
        });
        expect(Schema5.safeParse(ok).success).toBe(true);
    });

    it("with maxLength=5, still allows null (nullable)", () => {
        const Schema5 = getRichTextValueSchema(5);
        const ok = base({
            node_value: { en: { value: null, direction: "ltr" } },
        });
        expect(Schema5.safeParse(ok).success).toBe(true);
    });
});

describe("getRichTextValueRequiredSchema(maxLength)", () => {
    it("with no maxLength, accepts non-empty html", () => {
        const Schema = getRichTextValueRequiredSchema();
        const ok = base({
            node_value: { en: { value: "<p>Hello</p>", direction: "ltr" } },
        });
        expect(Schema.safeParse(ok).success).toBe(true);
    });

    it("with no maxLength, rejects empty string", () => {
        const Schema = getRichTextValueRequiredSchema();
        const bad = base({ node_value: baseNode({ value: "" }) });
        expect(() => Schema.parse(bad)).toThrow(/Value is required/i);
    });

    it("with maxLength=5, rejects html whose plain-text length exceeds limit", () => {
        const Schema5 = getRichTextValueRequiredSchema(5);
        const bad = base({
            node_value: { en: { value: "<p>Too Long</p>", direction: "ltr" } },
        });
        const result = Schema5.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/Maximum length is 5/);
    });

    it("with maxLength=5, accepts html whose plain-text is within limit", () => {
        const Schema5 = getRichTextValueRequiredSchema(5);
        const ok = base({
            node_value: { en: { value: "<p>Hi</p>", direction: "ltr" } },
        });
        expect(Schema5.safeParse(ok).success).toBe(true);
    });

    it("DOCUMENTS CURRENT BEHAVIOR: with maxLength>0, null is accepted due to `.nullable()`", () => {
        const Schema5 = getRichTextValueRequiredSchema(5);
        const nullVal = base({
            node_value: { en: { value: null, direction: "ltr" } },
        });
        const parsed = Schema5.parse(nullVal);
        expect(parsed.node_value.en.value).toBeNull();
    });
});

describe("getBCPostalCodeSchema()", () => {
    const Schema = getBCPostalCodeSchema();

    it("accepts a valid BC postal code (A1B 2C3 format)", () => {
        expect(
            Schema.safeParse(base({ display_value: "V8W 1N3" })).success,
        ).toBe(true);
    });

    it("accepts empty display_value (postal code is optional)", () => {
        expect(Schema.safeParse(base({ display_value: "" })).success).toBe(
            true,
        );
    });

    it("rejects a postal code missing the space", () => {
        const result = Schema.safeParse(base({ display_value: "V8W1N3" }));
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/Invalid format/);
    });

    it("rejects a postal code with lowercase letters", () => {
        const result = Schema.safeParse(base({ display_value: "v8w 1n3" }));
        expect(result.success).toBe(false);
    });

    it("rejects a non-postal-code string", () => {
        const result = Schema.safeParse(base({ display_value: "not-a-code" }));
        expect(result.success).toBe(false);
    });
});

describe("formatBCPostalCode()", () => {
    it("formats a 6-char input into A1B 2C3 style", () => {
        expect(formatBCPostalCode("v8w1n3")).toBe("V8W 1N3");
    });

    it("strips existing spaces before formatting", () => {
        expect(formatBCPostalCode("V8W 1N3")).toBe("V8W 1N3");
    });

    it("handles input shorter than 3 chars (no space added)", () => {
        expect(formatBCPostalCode("v8")).toBe("V8");
    });

    it("handles exactly 3 chars (no space added)", () => {
        expect(formatBCPostalCode("v8w")).toBe("V8W");
    });

    it("handles input longer than 6 chars (truncates at 7 with space)", () => {
        expect(formatBCPostalCode("v8w1n3xyz")).toBe("V8W 1N3");
    });

    it("strips non-alphanumeric characters", () => {
        expect(formatBCPostalCode("V8W-1N3")).toBe("V8W 1N3");
    });

    it("uppercases all letters", () => {
        expect(formatBCPostalCode("abc123")).toBe("ABC 123");
    });
});

describe("getBCPostalCodeRequiredSchema()", () => {
    const Schema = getBCPostalCodeRequiredSchema();

    it("accepts a valid BC postal code", () => {
        const ok = base({
            display_value: "V8W 1N3",
            node_value: { en: { value: "V8W 1N3", direction: "ltr" } },
        });
        expect(Schema.safeParse(ok).success).toBe(true);
    });

    it("rejects empty en.value", () => {
        const bad = base({
            display_value: "",
            node_value: { en: { value: "", direction: "ltr" } },
        });
        const result = Schema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/Value is required/);
    });

    it("rejects an invalid postal code format", () => {
        const bad = base({
            display_value: "V8W1N3",
            node_value: { en: { value: "V8W1N3", direction: "ltr" } },
        });
        const result = Schema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/Invalid format/);
    });

    it("rejects a value exceeding 7 characters", () => {
        const bad = base({
            display_value: "V8W 1N3X",
            node_value: { en: { value: "V8W 1N3X", direction: "ltr" } },
        });
        const result = Schema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/Maximum length is 7/);
    });
});

describe("getURLValueRequiredSchema()", () => {
    const Schema = getURLValueRequiredSchema();

    const urlVal = (url: string, label = "My Link") => ({
        node_value: { url, url_label: label },
    });

    it("accepts a valid https URL with a label", () => {
        expect(Schema.safeParse(urlVal("https://example.ca")).success).toBe(
            true,
        );
    });

    it("accepts a valid http URL with a label", () => {
        expect(Schema.safeParse(urlVal("http://example.ca")).success).toBe(
            true,
        );
    });

    it("rejects when url is empty", () => {
        const result = Schema.safeParse(urlVal(""));
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL is required/);
    });

    it("rejects a URL containing spaces", () => {
        const result = Schema.safeParse(urlVal("https://exam ple.ca"));
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/cannot contain spaces/i);
    });

    it("rejects a URL without a dot", () => {
        const result = Schema.safeParse(urlVal("https://localhost"));
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/valid domain/i);
    });

    it("rejects a URL that does not start with http:// or https://", () => {
        const result = Schema.safeParse(urlVal("ftp://example.ca"));
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/must start with http/i);
    });

    it("rejects when url_label is empty (object form)", () => {
        const result = Schema.safeParse(urlVal("https://example.ca", ""));
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL Label is required/);
    });

    it("accepts when node_value is a plain string (skips label check)", () => {
        expect(
            Schema.safeParse({ node_value: "https://example.ca" }).success,
        ).toBe(true);
    });
});
