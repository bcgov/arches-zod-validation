// zod.resource-instance.test.ts
import { describe, it, expect } from "vitest";
import {
    ResourceInstanceValueSchema,
    ResourceInstanceValueRequiredSchema,
} from "./zod";
import type {
    ResourceInstanceValue,
    ResourceInstanceReference,
} from "@/arches_component_lab/datatypes/resource-instance/types.ts";

// fixed UUIDs for repeatable tests
const uuidA = "3c144c58-3e36-4f1f-965f-2c88f18c2a0d";
const uuidB = "9e505a0c-6d0d-4e78-9c7a-e0f76e413a5c";

const validRef = (overrides: Partial<ResourceInstanceReference> = {}) => ({
    resourceId: uuidA,
    ontologyProperty: null, // schema allows null
    resourceXresourceId: null, // schema allows null
    inverseOntologyProperty: null, // schema allows null
    ...overrides,
});

const validDetailsItem = (
    overrides: Partial<{ display_value: string; resource_id: string }> = {},
) => ({
    display_value: "Some linked resource",
    resource_id: uuidB,
    ...overrides,
});

const validValue = (overrides: Partial<ResourceInstanceValue> = {}) => ({
    display_value: "Pick a resource",
    node_value: validRef(),
    details: [validDetailsItem()],
    ...overrides,
});

describe("ResourceInstanceValueSchema (node_value nullable)", () => {
    it("parses a fully valid value", () => {
        const parsed = ResourceInstanceValueSchema.parse(validValue());
        expect(parsed.display_value).toBe("Pick a resource");
        expect(parsed.node_value?.resourceId).toBe(uuidA);
        expect(parsed.details[0].resource_id).toBe(uuidB);
    });

    it("allows node_value to be null", () => {
        const parsed = ResourceInstanceValueSchema.parse(
            validValue({ node_value: null }),
        );
        expect(parsed.node_value).toBeNull();
    });

    it("accepts null for optional reference fields (schema behavior)", () => {
        const parsed = ResourceInstanceValueSchema.parse(
            validValue({
                node_value: validRef({
                    ontologyProperty: null,
                    resourceXresourceId: null,
                    inverseOntologyProperty: null,
                }),
            }),
        );
        expect(parsed.node_value?.ontologyProperty).toBeNull();
    });

    it("rejects non-UUID resourceId in node_value", () => {
        const bad = validValue({
            node_value: validRef({ resourceId: "not-a-uuid" }),
        });
        expect(() => ResourceInstanceValueSchema.parse(bad)).toThrow(/uuid/i);
    });

    it("rejects non-UUID resource_id inside details", () => {
        const bad = validValue({
            details: [validDetailsItem({ resource_id: "oops" })],
        });
        expect(() => ResourceInstanceValueSchema.parse(bad)).toThrow(/uuid/i);
    });

    it("rejects invalid details item shape", () => {
        const bad = validValue({
            details: [
                { display_value: "x" },
            ] as unknown as ResourceInstanceValue["details"],
        });
        expect(() => ResourceInstanceValueSchema.parse(bad)).toThrow();
    });

    it("rejects missing display_value at the top level", () => {
        const bad = {
            ...validValue(),
            display_value: 123 as unknown as string,
        };
        expect(() => ResourceInstanceValueSchema.parse(bad)).toThrow();
    });
});

describe("ResourceInstanceValueRequiredSchema (node_value required)", () => {
    it("parses when node_value is a valid reference", () => {
        const parsed = ResourceInstanceValueRequiredSchema.parse(validValue());
        expect(parsed.node_value.resourceId).toBe(uuidA);
    });

    it("rejects null node_value", () => {
        const bad = validValue({ node_value: null });
        expect(() => ResourceInstanceValueRequiredSchema.parse(bad)).toThrow();
    });

    it("rejects when node_value has bad UUID", () => {
        const bad = validValue({
            node_value: validRef({ resourceId: "1234" }),
        });
        expect(() => ResourceInstanceValueRequiredSchema.parse(bad)).toThrow(
            /uuid/i,
        );
    });
});
