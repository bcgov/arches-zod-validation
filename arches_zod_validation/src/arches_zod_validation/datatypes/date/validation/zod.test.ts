import { describe, it, expect } from "vitest";
import { DateValueSchema, DateValueRequiredSchema } from "./zod";
import type { DateValue } from "@/arches_vue_components/datatypes/date/types.ts";

// a valid ISO date string for tests
const ISO_DATE = "2024-08-19";

// helpers to build payloads
const validRequired = (overrides: Partial<DateValue> = {}) => ({
    display_value: "Aug 19, 2024",
    node_value: ISO_DATE,
    details: [],
    ...overrides,
});

const validOptional = (overrides: Partial<DateValue> = {}) => ({
    display_value: "Aug 19, 2024",
    node_value: ISO_DATE,
    details: [],
    ...overrides,
});

describe("DateValueSchema (optional node_value)", () => {
    it("parses a valid ISO date string", () => {
        const parsed = DateValueSchema.parse(validOptional());
        expect(parsed.node_value).toBe(ISO_DATE);
        expect(parsed.display_value).toBe("Aug 19, 2024");
    });

    it("allows node_value to be null", () => {
        const parsed = DateValueSchema.parse(
            validOptional({ node_value: null }),
        );
        expect(parsed.node_value).toBeNull();
    });

    it("rejects malformed date strings", () => {
        const bad1 = validOptional({ node_value: "19-08-2024" }); // D-M-Y
        const bad2 = validOptional({ node_value: "2024-13-01" }); // invalid month
        const bad3 = validOptional({ node_value: "not-a-date" });
        expect(() => DateValueSchema.parse(bad1)).toThrow();
        expect(() => DateValueSchema.parse(bad2)).toThrow();
        expect(() => DateValueSchema.parse(bad3)).toThrow();
    });

    it("requires display_value to be a string when provided", () => {
        const bad = validOptional({ display_value: 123 as unknown as string });
        expect(() => DateValueSchema.parse(bad)).toThrow();
    });

    // NOTE: current schema allows display_value to be nullish; the TS interface says string.
    // This test documents the current schema behavior.
    it("accepts nullish display_value per current schema", () => {
        const parsed = DateValueSchema.parse({
            node_value: ISO_DATE,
            display_value: null,
            details: [],
        });
        expect(parsed.display_value).toBeNull();
    });
});

describe("DateValueRequiredSchema (node_value required)", () => {
    it("accepts a valid ISO date string", () => {
        const parsed = DateValueRequiredSchema.parse(validRequired());
        expect(parsed.node_value).toBe(ISO_DATE);
    });

    it("rejects null or empty node_value", () => {
        const nullNode = validRequired({ node_value: null });
        const emptyNode = validRequired({ node_value: "" });
        expect(() => DateValueRequiredSchema.parse(nullNode)).toThrow();
        expect(() => DateValueRequiredSchema.parse(emptyNode)).toThrow();
    });

    it("rejects malformed date strings", () => {
        const bad = validRequired({ node_value: "2024/08/19" });
        expect(() => DateValueRequiredSchema.parse(bad)).toThrow();
    });
});
