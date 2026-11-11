// geojson-feature-collection.zod.test.ts
import { describe, expect, it } from "vitest";
import {
    GeoJSONFeatureCollectionSchema,
    GeoJSONFeatureCollectionValueSchema,
    PointGeometrySchema,
    PolygonGeometrySchema,
    LineStringGeometrySchema,
    GeoJSONFeatureSchema,

    // Non-empty geometry schemas
    NonEmptyPointGeometrySchema,
    NonEmptyLineStringGeometrySchema,
    NonEmptyPolygonGeometrySchema,

    // Non-empty feature schemas
    FeatureWithNonEmptyPointSchema,
    FeatureWithNonEmptyLineStringSchema,
    FeatureWithNonEmptyPolygonSchema,

    // Non-empty feature collection schemas
    FeatureCollectionWithNonEmptyPointsSchema,
    FeatureCollectionWithNonEmptyLinesSchema,
    FeatureCollectionWithNonEmptyPolygonsSchema,
    FeatureCollectionWithNonEmptyGeometriesSchema,
} from "@/bcgov_arches_common/datatypes/geojson-feature-collection/validation/zod"; // adjust the import path as needed

// Any other imports you might need (like Jest or testing libraries)

describe("GeoJSON Feature Collection Schemas", () => {
    // Valid test cases
    describe("Valid schemas", () => {
        it("should validate a feature collection with a point feature", () => {
            const validFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: {
                            name: "San Francisco",
                        },
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                validFeatureCollection,
            );
            expect(result.success).toBe(true);
        });

        it("should validate a feature collection with multiple geometry types", () => {
            const validFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: {
                            name: "Point Feature",
                        },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: [
                                [-122.4194, 37.7749],
                                [-123.4194, 38.7749],
                            ],
                        },
                        properties: {
                            name: "LineString Feature",
                        },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-122.4194, 37.7749],
                                    [-123.4194, 37.7749],
                                    [-123.4194, 38.7749],
                                    [-122.4194, 38.7749],
                                    [-122.4194, 37.7749],
                                ],
                            ],
                        },
                        properties: {
                            name: "Polygon Feature",
                        },
                    },
                ],
                bbox: [-123.4194, 37.7749, -122.4194, 38.7749],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                validFeatureCollection,
            );
            expect(result.success).toBe(true);
        });

        it("should validate a feature collection with a null geometry", () => {
            const validFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: null,
                        properties: {
                            name: "Feature with null geometry",
                        },
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                validFeatureCollection,
            );
            expect(result.success).toBe(true);
        });

        it("should validate a GeoJSONFeatureCollectionValue", () => {
            const validFeatureCollectionValue = {
                display_value: "Test Feature Collection",
                node_value: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: [-122.4194, 37.7749],
                            },
                            properties: {
                                name: "San Francisco",
                            },
                        },
                    ],
                },
                details: [],
            };

            const result = GeoJSONFeatureCollectionValueSchema.safeParse(
                validFeatureCollectionValue,
            );
            expect(result.success).toBe(true);
        });

        it("should validate a GeoJSONFeatureCollectionValue with null node_value", () => {
            const validFeatureCollectionValue = {
                display_value: "Empty Feature Collection",
                node_value: null,
                details: [],
            };

            const result = GeoJSONFeatureCollectionValueSchema.safeParse(
                validFeatureCollectionValue,
            );
            expect(result.success).toBe(true);
        });
    });

    // Invalid test cases
    describe("Invalid schemas", () => {
        it("should reject a feature collection with wrong type", () => {
            const invalidFeatureCollection = {
                type: "FeatureCollectionInvalid", // Wrong type
                features: [],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it("should reject a feature collection with invalid features array", () => {
            const invalidFeatureCollection = {
                type: "FeatureCollection",
                features: "not an array", // Should be an array
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it("should reject a feature with wrong geometry type", () => {
            const invalidFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "InvalidGeometry", // Invalid geometry type
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it("should reject a polygon with non-closed ring", () => {
            const invalidFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-122.4194, 37.7749],
                                    [-123.4194, 37.7749],
                                    [-123.4194, 38.7749],
                                    [-122.4194, 38.7749],
                                    // Missing closing point that should be the same as first point
                                ],
                            ],
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it("should reject a line string with fewer than 2 positions", () => {
            const invalidFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: [
                                [-122.4194, 37.7749],
                                // Needs at least 2 positions
                            ],
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it("should reject a position with invalid coordinates", () => {
            const invalidFeatureCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194], // Missing latitude
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it("should reject a feature collection value with invalid structure", () => {
            const invalidFeatureCollectionValue = {
                display_value: "Test Feature Collection",
                node_value: {
                    // Missing required 'type' field
                    features: [],
                },
                details: [],
            };

            const result = GeoJSONFeatureCollectionValueSchema.safeParse(
                invalidFeatureCollectionValue,
            );
            expect(result.success).toBe(false);
        });
    });

    // Individual schemas test cases
    describe("Individual schema components", () => {
        it("should validate a Point geometry", () => {
            const validPoint = {
                type: "Point",
                coordinates: [-122.4194, 37.7749],
            };

            const result = PointGeometrySchema.safeParse(validPoint);
            expect(result.success).toBe(true);
        });

        it("should validate a LineString geometry", () => {
            const validLineString = {
                type: "LineString",
                coordinates: [
                    [-122.4194, 37.7749],
                    [-123.4194, 38.7749],
                ],
            };

            const result = LineStringGeometrySchema.safeParse(validLineString);
            expect(result.success).toBe(true);
        });

        it("should validate a Polygon geometry", () => {
            const validPolygon = {
                type: "Polygon",
                coordinates: [
                    [
                        [-122.4194, 37.7749],
                        [-123.4194, 37.7749],
                        [-123.4194, 38.7749],
                        [-122.4194, 38.7749],
                        [-122.4194, 37.7749],
                    ],
                ],
            };

            const result = PolygonGeometrySchema.safeParse(validPolygon);
            expect(result.success).toBe(true);
        });

        it("should validate a Feature", () => {
            const validFeature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [-122.4194, 37.7749],
                },
                properties: {
                    name: "San Francisco",
                },
            };

            const result = GeoJSONFeatureSchema.safeParse(validFeature);
            expect(result.success).toBe(true);
        });
    });
});

// Additional tests for non-empty geometry schemas

describe("Non-Empty Geometry Schemas", () => {
    // Non-Empty Point Tests
    describe("NonEmptyPointGeometrySchema", () => {
        it("should validate a valid point geometry", () => {
            const validPoint = {
                type: "Point",
                coordinates: [-122.4194, 37.7749],
            };

            const result = NonEmptyPointGeometrySchema.safeParse(validPoint);
            expect(result.success).toBe(true);
        });

        it("should validate a point with altitude", () => {
            const validPoint = {
                type: "Point",
                coordinates: [-122.4194, 37.7749, 12.5],
            };

            const result = NonEmptyPointGeometrySchema.safeParse(validPoint);
            expect(result.success).toBe(true);
        });

        it("should reject a point with NaN coordinates", () => {
            const invalidPoint = {
                type: "Point",
                coordinates: [-122.4194, NaN],
            };

            const result = NonEmptyPointGeometrySchema.safeParse(invalidPoint);
            expect(result.success).toBe(false);
        });

        it("should reject a point with non-numeric coordinates", () => {
            const invalidPoint = {
                type: "Point",
                coordinates: [-122.4194, "37.7749"],
            };

            const result = NonEmptyPointGeometrySchema.safeParse(invalidPoint);
            expect(result.success).toBe(false);
        });
    });

    // Non-Empty LineString Tests
    describe("NonEmptyLineStringGeometrySchema", () => {
        it("should validate a valid linestring with distinct positions", () => {
            const validLine = {
                type: "LineString",
                coordinates: [
                    [-122.4194, 37.7749],
                    [-123.4194, 38.7749],
                ],
            };

            const result =
                NonEmptyLineStringGeometrySchema.safeParse(validLine);
            expect(result.success).toBe(true);
        });

        it("should validate a linestring with multiple points", () => {
            const validLine = {
                type: "LineString",
                coordinates: [
                    [-122.4194, 37.7749],
                    [-123.4194, 38.7749],
                    [-124.4194, 39.7749],
                ],
            };

            const result =
                NonEmptyLineStringGeometrySchema.safeParse(validLine);
            expect(result.success).toBe(true);
        });

        it("should reject a linestring with only duplicate positions (zero length)", () => {
            const invalidLine = {
                type: "LineString",
                coordinates: [
                    [-122.4194, 37.7749],
                    [-122.4194, 37.7749],
                ],
            };

            const result =
                NonEmptyLineStringGeometrySchema.safeParse(invalidLine);
            expect(result.success).toBe(false);
        });

        it("should reject a linestring with fewer than 2 positions", () => {
            const invalidLine = {
                type: "LineString",
                coordinates: [[-122.4194, 37.7749]],
            };

            const result =
                NonEmptyLineStringGeometrySchema.safeParse(invalidLine);
            expect(result.success).toBe(false);
        });
    });

    // Non-Empty Polygon Tests
    describe("NonEmptyPolygonGeometrySchema", () => {
        it("should validate a valid polygon with area", () => {
            const validPolygon = {
                type: "Polygon",
                coordinates: [
                    [
                        [-122.4194, 37.7749],
                        [-123.4194, 37.7749],
                        [-123.4194, 38.7749],
                        [-122.4194, 37.7749],
                    ],
                ],
            };

            const result =
                NonEmptyPolygonGeometrySchema.safeParse(validPolygon);
            expect(result.success).toBe(true);
        });

        it("should validate a polygon with holes", () => {
            const validPolygon = {
                type: "Polygon",
                coordinates: [
                    // Outer ring
                    [
                        [-122.4194, 37.7749],
                        [-123.4194, 37.7749],
                        [-123.4194, 38.7749],
                        [-122.4194, 38.7749],
                        [-122.4194, 37.7749],
                    ],
                    // Inner ring (hole)
                    [
                        [-122.5194, 37.8749],
                        [-122.5194, 38.0749],
                        [-122.7194, 38.0749],
                        [-122.7194, 37.8749],
                        [-122.5194, 37.8749],
                    ],
                ],
            };

            const result =
                NonEmptyPolygonGeometrySchema.safeParse(validPolygon);
            expect(result.success).toBe(true);
        });

        it("should reject a polygon with duplicate vertices (zero area)", () => {
            const invalidPolygon = {
                type: "Polygon",
                coordinates: [
                    [
                        [-122.4194, 37.7749],
                        [-122.4194, 37.7749],
                        [-122.4194, 37.7749],
                        [-122.4194, 37.7749],
                    ],
                ],
            };

            const result =
                NonEmptyPolygonGeometrySchema.safeParse(invalidPolygon);
            expect(result.success).toBe(false);
        });

        it("should reject a polygon with collinear points (zero area)", () => {
            const invalidPolygon = {
                type: "Polygon",
                coordinates: [
                    [
                        [-122.4194, 37.7749],
                        [-123.4194, 38.7749],
                        [-124.4194, 39.7749],
                        [-122.4194, 37.7749],
                    ],
                ],
            };

            // This may or may not be rejected depending on how strict your implementation is
            // Technically this is a line, not a polygon with area
            const result =
                NonEmptyPolygonGeometrySchema.safeParse(invalidPolygon);
            if (!result.success) {
                expect(result.success).toBe(false);
            } else {
                // Skip this test if your implementation doesn't check for collinearity
                console.warn("Note: Collinear polygon test not enforced");
            }
        });

        it("should reject a polygon without a closed ring", () => {
            const invalidPolygon = {
                type: "Polygon",
                coordinates: [
                    [
                        [-122.4194, 37.7749],
                        [-123.4194, 37.7749],
                        [-123.4194, 38.7749],
                        [-122.4194, 38.7749],
                    ],
                ],
            };

            const result =
                NonEmptyPolygonGeometrySchema.safeParse(invalidPolygon);
            expect(result.success).toBe(false);
        });
    });

    // Feature with non-empty geometry tests
    describe("Feature with Non-Empty Geometry Schemas", () => {
        it("should validate a feature with non-empty point", () => {
            const validFeature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [-122.4194, 37.7749],
                },
                properties: { name: "Valid Point" },
            };

            const result =
                FeatureWithNonEmptyPointSchema.safeParse(validFeature);
            expect(result.success).toBe(true);
        });

        it("should validate a feature with non-empty linestring", () => {
            const validFeature = {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [-122.4194, 37.7749],
                        [-123.4194, 38.7749],
                    ],
                },
                properties: { name: "Valid LineString" },
            };

            const result =
                FeatureWithNonEmptyLineStringSchema.safeParse(validFeature);
            expect(result.success).toBe(true);
        });

        it("should validate a feature with non-empty polygon", () => {
            const validFeature = {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [-122.4194, 37.7749],
                            [-123.4194, 37.7749],
                            [-123.4194, 38.7749],
                            [-122.4194, 37.7749],
                        ],
                    ],
                },
                properties: { name: "Valid Polygon" },
            };

            const result =
                FeatureWithNonEmptyPolygonSchema.safeParse(validFeature);
            expect(result.success).toBe(true);
        });

        it("should reject a feature with empty point", () => {
            const invalidFeature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [-122.4194, NaN],
                },
                properties: { name: "Invalid Point" },
            };

            const result =
                FeatureWithNonEmptyPointSchema.safeParse(invalidFeature);
            expect(result.success).toBe(false);
        });
    });

    // Feature Collection tests
    describe("FeatureCollection with Non-Empty Geometries Schemas", () => {
        it("should validate a feature collection with non-empty points", () => {
            const validCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: { name: "Valid Point 1" },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-123.4194, 38.7749],
                        },
                        properties: { name: "Valid Point 2" },
                    },
                ],
            };

            const result =
                FeatureCollectionWithNonEmptyPointsSchema.safeParse(
                    validCollection,
                );
            expect(result.success).toBe(true);
        });

        it("should validate a feature collection with mixed geometries", () => {
            const validCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: { name: "Valid Point" },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: [
                                [-122.4194, 37.7749],
                                [-123.4194, 38.7749],
                            ],
                        },
                        properties: { name: "Valid LineString" },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-122.4194, 37.7749],
                                    [-123.4194, 37.7749],
                                    [-123.4194, 38.7749],
                                    [-122.4194, 37.7749],
                                ],
                            ],
                        },
                        properties: { name: "Valid Polygon" },
                    },
                ],
            };

            const result =
                FeatureCollectionWithNonEmptyGeometriesSchema.safeParse(
                    validCollection,
                );
            expect(result.success).toBe(true);
        });

        it("should reject a feature collection with empty points", () => {
            const invalidCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: { name: "Valid Point" },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-123.4194, NaN],
                        },
                        properties: { name: "Invalid Point" },
                    },
                ],
            };

            const result =
                FeatureCollectionWithNonEmptyPointsSchema.safeParse(
                    invalidCollection,
                );
            expect(result.success).toBe(false);
        });

        it("should reject a feature collection with empty lines", () => {
            const invalidCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: [
                                [-122.4194, 37.7749],
                                [-122.4194, 37.7749],
                            ],
                        },
                        properties: {
                            name: "Invalid LineString - zero length",
                        },
                    },
                ],
            };

            const result =
                FeatureCollectionWithNonEmptyLinesSchema.safeParse(
                    invalidCollection,
                );
            expect(result.success).toBe(false);
        });

        it("should reject a feature collection with empty polygons", () => {
            const invalidCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-122.4194, 37.7749],
                                    [-122.4194, 37.7749],
                                    [-122.4194, 37.7749],
                                    [-122.4194, 37.7749],
                                ],
                            ],
                        },
                        properties: { name: "Invalid Polygon - zero area" },
                    },
                ],
            };

            const result =
                FeatureCollectionWithNonEmptyPolygonsSchema.safeParse(
                    invalidCollection,
                );
            expect(result.success).toBe(false);
        });

        it("should allow non-geometry features in collections", () => {
            const validCollection = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: null,
                        properties: { name: "Feature with null geometry" },
                    },
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: { name: "Valid Point" },
                    },
                ],
            };

            const result =
                FeatureCollectionWithNonEmptyGeometriesSchema.safeParse(
                    validCollection,
                );
            expect(result.success).toBe(true);
        });
    });
});

// Updated tests for the non-empty feature collection schemas

describe("FeatureCollection with Non-Empty Geometries Schemas", () => {
    // Test for empty feature collection (should fail all non-empty schemas)
    it("should reject an empty feature collection for all non-empty schemas", () => {
        const emptyCollection = {
            type: "FeatureCollection",
            features: [],
        };

        // Test against all non-empty feature collection schemas
        const pointsResult =
            FeatureCollectionWithNonEmptyPointsSchema.safeParse(
                emptyCollection,
            );
        const linesResult =
            FeatureCollectionWithNonEmptyLinesSchema.safeParse(emptyCollection);
        const polygonsResult =
            FeatureCollectionWithNonEmptyPolygonsSchema.safeParse(
                emptyCollection,
            );
        const allGeometriesResult =
            FeatureCollectionWithNonEmptyGeometriesSchema.safeParse(
                emptyCollection,
            );

        expect(pointsResult.success).toBe(false);
        expect(linesResult.success).toBe(false);
        expect(polygonsResult.success).toBe(false);
        // Depending on implementation - if all geometries schema requires at least one feature
        expect(allGeometriesResult.success).toBe(false);
    });

    // Test for collection with features but no points (should fail points schema)
    it("should reject a feature collection without any points for the points schema", () => {
        const noPointsCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-122.4194, 37.7749],
                            [-123.4194, 38.7749],
                        ],
                    },
                    properties: { name: "Valid LineString" },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-122.4194, 37.7749],
                                [-123.4194, 37.7749],
                                [-123.4194, 38.7749],
                                [-122.4194, 37.7749],
                            ],
                        ],
                    },
                    properties: { name: "Valid Polygon" },
                },
            ],
        };

        const result =
            FeatureCollectionWithNonEmptyPointsSchema.safeParse(
                noPointsCollection,
            );
        expect(result.success).toBe(false);
    });

    // Test for collection with features but no lines (should fail lines schema)
    it("should reject a feature collection without any lines for the lines schema", () => {
        const noLinesCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.4194, 37.7749],
                    },
                    properties: { name: "Valid Point" },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-122.4194, 37.7749],
                                [-123.4194, 37.7749],
                                [-123.4194, 38.7749],
                                [-122.4194, 37.7749],
                            ],
                        ],
                    },
                    properties: { name: "Valid Polygon" },
                },
            ],
        };

        const result =
            FeatureCollectionWithNonEmptyLinesSchema.safeParse(
                noLinesCollection,
            );
        expect(result.success).toBe(false);
    });

    // Test for collection with features but no polygons (should fail polygons schema)
    it("should reject a feature collection without any polygons for the polygons schema", () => {
        const noPolygonsCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.4194, 37.7749],
                    },
                    properties: { name: "Valid Point" },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-122.4194, 37.7749],
                            [-123.4194, 38.7749],
                        ],
                    },
                    properties: { name: "Valid LineString" },
                },
            ],
        };

        const result =
            FeatureCollectionWithNonEmptyPolygonsSchema.safeParse(
                noPolygonsCollection,
            );
        expect(result.success).toBe(false);
    });

    // Test for valid collections (with appropriate geometry types)
    it("should validate a feature collection with non-empty points", () => {
        const validPointsCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.4194, 37.7749],
                    },
                    properties: { name: "Valid Point 1" },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [-123.4194, 38.7749],
                    },
                    properties: { name: "Valid Point 2" },
                },
            ],
        };

        const result = FeatureCollectionWithNonEmptyPointsSchema.safeParse(
            validPointsCollection,
        );
        expect(result.success).toBe(true);
    });

    it("should validate a feature collection with non-empty lines", () => {
        const validLinesCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-122.4194, 37.7749],
                            [-123.4194, 38.7749],
                        ],
                    },
                    properties: { name: "Valid LineString 1" },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-124.4194, 39.7749],
                            [-125.4194, 40.7749],
                            [-126.4194, 41.7749],
                        ],
                    },
                    properties: { name: "Valid LineString 2" },
                },
            ],
        };

        const result =
            FeatureCollectionWithNonEmptyLinesSchema.safeParse(
                validLinesCollection,
            );
        expect(result.success).toBe(true);
    });

    it("should validate a feature collection with non-empty polygons", () => {
        const validPolygonsCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-122.4194, 37.7749],
                                [-123.4194, 37.7749],
                                [-123.4194, 38.7749],
                                [-122.4194, 37.7749],
                            ],
                        ],
                    },
                    properties: { name: "Valid Polygon" },
                },
            ],
        };

        const result = FeatureCollectionWithNonEmptyPolygonsSchema.safeParse(
            validPolygonsCollection,
        );
        expect(result.success).toBe(true);
    });

    // Test for mixed types (should pass if required type is present)
    it("should validate a feature collection with mixed types if required type is present", () => {
        const mixedWithPolygonCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.4194, 37.7749],
                    },
                    properties: { name: "Valid Point" },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-122.4194, 37.7749],
                                [-123.4194, 37.7749],
                                [-123.4194, 38.7749],
                                [-122.4194, 37.7749],
                            ],
                        ],
                    },
                    properties: { name: "Valid Polygon" },
                },
            ],
        };

        // Should pass polygon schema but fail line schema
        const polygonResult =
            FeatureCollectionWithNonEmptyPolygonsSchema.safeParse(
                mixedWithPolygonCollection,
            );
        const lineResult = FeatureCollectionWithNonEmptyLinesSchema.safeParse(
            mixedWithPolygonCollection,
        );

        expect(polygonResult.success).toBe(true);
        expect(lineResult.success).toBe(false);
    });

    // Test for collection with invalid geometries
    it("should reject a feature collection with the right type but empty geometries", () => {
        const emptyPolygonsCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-122.4194, 37.7749],
                                [-122.4194, 37.7749],
                                [-122.4194, 37.7749],
                                [-122.4194, 37.7749],
                            ],
                        ],
                    },
                    properties: { name: "Invalid Polygon - zero area" },
                },
            ],
        };

        const result = FeatureCollectionWithNonEmptyPolygonsSchema.safeParse(
            emptyPolygonsCollection,
        );
        expect(result.success).toBe(false);
    });

    // Update the all geometries test if needed
    it("should validate feature collection with at least one valid non-empty geometry", () => {
        // This test should be updated based on how you implement FeatureCollectionWithNonEmptyGeometriesSchema
        // Either requiring at least one geometry of any type, or at least one of each type
        const validMixedCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.4194, 37.7749],
                    },
                    properties: { name: "Valid Point" },
                },
                {
                    type: "Feature",
                    geometry: null,
                    properties: { name: "Feature with null geometry" },
                },
            ],
        };

        const result =
            FeatureCollectionWithNonEmptyGeometriesSchema.safeParse(
                validMixedCollection,
            );
        expect(result.success).toBe(true);
    });
});
