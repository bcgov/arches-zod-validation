import { z } from "zod";
import {
    ResourceInstanceReferenceSchema,
    ResourceInstanceValueDetailsSchema,
} from "@/arches_zod_validation/datatypes/resource-instance/validation/zod.ts";

export const ResourceInstanceListValueSchema = z.object({
    display_value: z.string(),
    node_value: z.array(ResourceInstanceReferenceSchema),
    details: z.array(ResourceInstanceValueDetailsSchema),
});

export const ResourceInstanceListValueRequiredSchema =
    ResourceInstanceListValueSchema.safeExtend({
        node_value: z.array(ResourceInstanceReferenceSchema).min(1),
    });
