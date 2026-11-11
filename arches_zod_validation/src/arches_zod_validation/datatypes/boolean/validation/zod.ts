// datatypes/boolean/validation/zod.ts
import { z } from "zod";

export const BooleanValueSchema = z.object({
    display_value: z.string(),
    node_value: z.boolean().nullable(),
    details: z.array(z.unknown()),
});

export const BooleanValueRequiredSchema = z.object({
    display_value: z.string(),
    node_value: z.boolean(),
    details: z.array(z.unknown()),
});
