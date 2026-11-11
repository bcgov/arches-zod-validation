import type {
    FileListValue,
    FileReference as CoreFileReference,
} from "@/arches_component_lab/datatypes/file-list/types.ts";

export type FileWithContext = File & CoreFileReference;

// This should probably be in arches-component-lab, or the FileReference there should
// potentially be modified
export type FileReference = FileListValue & {
    file?: FileWithContext;
    file_id: string;
    node_id?: string;
    name?: string;
    lastModified?: number;
    size?: number;
    type?: string;
};
