// datatypes/number/validation/zod.ts
import { z } from "zod";

/**
 * Generic "numeric" datatype schema for Arches-style values.
 * - node_value: number (finite) or null
 * - display_value: string
 * - details: unknown[] (Arches commonly returns [])
 */
const FiniteNumberSchema = z
    .number()
    .refine(Number.isFinite, { message: "Expected a finite number" });

export const NumberValueSchema = z.object({
    display_value: z.string(),
    node_value: FiniteNumberSchema.nullable(),
    details: z.array(z.unknown()),
});

export const NumberValueRequiredSchema = z.object({
    display_value: z.string(),
    node_value: FiniteNumberSchema,
    details: z.array(z.unknown()),
});
