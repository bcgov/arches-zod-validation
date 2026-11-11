// zod.file-list.test.ts
import { describe, it, expect } from "vitest";
import { FileListValueSchema } from "@/arches_zod_validation/datatypes/file-list/validation/zod";
import { MimeType } from "@/arches_zod_validation/datatypes/file-list/validation/constants.ts";
import type { FileReference } from "@/arches_vue_components/datatypes/file-list/types.ts";

// Fixed UUIDs for repeatable tests
const uuidA = "3c144c58-3e36-4f1f-965f-2c88f18c2a0d";
const uuidB = "9e505a0c-6d0d-4e78-9c7a-e0f76e413a5c";

// Helpers to build valid values
const blobUrl = (
    host = "example.com",
    proto: "http" | "https" = "https",
    id = uuidA,
) => `blob:${proto}://${host}/${id}`;

const validFile = (
    overrides: Partial<
        FileReference & { file: { objectURL: string }; node_id: string }
    > = {},
) => ({
    name: "test.png",
    size: 12345,
    type: MimeType.PNG,
    url: blobUrl(),
    file: { objectURL: blobUrl() },
    node_id: uuidB,
    ...overrides,
});

const validValue = (overrides: Record<string, unknown> = {}) => ({
    display_value: null, // schema allows string | null | undefined
    node_value: [validFile()],
    ...overrides,
});

describe("FileListValueSchema", () => {
    it("parses a fully valid value (single item)", () => {
        const parsed = FileListValueSchema.parse(validValue());
        expect(parsed.display_value).toBeNull();
        expect(parsed.node_value).toHaveLength(1);
        expect(parsed.node_value[0].type).toBe(MimeType.PNG);
    });

    it("parses a list with multiple files and an https URL with port", () => {
        const item1 = validFile();
        const item2 = validFile({
            name: "doc.pdf",
            type: MimeType.PDF,
            url: blobUrl("files.example.ca:8443"),
            file: { objectURL: blobUrl("files.example.ca:8443") },
            node_id: uuidA,
        });
        const parsed = FileListValueSchema.parse(
            validValue({ node_value: [item1, item2] }),
        );
        expect(parsed.node_value[1].name).toBe("doc.pdf");
        expect(parsed.node_value[1].type).toBe(MimeType.PDF);
    });

    it("accepts http and https blob schemes", () => {
        const httpItem = validFile({
            url: blobUrl("assets.local", "http"),
            file: { objectURL: blobUrl("assets.local", "http") },
        });
        const parsed = FileListValueSchema.parse(
            validValue({ node_value: [httpItem] }),
        );
        expect(parsed.node_value[0].url?.startsWith("blob:http://")).toBe(true);
    });

    it("allows display_value to be string, null, or undefined", () => {
        const asString = FileListValueSchema.parse(
            validValue({ display_value: "Some files" }),
        );
        expect(asString.display_value).toBe("Some files");

        const asNull = FileListValueSchema.parse(
            validValue({ display_value: null }),
        );
        expect(asNull.display_value).toBeNull();

        const asUndefined = FileListValueSchema.parse(
            validValue({ display_value: undefined }),
        );
        expect(asUndefined.display_value).toBeUndefined();
    });

    it("allows an empty file list", () => {
        const parsed = FileListValueSchema.parse(
            validValue({ node_value: [] }),
        );
        expect(parsed.node_value).toHaveLength(0);
    });

    it("rejects invalid mime type", () => {
        const bad = validValue({
            node_value: [validFile({ type: "image/unknown" })],
        });
        expect(() => FileListValueSchema.parse(bad)).toThrow(/invalid_value/i);
    });

    it("rejects non-blob or malformed URLs", () => {
        const notBlob = validValue({
            node_value: [validFile({ url: "https://example.com/" })],
        });
        expect(() => FileListValueSchema.parse(notBlob)).toThrow(/blob url/i);

        const badUuid = validValue({
            node_value: [
                validFile({
                    url: blobUrl("example.com", "https", "not-a-uuid"),
                }),
            ],
        });
        expect(() => FileListValueSchema.parse(badUuid)).toThrow(/blob url/i);

        const missingObjectUrl = validValue({
            node_value: [
                validFile({
                    file: {
                        objectURL: "blob:https://example.com/not-a-uuid",
                    },
                }),
            ],
        });
        expect(() => FileListValueSchema.parse(missingObjectUrl)).toThrow(
            /blob url/i,
        );
    });

    it("rejects non-UUID node_id", () => {
        const bad = validValue({
            node_value: [validFile({ node_id: "1234" })],
        });
        expect(() => FileListValueSchema.parse(bad)).toThrow(/uuid/i);
    });

    it("rejects invalid shapes inside node_value", () => {
        const badMissingFields = validValue({
            node_value: [{ name: "oops" }],
        });
        expect(() => FileListValueSchema.parse(badMissingFields)).toThrow();
    });
});
