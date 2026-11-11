// datatypes/resource-instance-list/validation/zod.test.ts
import { describe, it, expect } from "vitest";
import {
    ResourceInstanceListValueSchema,
    ResourceInstanceListValueRequiredSchema,
} from "./zod";
import type {
    ResourceInstanceListValue,
    ResourceInstanceReference,
    ResourceInstanceListOption,
} from "@/arches_component_lab/datatypes/resource-instance-list/types.ts";

// Properly formatted reference objects matching ResourceInstanceReferenceSchema
const validRef = (overrides: Partial<ResourceInstanceReference> = {}) => ({
    resourceId: "3c144c58-3e36-4f1f-965f-2c88f18c2a0d",
    ontologyProperty: "http://www.cidoc-crm.org/cidoc-crm/P1_is_identified_by",
    resourceXresourceId: "12345678-abcd-4321-9876-fedcba987654",
    inverseOntologyProperty:
        "http://www.cidoc-crm.org/cidoc-crm/P1i_identifies",
    ...overrides,
});

// Properly formatted details objects matching ResourceInstanceValueDetailsSchema
const validDetails = (overrides: Partial<ResourceInstanceListOption> = {}) => ({
    display_value: "Foo Resource", // Changed from displayname to display_value
    resource_id: "3c144c58-3e36-4f1f-965f-2c88f18c2a0d", // Changed from resourceId to resource_id
    // Removed graphid as it's not in the schema
    ...overrides,
});

const validResourceInstanceList = (
    overrides: Partial<ResourceInstanceListValue> = {},
) => ({
    display_value: "Foo Resource; Bar Resource",
    node_value: [
        validRef(),
        validRef({
            resourceId: "7b1f2a9e-4d6c-4a1e-9f18-6c8a0d8e2f77",
            resourceXresourceId: "87654321-dcba-4321-9876-abcdef123456",
        }),
    ],
    details: [
        validDetails(),
        validDetails({
            resource_id: "7b1f2a9e-4d6c-4a1e-9f18-6c8a0d8e2f77",
            display_value: "Bar Resource",
        }),
    ],
    ...overrides,
});

describe("ResourceInstanceListValueSchema (ResourceInstanceListValue)", () => {
    it("parses a valid ResourceInstanceListValue object", () => {
        const parsed = ResourceInstanceListValueSchema.parse(
            validResourceInstanceList(),
        );
        expect(parsed.display_value).toBe("Foo Resource; Bar Resource");
        expect(Array.isArray(parsed.node_value)).toBe(true);
        expect(parsed.node_value.length).toBe(2);
        expect(Array.isArray(parsed.details)).toBe(true);
        expect(parsed.details.length).toBe(2);
    });

    it("rejects when display_value is not a string", () => {
        const bad = validResourceInstanceList({
            display_value: 123 as unknown as string,
        });
        expect(() => ResourceInstanceListValueSchema.parse(bad)).toThrow();
    });

    it("rejects when node_value contains an invalid reference object", () => {
        const badRef = { ...validRef(), resourceId: 123 }; // should be string/uuid per referenced schema
        const bad = validResourceInstanceList({ node_value: [badRef] });
        expect(() => ResourceInstanceListValueSchema.parse(bad)).toThrow();
    });

    it("rejects when details contains an invalid details object", () => {
        const badDetails = { ...validDetails(), display_value: 42 }; // should be string per referenced schema
        const bad = validResourceInstanceList({ details: [badDetails] });
        expect(() => ResourceInstanceListValueSchema.parse(bad)).toThrow();
    });
});

describe("ResourceInstanceListValueRequiredSchema (node_value required, min 1)", () => {
    it("accepts when node_value contains at least one reference", () => {
        const parsed = ResourceInstanceListValueRequiredSchema.parse(
            validResourceInstanceList({ node_value: [validRef()] }),
        );
        expect(parsed.node_value.length).toBe(1);
    });

    it("rejects empty node_value array", () => {
        const empty = validResourceInstanceList({ node_value: [] });
        expect(() =>
            ResourceInstanceListValueRequiredSchema.parse(empty),
        ).toThrow();
    });

    it("still rejects invalid reference objects even when non-empty", () => {
        const badRef = { ...validRef(), resourceId: "not-a-uuid" };
        const bad = validResourceInstanceList({ node_value: [badRef] });
        expect(() =>
            ResourceInstanceListValueRequiredSchema.parse(bad),
        ).toThrow();
    });
});
