import type { AliasedTileDataWithAudit } from "@/bcgov_arches_common/types.ts";
import type { FileListValue } from "@/arches_component_lab/datatypes/file-list/types.ts";
import arches from "arches";

export const formatFilenameUrl = (
    row: AliasedTileDataWithAudit,
    fieldName: string,
): string => {
    const imageData = row?.aliased_data?.[fieldName] as FileListValue;
    return imageData?.node_value?.length ?? 0 > 0
        ? `<a href="${getFileUrl(imageData?.node_value[0].url)}" target="${imageData.node_value[0].file_id}">${imageData.node_value[0].name}</a>`
        : "";
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
