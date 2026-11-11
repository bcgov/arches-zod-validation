import type { AliasedTileData } from "@/arches_vue_components/types.ts";
import type { FileListAliasedNodeData } from "@/arches_vue_components/datatypes/file-list/types.ts";
import arches from "arches";

export const formatFilenameUrl = (
    row: AliasedTileData,
    fieldName: string,
): string => {
    const imageData = row?.aliased_data?.[fieldName] as FileListAliasedNodeData;
    const files = imageData?.node_value;
    return files && files.length > 0
        ? `<a href="${getFileUrl(files[0].url)}" target="${files[0].file_id}">${files[0].name}</a>`
        : "<span class='error'>Invalid URL</span>";
};

// This ensures that file URLs include any URL prefix when behind a reverse proxy
// This is duplicated from the arches-component-lab widget logic
// @todo - The arches-component-lab should expose the implementation
export const getFileUrl = (originalUrl: string) => {
    const httpRegex = /^(blob:|https?:\/\/)/;
    if (
        !originalUrl ||
        httpRegex.test(originalUrl) ||
        originalUrl.startsWith(arches.urls.url_subpath)
    ) {
        return originalUrl;
    }
    return (arches.urls.url_subpath + originalUrl).replace("//", "/");
};
