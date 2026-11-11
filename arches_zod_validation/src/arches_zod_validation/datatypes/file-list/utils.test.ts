import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AliasedTileDataWithAudit } from "@/bcgov_arches_common/types.ts";

vi.mock("arches", () => ({
    default: {
        urls: {
            url_subpath: "/subpath/",
        },
    },
}));

const fileId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const makeRow = (overrides: Record<string, unknown> = {}) =>
    ({
        aliased_data: {
            photo: {
                display_value: "test.png",
                node_value: [
                    {
                        url: "/files/test.png",
                        name: "test.png",
                        file_id: fileId,
                        path: "",
                        size: 1024,
                        type: "image/png",
                        index: 0,
                        width: 100,
                        height: 100,
                        status: "uploaded",
                        content: "",
                        accepted: true,
                        lastModified: 0,
                        altText: "",
                        attribution: "",
                        description: "",
                        title: "",
                    },
                ],
                details: [],
            },
            ...overrides,
        },
    }) as unknown as AliasedTileDataWithAudit;

describe("getFileUrl", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("returns the original URL when it starts with blob:", async () => {
        const { getFileUrl } = await import("./utils");
        expect(getFileUrl("blob:https://example.com/some-id")).toBe(
            "blob:https://example.com/some-id",
        );
    });

    it("returns the original URL when it starts with http://", async () => {
        const { getFileUrl } = await import("./utils");
        expect(getFileUrl("http://example.com/file.png")).toBe(
            "http://example.com/file.png",
        );
    });

    it("returns the original URL when it starts with https://", async () => {
        const { getFileUrl } = await import("./utils");
        expect(getFileUrl("https://example.com/file.png")).toBe(
            "https://example.com/file.png",
        );
    });

    it("returns the original URL when it already starts with url_subpath", async () => {
        const { getFileUrl } = await import("./utils");
        expect(getFileUrl("/subpath/files/test.png")).toBe(
            "/subpath/files/test.png",
        );
    });

    it("prepends url_subpath to a relative URL", async () => {
        const { getFileUrl } = await import("./utils");
        expect(getFileUrl("/files/test.png")).toBe("/subpath/files/test.png");
    });

    it("deduplicates slashes when url_subpath and URL would produce //", async () => {
        const { getFileUrl } = await import("./utils");
        const result = getFileUrl("/files/test.png");
        expect(result).toBe("/subpath/files/test.png");
    });

    it("returns the original URL when called with an empty string", async () => {
        const { getFileUrl } = await import("./utils");
        expect(getFileUrl("")).toBe("");
    });

    it("returns the original URL when called with a falsy value", async () => {
        const { getFileUrl } = await import("./utils");
        // @ts-expect-error -- testing with null which is not a valid string argument
        expect(getFileUrl(null)).toBeFalsy();
        // @ts-expect-error -- testing with undefined which is not a valid string argument
        expect(getFileUrl(undefined)).toBeFalsy();
    });
});

describe("formatFilenameUrl", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("returns an anchor tag with the file name and URL", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const row = makeRow();
        const result = formatFilenameUrl(row, "photo");
        expect(result).toContain("<a ");
        expect(result).toContain("test.png");
        expect(result).toContain(`target="${fileId}"`);
    });

    it("href uses getFileUrl (prepends url_subpath for relative URLs)", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const row = makeRow();
        const result = formatFilenameUrl(row, "photo");
        expect(result).toContain('href="/subpath/files/test.png"');
    });

    it("returns empty string when node_value is an empty array", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const row = makeRow({
            photo: {
                display_value: null,
                node_value: [],
                details: [],
            },
        });
        expect(formatFilenameUrl(row, "photo")).toBe("");
    });

    it("returns empty string when the field is absent from aliased_data", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const row = makeRow();
        expect(formatFilenameUrl(row, "nonexistent_field")).toBe("");
    });

    it("returns empty string when aliased_data itself is missing", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const row = {} as unknown as AliasedTileDataWithAudit;
        expect(formatFilenameUrl(row, "photo")).toBe("");
    });

    it("returns empty string when node_value is null or undefined", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const row = makeRow({
            photo: { display_value: null, node_value: null, details: [] },
        });
        expect(formatFilenameUrl(row, "photo")).toBe("");
    });

    it("uses only the first file when node_value has multiple entries", async () => {
        const { formatFilenameUrl } = await import("./utils");
        const secondFileId = "ffffffff-0000-1111-2222-333333333333";
        const row = makeRow({
            photo: {
                display_value: null,
                node_value: [
                    {
                        url: "/files/first.png",
                        name: "first.png",
                        file_id: fileId,
                        path: "",
                        size: 0,
                        type: "image/png",
                        index: 0,
                        width: 0,
                        height: 0,
                        status: "",
                        content: "",
                        accepted: true,
                        lastModified: 0,
                        altText: "",
                        attribution: "",
                        description: "",
                        title: "",
                    },
                    {
                        url: "/files/second.png",
                        name: "second.png",
                        file_id: secondFileId,
                        path: "",
                        size: 0,
                        type: "image/png",
                        index: 1,
                        width: 0,
                        height: 0,
                        status: "",
                        content: "",
                        accepted: true,
                        lastModified: 0,
                        altText: "",
                        attribution: "",
                        description: "",
                        title: "",
                    },
                ],
                details: [],
            },
        });
        const result = formatFilenameUrl(row, "photo");
        expect(result).toBe(
            `<a href="/subpath/files/first.png" target="${fileId}">first.png</a>`,
        );
    });
});
