// datatypes/boolean/validation/zod.test.ts
import { describe, it, expect } from "vitest";
import { BooleanValueSchema, BooleanValueRequiredSchema } from "./zod";
import type { BooleanValue } from "@/arches_vue_components/datatypes/boolean/types.ts";

const validBoolean = (overrides: Partial<BooleanValue> = {}) => ({
    display_value: "Yes",
    node_value: true,
    details: [],
    ...overrides,
});

describe("BooleanValueSchema (BooleanValue)", () => {
    it("parses a valid BooleanValue object", () => {
        const parsed = BooleanValueSchema.parse(validBoolean());
        expect(parsed.display_value).toBe("Yes");
        expect(parsed.node_value).toBe(true);
        expect(Array.isArray(parsed.details)).toBe(true);
    });

    it("allows node_value to be null", () => {
        const parsed = BooleanValueSchema.parse(
            validBoolean({ node_value: null }),
        );
        expect(parsed.node_value).toBeNull();
    });

    it("rejects when node_value is not boolean/null", () => {
        expect(() =>
            BooleanValueSchema.parse(
                validBoolean({ node_value: "true" as unknown as boolean }),
            ),
        ).toThrow();
    });

    it("requires display_value to be a string", () => {
        expect(() =>
            BooleanValueSchema.parse(
                validBoolean({ display_value: 123 as unknown as string }),
            ),
        ).toThrow();
    });
});

describe("BooleanValueRequiredSchema (node_value required)", () => {
    it("accepts when node_value is boolean", () => {
        const parsed = BooleanValueRequiredSchema.parse(
            validBoolean({ node_value: false }),
        );
        expect(parsed.node_value).toBe(false);
    });

    it("rejects null node_value", () => {
        expect(() =>
            BooleanValueRequiredSchema.parse(
                validBoolean({ node_value: null }),
            ),
        ).toThrow();
    });
});
