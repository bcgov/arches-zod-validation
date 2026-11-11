import { z } from "zod";

export const CollectionItemSchema = z.object({
    key: z.string(),
    label: z.string(),
    conceptid: z.string(),
    sortOrder: z.string().nullish(),
    get children() {
        return z.array(CollectionItemSchema);
    },
});

export const ConceptValueSchema = z.object({
    display_value: z.string(),
    node_value: z.uuidv4().nullable(),
    details: z.array(CollectionItemSchema),
});

export const ConceptValueRequiredSchema = ConceptValueSchema.safeExtend({
    node_value: z.uuidv4().min(1, { message: "Value is required." }),
});
