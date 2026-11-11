// datatypes/number/validation/zod.test.ts
import { describe, it, expect } from "vitest";
import { NumberValueSchema, NumberValueRequiredSchema } from "./zod";
import type { NumberValue } from "@/arches_vue_components/datatypes/number/types.ts";

const validNumber = (overrides: Partial<NumberValue> = {}) => ({
    display_value: "42",
    node_value: 42,
    details: [],
    ...overrides,
});

describe("NumberValueSchema (NumberValue)", () => {
    it("parses a valid NumberValue object", () => {
        const parsed = NumberValueSchema.parse(validNumber());
        expect(parsed.display_value).toBe("42");
        expect(parsed.node_value).toBe(42);
        expect(Array.isArray(parsed.details)).toBe(true);
    });

    it("allows node_value to be null", () => {
        const parsed = NumberValueSchema.parse(
            validNumber({ node_value: null }),
        );
        expect(parsed.node_value).toBeNull();
    });

    it("rejects non-numeric node_value", () => {
        expect(() =>
            NumberValueSchema.parse(
                validNumber({ node_value: "42" as unknown as number }),
            ),
        ).toThrow();
    });

    it("rejects NaN and Infinity", () => {
        expect(() =>
            NumberValueSchema.parse(validNumber({ node_value: Number.NaN })),
        ).toThrow();
        expect(() =>
            NumberValueSchema.parse(
                validNumber({ node_value: Number.POSITIVE_INFINITY }),
            ),
        ).toThrow();
    });

    it("requires display_value to be a string", () => {
        expect(() =>
            NumberValueSchema.parse(
                validNumber({ display_value: 42 as unknown as string }),
            ),
        ).toThrow();
    });
});

describe("NumberValueRequiredSchema (node_value required & finite)", () => {
    it("accepts finite numbers", () => {
        const parsed = NumberValueRequiredSchema.parse(
            validNumber({ node_value: 0 }),
        );
        expect(parsed.node_value).toBe(0);
    });

    it("rejects null node_value", () => {
        expect(() =>
            NumberValueRequiredSchema.parse(validNumber({ node_value: null })),
        ).toThrow();
    });

    it("rejects NaN and Infinity", () => {
        expect(() =>
            NumberValueRequiredSchema.parse(
                validNumber({ node_value: Number.NaN }),
            ),
        ).toThrow();
        expect(() =>
            NumberValueRequiredSchema.parse(
                validNumber({ node_value: Number.NEGATIVE_INFINITY }),
            ),
        ).toThrow();
    });
});
