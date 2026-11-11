import { z } from "zod";

export const TileSchema = z.object({
    tileid: z.uuidv4().nullable(),
    resourceinstance: z.uuidv4().nullable(),
    nodegroup: z.string().nullable(),
    parenttile: z.string().nullable(),
    aliased_data: z.object({}),
    sortorder: z.number().nullable(),
    provisionaledits: z.unknown().nullable(),
});
