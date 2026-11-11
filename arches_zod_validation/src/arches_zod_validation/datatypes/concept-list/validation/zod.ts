import { z } from "zod";
import { CollectionItemSchema } from "@/arches_zod_validation/datatypes/concept/validation/zod.ts";

export const ConceptListValueSchema = z.object({
    display_value: z.string(),
    node_value: z.array(z.uuidv4()).nullable(),
    details: z.array(CollectionItemSchema),
});

export const ConceptListValueRequiredSchema = ConceptListValueSchema.safeExtend(
    {
        node_value: z
            .array(z.uuidv4())
            .min(1, { message: "At least one option is required." }),
    },
);

export function getConceptListValueSchema(maxLength: number = 0) {
    return ConceptListValueSchema.safeExtend({
        node_value: z
            .array(z.uuidv4())
            .max(maxLength, {
                message: `Maximum number of allowed options is ${maxLength}.`,
            })
            .nullable(),
    });
}

export function getConceptListValueRequiredSchema(maxLength: number = 0) {
    return ConceptListValueRequiredSchema.safeExtend({
        node_value: z
            .array(z.uuidv4())
            .min(1, { message: "At least one option is required." })
            .max(maxLength, {
                message: `Maximum number of options is ${maxLength}.`,
            }),
    });
}
