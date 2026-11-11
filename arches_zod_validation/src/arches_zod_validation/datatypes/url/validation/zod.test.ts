// zod.url.test.ts
import { describe, it, expect } from "vitest";
import {
    UrlValueSchema,
    UrlValueLabelRequiredSchema,
    HttpUrlValueSchema,
    HttpUrlValueLabelRequiredSchema,
} from "./zod";

// Helpers
const base = (overrides: Record<string, unknown> = {}) => ({
    display_value: null,
    node_value: { url: "https://example.com", url_label: null },
    details: [] as never[],
    ...overrides,
});

const node = (url: string, url_label: string | null = null) => ({
    url,
    url_label,
});

describe("UrlValueSchema (any valid URL, label optional)", () => {
    it("accepts a valid https URL with no label", () => {
        expect(UrlValueSchema.safeParse(base()).success).toBe(true);
    });

    it("accepts a valid http URL", () => {
        const ok = base({ node_value: node("http://example.com") });
        expect(UrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("accepts a ftp URL (any valid URL scheme is allowed)", () => {
        const ok = base({ node_value: node("ftp://example.com") });
        expect(UrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("accepts a null display_value", () => {
        const ok = base({ display_value: null });
        expect(UrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("accepts a null label", () => {
        const ok = base({ node_value: node("https://example.com", null) });
        expect(UrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("accepts a provided label", () => {
        const ok = base({
            node_value: node("https://example.com", "My Link"),
        });
        expect(UrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("rejects when url is an empty string (URL is required)", () => {
        const bad = base({ node_value: node("") });
        const result = UrlValueSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL is required/);
    });

    it("rejects when url is not a valid URL", () => {
        const bad = base({ node_value: node("not-a-url") });
        expect(UrlValueSchema.safeParse(bad).success).toBe(false);
    });

    it("rejects when details array is non-empty", () => {
        const bad = { ...base(), details: ["extra"] };
        expect(UrlValueSchema.safeParse(bad).success).toBe(false);
    });

    it("rejects when node_value is missing", () => {
        const bad = { display_value: null, details: [] };
        expect(UrlValueSchema.safeParse(bad).success).toBe(false);
    });
});

describe("UrlValueLabelRequiredSchema (any valid URL, label required)", () => {
    it("accepts a valid URL with a non-empty label", () => {
        const ok = base({
            node_value: node("https://example.com", "My Link"),
        });
        expect(UrlValueLabelRequiredSchema.safeParse(ok).success).toBe(true);
    });

    it("rejects when label is an empty string", () => {
        const bad = base({ node_value: node("https://example.com", "") });
        const result = UrlValueLabelRequiredSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL label is required/i);
    });

    it("rejects when label is null", () => {
        const bad = base({ node_value: node("https://example.com", null) });
        expect(UrlValueLabelRequiredSchema.safeParse(bad).success).toBe(false);
    });

    it("rejects when url is empty", () => {
        const bad = base({ node_value: node("", "My Link") });
        const result = UrlValueLabelRequiredSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL is required/);
    });

    it("rejects when url is not a valid URL", () => {
        const bad = base({ node_value: node("not-a-url", "My Link") });
        expect(UrlValueLabelRequiredSchema.safeParse(bad).success).toBe(false);
    });
});

describe("HttpUrlValueSchema (http/https only, label optional)", () => {
    it("accepts a valid https URL", () => {
        expect(HttpUrlValueSchema.safeParse(base()).success).toBe(true);
    });

    it("accepts a valid http URL", () => {
        const ok = base({ node_value: node("http://example.com") });
        expect(HttpUrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("rejects a ftp URL (only http/https allowed)", () => {
        const bad = base({ node_value: node("ftp://example.com") });
        const result = HttpUrlValueSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/http:\/\/ or https:\/\//);
    });

    it("rejects when url is empty", () => {
        const bad = base({ node_value: node("") });
        const result = HttpUrlValueSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL is required/);
    });

    it("rejects when url is not a valid URL", () => {
        const bad = base({ node_value: node("not-a-url") });
        expect(HttpUrlValueSchema.safeParse(bad).success).toBe(false);
    });

    it("accepts a null label", () => {
        const ok = base({ node_value: node("https://example.com", null) });
        expect(HttpUrlValueSchema.safeParse(ok).success).toBe(true);
    });

    it("rejects when details array is non-empty", () => {
        const bad = { ...base(), details: ["extra"] };
        expect(HttpUrlValueSchema.safeParse(bad).success).toBe(false);
    });
});

describe("HttpUrlValueLabelRequiredSchema (http/https only, label required)", () => {
    it("accepts a valid https URL with a label", () => {
        const ok = base({
            node_value: node("https://example.com", "My Link"),
        });
        expect(HttpUrlValueLabelRequiredSchema.safeParse(ok).success).toBe(
            true,
        );
    });

    it("accepts a valid http URL with a label", () => {
        const ok = base({
            node_value: node("http://example.com", "My Link"),
        });
        expect(HttpUrlValueLabelRequiredSchema.safeParse(ok).success).toBe(
            true,
        );
    });

    it("rejects a ftp URL", () => {
        const bad = base({ node_value: node("ftp://example.com", "My Link") });
        const result = HttpUrlValueLabelRequiredSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/http:\/\/ or https:\/\//);
    });

    it("rejects when label is empty", () => {
        const bad = base({ node_value: node("https://example.com", "") });
        const result = HttpUrlValueLabelRequiredSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL label is required/i);
    });

    it("rejects when label is null", () => {
        const bad = base({ node_value: node("https://example.com", null) });
        expect(HttpUrlValueLabelRequiredSchema.safeParse(bad).success).toBe(
            false,
        );
    });

    it("rejects when url is empty", () => {
        const bad = base({ node_value: node("", "My Link") });
        const result = HttpUrlValueLabelRequiredSchema.safeParse(bad);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toMatch(/URL is required/);
    });

    it("rejects when details array is non-empty", () => {
        const bad = {
            ...base(),
            node_value: node("https://example.com", "My Link"),
            details: ["extra"],
        };
        expect(HttpUrlValueLabelRequiredSchema.safeParse(bad).success).toBe(
            false,
        );
    });
});
