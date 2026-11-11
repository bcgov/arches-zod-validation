import { z } from "zod";
import { MimeType } from "@/arches_zod_validation/datatypes/file-list/validation/constants.ts";

const blobUrlFormat = z
    .string()
    .regex(
        /^blob:https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/[0-9a-fA-F-]{36}$/,
        "Invalid blob URL format",
    )
    .nullish();

const FileMetadata = z.object({
    name: z.string(),
    size: z.number(),
    type: z.nativeEnum(MimeType),
    url: blobUrlFormat,
    file: z.object({ objectURL: blobUrlFormat }),
    node_id: z.string().uuid(),
});

export const FileListValueSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.array(FileMetadata),
});
