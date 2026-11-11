import { z } from "zod";

export const GeoJSONPositionSchema = z
    .array(z.number())
    .refine((arr: number[]) => arr.length >= 2 && arr.length <= 4, {
        message:
            "Position must have 2-4 coordinates (longitude, latitude, [altitude], [m])",
    });

export const GeoJSONGeometryTypeSchema = z.enum([
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
    "GeometryCollection",
]);

export const PointGeometrySchema = z.object({
    type: z.literal("Point"),
    coordinates: GeoJSONPositionSchema,
});

export const LineStringGeometrySchema = z.object({
    type: z.literal("LineString"),
    coordinates: z.array(GeoJSONPositionSchema).min(2),
});

export const PolygonGeometrySchema = z.object({
    type: z.literal("Polygon"),
    coordinates: z
        .array(
            // Each ring is an array of positions
            z
                .array(GeoJSONPositionSchema)
                .refine(
                    (ring: Array<number[]>) => ring.length >= 4, // First and last positions are the same
                    {
                        message:
                            "Polygon rings must have at least 4 positions (first and last positions are equal)",
                    },
                )
                .refine(
                    (ring: Array<number[]>) =>
                        JSON.stringify(ring[0]) ===
                        JSON.stringify(ring[ring.length - 1]),
                    {
                        message:
                            "First and last positions in a polygon ring must be the same",
                    },
                ),
        )
        .min(1), // At least one ring (exterior)
});

export const MultiPointGeometrySchema = z.object({
    type: z.literal("MultiPoint"),
    coordinates: z.array(GeoJSONPositionSchema),
});

export const MultiLineStringGeometrySchema = z.object({
    type: z.literal("MultiLineString"),
    coordinates: z.array(z.array(GeoJSONPositionSchema).min(2)),
});

export const MultiPolygonGeometrySchema = z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(
        z
            .array(
                z
                    .array(GeoJSONPositionSchema)
                    .refine((ring: Array<number[]>) => ring.length >= 4, {
                        message: "Polygon rings must have at least 4 positions",
                    })
                    .refine(
                        (ring: Array<number[]>) =>
                            JSON.stringify(ring[0]) ===
                            JSON.stringify(ring[ring.length - 1]),
                        {
                            message:
                                "First and last positions in a polygon ring must be the same",
                        },
                    ),
            )
            .min(1),
    ),
});

const GeoJSONGeometrySchema = z.discriminatedUnion("type", [
    PointGeometrySchema,
    LineStringGeometrySchema,
    PolygonGeometrySchema,
    MultiPointGeometrySchema,
    MultiLineStringGeometrySchema,
    MultiPolygonGeometrySchema,
]);

export const GeometryCollectionSchema = z.object({
    type: z.literal("GeometryCollection"),
    geometries: z.array(GeoJSONGeometrySchema),
});

const GeoJSONGeometryWithCollectionSchema = z.union([
    GeoJSONGeometrySchema,
    GeometryCollectionSchema,
]);

export const GeoJSONFeatureSchema = z.object({
    type: z.literal("Feature"),
    geometry: GeoJSONGeometryWithCollectionSchema.nullable(),
    properties: z.record(z.string(), z.any()).nullable(),
    id: z.union([z.string(), z.number()]).optional(),
});

export type GeoJSONFeature = ReturnType<typeof GeoJSONFeatureSchema.parse>;

export const GeoJSONFeatureCollectionSchema = z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(GeoJSONFeatureSchema),
    bbox: z.array(z.number()).optional(),
});

export type GeoJSONFeatureCollection = ReturnType<
    typeof GeoJSONFeatureCollectionSchema.parse
>;

export const GeoJSONFeatureCollectionValueSchema = z.object({
    display_value: z.string(),
    node_value: GeoJSONFeatureCollectionSchema.nullable(),
    details: z.array(z.object()),
});

export type GeoJSONFeatureCollectionValue = ReturnType<
    typeof GeoJSONFeatureCollectionValueSchema.parse
>;

export const validateFeatureCollection = (data: unknown) => {
    try {
        const result = GeoJSONFeatureCollectionSchema.parse(data);
        console.log("Valid FeatureCollection:", result.type);
        console.log("Features count:", result.features.length);
        return { valid: true, data: result };
    } catch (error) {
        console.error("Invalid FeatureCollection:", error);
        return { valid: false, error };
    }
};

// Non-empty geometry schemas

/**
 * Schema for validating a non-empty Point geometry.
 * A Point is non-empty if it has valid coordinates.
 */
export const NonEmptyPointGeometrySchema = PointGeometrySchema.extend({
    coordinates: GeoJSONPositionSchema.refine(
        (coords: Array<number>) =>
            coords.length >= 2 &&
            coords.every(
                (coord: number) => typeof coord === "number" && !isNaN(coord),
            ),
        {
            message: "Point must have valid numeric coordinates",
        },
    ),
});

/**
 * Schema for validating a non-empty LineString geometry.
 * A LineString is non-empty if it has at least 2 distinct positions.
 */
export const NonEmptyLineStringGeometrySchema = LineStringGeometrySchema.extend(
    {
        coordinates: z
            .array(GeoJSONPositionSchema)
            .min(2)
            .refine(
                (coords: Array<number[]>) => {
                    // Check that at least two points are different (non-zero length)
                    for (let i = 0; i < coords.length - 1; i++) {
                        const p1 = coords[i];
                        const p2 = coords[i + 1];

                        // If any two consecutive points are different, the line has length
                        if (JSON.stringify(p1) !== JSON.stringify(p2)) {
                            return true;
                        }
                    }
                    return false;
                },
                {
                    message:
                        "LineString must contain at least two distinct positions (non-zero length)",
                },
            ),
    },
);

/**
 * Schema for validating a non-empty Polygon geometry.
 * A Polygon is non-empty if it has:
 * 1. At least 4 positions in each ring (closed)
 * 2. A non-zero area (not all points are the same)
 */
export const NonEmptyPolygonGeometrySchema = PolygonGeometrySchema.extend({
    coordinates: z
        .array(
            z
                .array(GeoJSONPositionSchema)
                .refine((ring: Array<number[]>) => ring.length >= 4, {
                    message: "Polygon rings must have at least 4 positions",
                })
                .refine(
                    (ring: Array<number[]>) =>
                        JSON.stringify(ring[0]) ===
                        JSON.stringify(ring[ring.length - 1]),
                    {
                        message:
                            "First and last positions in a polygon ring must be the same",
                    },
                )
                .refine(
                    (ring: Array<number[]>) => {
                        // Check that the polygon has a non-zero area
                        // For a simple check, ensure at least 3 distinct vertices
                        const distinctPoints = new Set();
                        for (const point of ring) {
                            distinctPoints.add(JSON.stringify(point));
                        }
                        // Need at least 4 positions including the closing point,
                        // which means at least 3 distinct points
                        return distinctPoints.size >= 3;
                    },
                    {
                        message:
                            "Polygon must have non-zero area (at least 3 distinct vertices)",
                    },
                ),
        )
        .min(1),
});

/**
 * Schema for validating a Feature with non-empty Point geometry
 */
export const FeatureWithNonEmptyPointSchema = GeoJSONFeatureSchema.extend({
    geometry: NonEmptyPointGeometrySchema,
});

/**
 * Schema for validating a Feature with non-empty LineString geometry
 */
export const FeatureWithNonEmptyLineStringSchema = GeoJSONFeatureSchema.extend({
    geometry: NonEmptyLineStringGeometrySchema,
});

/**
 * Schema for validating a Feature with non-empty Polygon geometry
 */
export const FeatureWithNonEmptyPolygonSchema = GeoJSONFeatureSchema.extend({
    geometry: NonEmptyPolygonGeometrySchema,
});

/**
 * Feature collection schema that ensures all Point features have non-empty geometries
 * AND that the collection contains at least one Point feature
 */
export const FeatureCollectionWithNonEmptyPointsSchema =
    GeoJSONFeatureCollectionSchema.extend({
        features: z
            .array(GeoJSONFeatureSchema)
            .refine((features: GeoJSONFeature[]) => features.length > 0, {
                message: "Feature collection must contain at least one feature",
            })
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.some(
                        (feature: GeoJSONFeature) =>
                            feature.geometry?.type === "Point",
                    ),
                {
                    message:
                        "Feature collection must contain at least one Point feature",
                },
            )
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.every(
                        (feature: GeoJSONFeature) =>
                            feature.geometry?.type !== "Point" ||
                            NonEmptyPointGeometrySchema.safeParse(
                                feature.geometry,
                            ).success,
                    ),
                {
                    message: "All Point geometries must be non-empty",
                },
            ),
    });

/**
 * Feature collection schema that ensures all LineString features have non-empty geometries
 * AND that the collection contains at least one LineString feature
 */
export const FeatureCollectionWithNonEmptyLinesSchema =
    GeoJSONFeatureCollectionSchema.extend({
        features: z
            .array(GeoJSONFeatureSchema)
            .refine((features: GeoJSONFeature[]) => features.length > 0, {
                message: "Feature collection must contain at least one feature",
            })
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.some(
                        (feature: GeoJSONFeature) =>
                            feature.geometry?.type === "LineString",
                    ),
                {
                    message:
                        "Feature collection must contain at least one LineString feature",
                },
            )
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.every(
                        (feature: GeoJSONFeature) =>
                            feature.geometry?.type !== "LineString" ||
                            NonEmptyLineStringGeometrySchema.safeParse(
                                feature.geometry,
                            ).success,
                    ),
                {
                    message: "All LineString geometries must be non-empty",
                },
            ),
    });

/**
 * Feature collection schema that ensures all Polygon features have non-empty geometries
 * AND that the collection contains at least one Polygon feature
 */
export const FeatureCollectionWithNonEmptyPolygonsSchema =
    GeoJSONFeatureCollectionSchema.extend({
        features: z
            .array(GeoJSONFeatureSchema)
            .refine((features: GeoJSONFeature[]) => features.length > 0, {
                message: "Feature collection must contain at least one feature",
            })
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.some(
                        (feature: GeoJSONFeature) =>
                            feature.geometry?.type === "Polygon",
                    ),
                {
                    message:
                        "Feature collection must contain at least one Polygon feature",
                },
            )
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.every(
                        (feature: GeoJSONFeature) =>
                            feature.geometry?.type !== "Polygon" ||
                            NonEmptyPolygonGeometrySchema.safeParse(
                                feature.geometry,
                            ).success,
                    ),
                {
                    message: "All Polygon geometries must be non-empty",
                },
            ),
    });

/**
 * Feature collection schema that ensures all geometries are non-empty
 * AND that the collection contains at least one geometry feature
 */
export const FeatureCollectionWithNonEmptyGeometriesSchema =
    GeoJSONFeatureCollectionSchema.extend({
        features: z
            .array(GeoJSONFeatureSchema)
            .refine((features: GeoJSONFeature[]) => features.length > 0, {
                message: "Feature collection must contain at least one feature",
            })
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.some(
                        (feature: GeoJSONFeature) => feature.geometry !== null,
                    ),
                {
                    message:
                        "Feature collection must contain at least one feature with geometry",
                },
            )
            .refine(
                (features: GeoJSONFeature[]) =>
                    features.every(
                        (feature: GeoJSONFeature) =>
                            feature.geometry === null ||
                            (feature.geometry.type === "Point"
                                ? NonEmptyPointGeometrySchema.safeParse(
                                      feature.geometry,
                                  ).success
                                : feature.geometry.type === "LineString"
                                  ? NonEmptyLineStringGeometrySchema.safeParse(
                                        feature.geometry,
                                    ).success
                                  : feature.geometry.type === "Polygon"
                                    ? NonEmptyPolygonGeometrySchema.safeParse(
                                          feature.geometry,
                                      ).success
                                    : true),
                    ),
                {
                    message: "All geometries must be non-empty",
                },
            ),
    });

export const GeoJSONFeatureCollectionRequiredValueSchema = z.object({
    display_value: z.string(),
    node_value: FeatureCollectionWithNonEmptyGeometriesSchema,
    details: z.array(z.object()),
});
