import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import type { Ref } from "vue";
import type { FormInstance } from "@primevue/forms";
import type { GenericZodObjectType } from "@/arches_zod_validation/validation-utils.ts";
import type { AliasedNodeData } from "@/arches_component_lab/types.ts";
import {
    formatPid,
    blankStringValue,
    blankResourceInstanceValue,
    blankResourceInstanceListValue,
    blankDateValue,
    blankBooleanValue,
    blankFileListValue,
    blankURLValue,
    blankNumberValue,
    trueBooleanValue,
    falseBooleanValue,
    blankGeoJSONValue,
    currentDateValue,
    isValid,
    updateModelValue,
} from "./utils.ts";

// ---------------------------------------------------------------------------
// formatPid
// ---------------------------------------------------------------------------

describe("formatPid", () => {
    it("formats a 9-digit number with dashes every 3 digits", () => {
        expect(formatPid(123456789)).toBe("123-456-789");
    });

    it("zero-pads numbers shorter than 9 digits", () => {
        expect(formatPid(1)).toBe("000-000-001");
        expect(formatPid(12345)).toBe("000-012-345");
    });

    it("formats zero as all-zero segments", () => {
        expect(formatPid(0)).toBe("000-000-000");
    });

    it("returns null for null or undefined input", () => {
        // @ts-expect-error -- testing with null which is not a valid number argument
        expect(formatPid(null)).toBeNull();
        // @ts-expect-error -- testing with undefined which is not a valid number argument
        expect(formatPid(undefined)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// blank value factories
// ---------------------------------------------------------------------------

describe("blankStringValue", () => {
    it("returns an object with empty display_value and English node_value", () => {
        const value = blankStringValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toEqual({
            en: { value: "", direction: "ltr" },
        });
        expect(value.details).toEqual([]);
    });

    it("returns a new object on each call", () => {
        expect(blankStringValue()).not.toBe(blankStringValue());
    });
});

describe("blankResourceInstanceValue", () => {
    it("returns an object with empty display_value, null node_value, and empty details", () => {
        const value = blankResourceInstanceValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toBeNull();
        expect(value.details).toEqual([]);
    });
});

describe("blankResourceInstanceListValue", () => {
    it("returns an object with empty display_value, empty array node_value, and empty details", () => {
        const value = blankResourceInstanceListValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toEqual([]);
        expect(value.details).toEqual([]);
    });
});

describe("blankDateValue", () => {
    it("returns an object with empty display_value, null node_value, and empty details", () => {
        const value = blankDateValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toBeNull();
        expect(value.details).toEqual([]);
    });
});

describe("blankBooleanValue", () => {
    it("returns an object with empty display_value, null node_value, and empty details", () => {
        const value = blankBooleanValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toBeNull();
        expect(value.details).toEqual([]);
    });
});

describe("blankFileListValue", () => {
    it("returns an object with empty display_value, empty array node_value, and empty details", () => {
        const value = blankFileListValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toEqual([]);
        expect(value.details).toEqual([]);
    });
});

describe("blankURLValue", () => {
    it("returns an object with empty display_value, blank url fields, and empty details", () => {
        const value = blankURLValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toEqual({ url: "", url_label: "" });
        expect(value.details).toEqual([]);
    });
});

describe("blankNumberValue", () => {
    it("returns an object with empty display_value, null node_value, and empty details", () => {
        const value = blankNumberValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toBeNull();
        expect(value.details).toEqual([]);
    });
});

describe("trueBooleanValue", () => {
    it('returns an object with true node_value and display_value "true"', () => {
        const value = trueBooleanValue();
        expect(value.display_value).toBe("true");
        expect(value.node_value).toBe(true);
        expect(value.details).toEqual([]);
    });
});

describe("falseBooleanValue", () => {
    it('returns an object with false node_value and display_value "false"', () => {
        const value = falseBooleanValue();
        expect(value.display_value).toBe("false");
        expect(value.node_value).toBe(false);
        expect(value.details).toEqual([]);
    });
});

describe("blankGeoJSONValue", () => {
    it("returns an object with empty display_value, null node_value, and empty details", () => {
        const value = blankGeoJSONValue();
        expect(value.display_value).toBe("");
        expect(value.node_value).toBeNull();
        expect(value.details).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// currentDateValue
// ---------------------------------------------------------------------------

describe("currentDateValue", () => {
    it("returns empty display_value and empty details", () => {
        const value = currentDateValue();
        expect(value.display_value).toBe("");
        expect(value.details).toEqual([]);
    });

    it("returns node_value as a YYYY-MM-DD date string", () => {
        const value = currentDateValue();
        expect(value.node_value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns a date string matching today", () => {
        const today = new Date().toISOString().split("T")[0];
        const value = currentDateValue();
        expect(value.node_value).toBe(today);
    });
});

// ---------------------------------------------------------------------------
// isValid
// ---------------------------------------------------------------------------

const makeSchema = (fields: Record<string, { success: boolean }>) => ({
    shape: Object.fromEntries(
        Object.entries(fields).map(([key, result]) => [
            key,
            { safeParse: vi.fn(() => result) },
        ]),
    ),
});

describe("isValid", () => {
    it("returns false when form.value is falsy", () => {
        const form = ref(null) as unknown as Ref<FormInstance>;
        const schema = makeSchema({});
        expect(isValid(form, schema as unknown as GenericZodObjectType)).toBe(
            false,
        );
    });

    it("returns true when all schema fields parse successfully", () => {
        const form = ref({
            states: {
                name: { value: "Alice" },
                age: { value: 30 },
            },
        } as unknown as FormInstance);
        const schema = makeSchema({
            name: { success: true },
            age: { success: true },
        });
        expect(isValid(form, schema as unknown as GenericZodObjectType)).toBe(
            true,
        );
    });

    it("returns false when any schema field fails to parse", () => {
        const form = ref({
            states: {
                name: { value: "" },
                age: { value: 30 },
            },
        } as unknown as FormInstance);
        const schema = makeSchema({
            name: { success: false },
            age: { success: true },
        });
        expect(isValid(form, schema as unknown as GenericZodObjectType)).toBe(
            false,
        );
    });

    it("returns true for form fields not present in the schema shape", () => {
        const form = ref({
            states: {
                extraField: { value: "anything" },
            },
        } as unknown as FormInstance);
        // schema has no shape entry for extraField
        const schema = { shape: {} };
        expect(isValid(form, schema as unknown as GenericZodObjectType)).toBe(
            true,
        );
    });

    it("calls safeParse with the field value", () => {
        const safeParse = vi.fn(() => ({ success: true }));
        const form = ref({
            states: {
                name: { value: "Bob" },
            },
        } as unknown as FormInstance);
        const schema = { shape: { name: { safeParse } } };
        isValid(form, schema as unknown as GenericZodObjectType);
        expect(safeParse).toHaveBeenCalledWith("Bob");
    });
});

// ---------------------------------------------------------------------------
// updateModelValue
// ---------------------------------------------------------------------------

describe("updateModelValue", () => {
    it("does not call validate when the value is unchanged", async () => {
        const validate = vi.fn();
        const form = ref({ validate } as unknown as FormInstance);
        const data: Record<string, unknown> = { name: "Alice" };

        await updateModelValue(
            "Alice" as unknown as AliasedNodeData,
            "name",
            data,
            form,
        );

        expect(validate).not.toHaveBeenCalled();
    });

    it("updates dataObject when validate returns no errors", async () => {
        const validate = vi.fn().mockResolvedValue({ errors: {} });
        const form = ref({ validate } as unknown as FormInstance);
        const data: Record<string, unknown> = { name: "Alice" };

        await updateModelValue(
            "Bob" as unknown as AliasedNodeData,
            "name",
            data,
            form,
        );

        expect(validate).toHaveBeenCalledWith("name");
        expect(data.name).toBe("Bob");
    });

    it("does not update dataObject when validate returns errors", async () => {
        const validate = vi.fn().mockResolvedValue({
            errors: { name: ["Name is required"] },
        });
        const form = ref({ validate } as unknown as FormInstance);
        const data: Record<string, unknown> = { name: "Alice" };

        await updateModelValue(
            "" as unknown as AliasedNodeData,
            "name",
            data,
            form,
        );

        expect(data.name).toBe("Alice");
    });

    it("updates dataObject when validate returns errors for other fields only", async () => {
        const validate = vi.fn().mockResolvedValue({
            errors: { other: ["Some error"] },
        });
        const form = ref({ validate } as unknown as FormInstance);
        const data: Record<string, unknown> = { name: "Alice" };

        await updateModelValue(
            "Bob" as unknown as AliasedNodeData,
            "name",
            data,
            form,
        );

        expect(data.name).toBe("Bob");
    });
});
