"""Unit tests for arches_zod_validation.schema helpers.

These are pure logic tests that require no seeded database or bcap-specific
graphs. Integration tests that exercise the generated schema document against
real graph data live in nr-bcap/tests/views/test_schema.py."""

from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from drf_spectacular.openapi import AutoSchema
from drf_spectacular.plumbing import ComponentRegistry
from rest_framework import serializers

from arches_querysets.rest_framework.serializers import _wrap_serializer_field

from arches_zod_validation.schema import (
    AliasedNodeDataExtension,
    _extract_context_alias,
    _schema_graph_slug,
    _sort_properties_in_place,
    type_base_serializer_fields,
)


class NodeValueFieldExtensionTests(SimpleTestCase):
    """The extension types the {node_value, display_value, details} envelope per
    Arches datatype. Driven directly to stay off the full-document path, which
    needs a seeded graph and an authenticated user."""

    def map_field(self, field):
        auto = AutoSchema()
        auto.registry = ComponentRegistry()
        # resolve_serializer reads self.view.request; a request-less view suffices.
        with patch.object(AutoSchema, "view", MagicMock(request=None)):
            schema = AliasedNodeDataExtension(field).map_serializer_field(
                auto, "response"
            )
        return schema, auto.registry

    def wrapped(
        self,
        drf_field=serializers.CharField,
        datatype=None,
        max_length=None,
        config=None,
        required=False,
    ):
        # _wrap_serializer_field builds every node value field; style.datatype is
        # what arches_querysets stamps on, and what the extension reads.
        # widget_config carries editor-set limits (maxLength, min/max; '' when unset);
        # field.required mirrors Node.isrequired.
        field = _wrap_serializer_field(drf_field)()
        field.required = required
        if datatype is not None:
            field.style = {"datatype": datatype}
            widget_config = dict(config or {})
            if max_length is not None:
                widget_config["maxLength"] = max_length
            if widget_config:
                field.style["widget_config"] = widget_config
        return field

    def test_wrapped_node_value_fields_match_the_extension(self):
        self.assertIsInstance(self.wrapped(), AliasedNodeDataExtension.target_class)

    def test_envelope_exposes_node_value_display_value_and_details(self):
        schema, _ = self.map_field(self.wrapped(serializers.IntegerField))
        self.assertEqual(
            set(schema["properties"]), {"node_value", "display_value", "details"}
        )

    def test_display_value_and_details_are_read_only(self):
        schema, _ = self.map_field(self.wrapped())
        properties = schema["properties"]
        self.assertTrue(properties["display_value"]["readOnly"])
        self.assertTrue(properties["details"]["readOnly"])

    def test_node_value_typed_from_the_underlying_field(self):
        # An integer-backed node documents node_value as an integer, not opaque JSON.
        schema, _ = self.map_field(self.wrapped(serializers.IntegerField))
        self.assertEqual(schema["properties"]["node_value"]["type"], "integer")

    def test_component_names(self):
        # Distinct limits can't share a datatype's component; equal limits do.
        for expected, kwargs in (
            ("AliasedNodeData", {}),
            ("ConceptListAliasedNodeData", {"datatype": "concept-list"}),
            ("StringAliasedNodeData", {"datatype": "string"}),
            ("StringAliasedNodeDataMax125", {"datatype": "string", "max_length": 125}),
            (
                "NumberAliasedNodeDataMin0Max10",
                {
                    "drf_field": serializers.FloatField,
                    "datatype": "number",
                    "config": {"min": "0", "max": "10"},
                },
            ),
            (
                "ReferenceAliasedNodeDataRequired",
                {
                    "drf_field": serializers.JSONField,
                    "datatype": "reference",
                    "required": True,
                },
            ),
        ):
            with self.subTest(expected):
                extension = AliasedNodeDataExtension(self.wrapped(**kwargs))
                self.assertEqual(extension.get_name(), expected)

    def test_details_typed_per_datatype(self):
        generic = {"type": "object", "additionalProperties": {}}
        for datatype, drf_field, expected in (
            ("concept", serializers.UUIDField, "ConceptValueDetail"),
            ("resource-instance", serializers.JSONField, "ResourceInstanceDetail"),
            ("string", serializers.CharField, generic),
        ):
            with self.subTest(datatype):
                schema, _ = self.map_field(self.wrapped(drf_field, datatype=datatype))
                items = schema["properties"]["details"]["items"]
                if isinstance(expected, str):
                    self.assertTrue(items["$ref"].endswith(f"/{expected}"), items)
                else:
                    self.assertEqual(items, expected)

    def assert_node_value(self, path, expected, **kwargs):
        """Navigate node_value down path and pin the keys expected names; a None
        expects the key to be absent."""
        schema, _ = self.map_field(self.wrapped(**kwargs))
        leaf = schema["properties"]["node_value"]
        for key in filter(None, path.split(".")):
            leaf = leaf[key]
        for key, value in expected.items():
            self.assertEqual(leaf.get(key), value, leaf)

    def test_node_value_constraints(self):
        # A localized node_value is the {lang: {value, direction}} object the API
        # emits, so a value-length limit has a real string to bind to.
        inner = "properties.en.properties.value"
        json_list = {"drf_field": serializers.JSONField, "datatype": "reference"}
        for name, path, expected, kwargs in (
            (
                "localized string is an i18n object",
                inner,
                {"type": "string", "maxLength": None},
                {"datatype": "string"},
            ),
            (
                "localized max binds to the inner value",
                inner,
                {"maxLength": 125},
                {"datatype": "string", "max_length": 125},
            ),
            (
                "non-localized max binds to the scalar",
                "",
                {"type": "string", "maxLength": 50},
                {"datatype": "non-localized-string", "max_length": 50},
            ),
            (
                "a list max becomes maxItems",
                "",
                {"type": "array", "maxItems": 3},
                {
                    "drf_field": serializers.JSONField,
                    "datatype": "concept-list",
                    "max_length": 3,
                },
            ),
            (
                "number bounds bind to the value",
                "",
                {"minimum": 0, "maximum": 10},
                {
                    "drf_field": serializers.FloatField,
                    "datatype": "number",
                    "config": {"min": "0", "max": "10"},
                },
            ),
            (
                "a required list wants at least one item",
                "",
                {"minItems": 1},
                {**json_list, "required": True},
            ),
            ("an optional list does not", "", {"minItems": None}, json_list),
        ):
            with self.subTest(name):
                self.assert_node_value(path, expected, **kwargs)

    def test_node_value_shaped_for_every_resource_model_datatype(self):
        # One row per datatype used across the resource models: navigate from
        # node_value to a representative leaf and pin the schema the API emits.
        # Scalars (boolean/number) derive from the field's base type and are
        # covered above; date is a pattern accepting a bare date or a space/T
        # datetime, so the generated Zod is a regex, not strict z.iso.datetime.
        uuid = {"type": "string", "format": "uuid"}
        cases = {
            "string": ("properties.en.properties.value", {"type": "string"}),
            "date": (
                "",
                {
                    "type": "string",
                    "pattern": (
                        r"^\d{4}-\d{2}-\d{2}"
                        r"([ T]\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?)?$"
                    ),
                },
            ),
            "non-localized-string": ("", {"type": "string"}),
            "borden-number-datatype": ("", {"type": "string"}),
            "concept": ("", uuid),
            "concept-list": ("items", uuid),
            "reference": ("items.properties.labels", {"type": "array"}),
            "resource-instance": ("items.properties.resourceId", uuid),
            "resource-instance-list": ("items.properties.resourceId", uuid),
            "file-list": ("items.properties.node_id", uuid),
            "url": ("properties.url_label", {"type": "string"}),
            "geojson-feature-collection": ("properties.features", {"type": "array"}),
        }
        for datatype, (path, expected) in cases.items():
            with self.subTest(datatype=datatype):
                self.assert_node_value(path, expected, datatype=datatype)


class SchemaPropertySortingTests(SimpleTestCase):
    """Properties whose keys are all node aliases are sorted by (sortorder, alias);
    sortorder values come from CardModel/CardXNodeXWidget, not Node.sortorder.
    Maps containing any non-alias key keep their declared order."""

    ORDER = {"a_node": 1, "b_node": 0, "c_node": 0}  # b, c tie at 0

    def test_node_derived_map_sorted_by_sortorder_then_alias(self):
        schema = {"properties": {"a_node": {}, "c_node": {}, "b_node": {}}}
        _sort_properties_in_place(schema, self.ORDER)
        self.assertEqual(list(schema["properties"]), ["b_node", "c_node", "a_node"])

    def test_map_with_a_non_alias_key_keeps_declared_order(self):
        schema = {"properties": {"id": {}, "c_node": {}, "b_node": {}}}
        _sort_properties_in_place(schema, self.ORDER)
        self.assertEqual(list(schema["properties"]), ["id", "c_node", "b_node"])


class SchemaGraphSlugTests(SimpleTestCase):
    """_schema_graph_slug matches schema component names back to their graph slug,
    preferring longer slugs to avoid false prefix matches."""

    SLUGS_DESC = sorted(
        ["site_visit", "site", "archaeological_site"], key=len, reverse=True
    )

    def test_matches_exact_prefix(self):
        self.assertEqual(
            _schema_graph_slug("Archaeological_Site_Foo_Bar", self.SLUGS_DESC),
            "archaeological_site",
        )

    def test_longer_slug_wins_over_shorter_prefix(self):
        # 'site_visit' must win over 'site' for Site_Visit_* names.
        self.assertEqual(
            _schema_graph_slug("Site_Visit_Aliased_Data", self.SLUGS_DESC),
            "site_visit",
        )

    def test_no_match_returns_none(self):
        self.assertIsNone(
            _schema_graph_slug("AliasedNodeData", self.SLUGS_DESC),
        )

    def test_exact_slug_match(self):
        self.assertEqual(
            _schema_graph_slug("Site", self.SLUGS_DESC),
            "site",
        )


class ExtractContextAliasTests(SimpleTestCase):
    """_extract_context_alias maps tile schema names to their nodegroup alias
    and resource-level schemas to None."""

    SLUG = "archaeological_site"
    KNOWN = {"related_documents", "site_images", "assessment"}

    def test_tile_schema_returns_nodegroup_alias(self):
        self.assertEqual(
            _extract_context_alias(
                "Archaeological_Site_Related_Documents_Aliased_Data",
                self.SLUG,
                self.KNOWN,
            ),
            "related_documents",
        )

    def test_resource_level_schema_returns_none(self):
        # _Resource_Aliased_Data suffix doesn't match any known nodegroup alias.
        self.assertIsNone(
            _extract_context_alias(
                "Archaeological_Site_Resource_Aliased_Data",
                self.SLUG,
                self.KNOWN,
            )
        )

    def test_unknown_middle_returns_none(self):
        self.assertIsNone(
            _extract_context_alias(
                "Archaeological_Site_Nonexistent_Aliased_Data",
                self.SLUG,
                self.KNOWN,
            )
        )

    def test_wrong_slug_prefix_returns_none(self):
        self.assertIsNone(
            _extract_context_alias(
                "Site_Visit_Related_Documents_Aliased_Data",
                self.SLUG,
                self.KNOWN,
            )
        )


class BaseSerializerFieldTypingTests(SimpleTestCase):
    """The hook types the arches base-serializer fields the node-value extension
    can't reach (resource name/descriptors, tile provisionaledits), and only when
    they're untyped, so a node aliased "name" is left alone."""

    def run_hook(self, schemas):
        result = {"components": {"schemas": schemas}}
        return type_base_serializer_fields(result, None, None, None)["components"][
            "schemas"
        ]

    def test_provisionaledits_typed_as_a_per_user_edit_map(self):
        out = self.run_hook(
            {"X_Tile": {"properties": {"provisionaledits": {"nullable": True}}}}
        )
        edit = out["X_Tile"]["properties"]["provisionaledits"]
        self.assertEqual(edit["type"], "object")
        self.assertEqual(
            set(edit["additionalProperties"]["properties"]),
            {"value", "status", "action", "reviewer", "timestamp", "reviewtimestamp"},
        )

    def test_resource_name_and_descriptors_typed(self):
        out = self.run_hook(
            {
                "Resource": {
                    "properties": {
                        "name": {"readOnly": True, "nullable": True},
                        "descriptors": {"readOnly": True, "nullable": True},
                    }
                }
            }
        )
        properties = out["Resource"]["properties"]
        self.assertEqual(properties["name"]["type"], "string")
        descriptor = properties["descriptors"]["properties"]["en"]["properties"]
        self.assertEqual(set(descriptor), {"name", "description", "map_popup"})

    def test_typed_node_field_named_name_is_left_untouched(self):
        # A node aliased "name" is an allOf/$ref, not the untyped base field.
        node_name = {"allOf": [{"$ref": "#/components/schemas/StringAliasedNodeData"}]}
        out = self.run_hook({"Tile": {"properties": {"name": node_name}}})
        self.assertEqual(out["Tile"]["properties"]["name"], node_name)
