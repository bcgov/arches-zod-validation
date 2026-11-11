import type { Ref } from "vue";
import type { LanguageValue } from "@/arches_vue_components/datatypes/string/types.ts";
import type { GeoJSONFeatureCollectionAliasedNodeData } from "@/arches_vue_components/datatypes/geojson-feature-collection/types.ts";
import type { AliasedNodeData } from "@/arches_vue_components/types.ts";
import type { FormInstance } from "@primevue/forms";
import type { GenericZodObjectType } from "@/arches_zod_validation/validation-utils.ts";

export const blankStringValue = function () {
    return {
        display_value: "",
        node_value: { en: { value: "", direction: "ltr" } } as Record<
            string,
            LanguageValue
        >,
        details: [] as never[],
    };
};

export const blankResourceInstanceValue = function () {
    return {
        display_value: "",
        node_value: null,
        details: [],
    };
};

export const blankResourceInstanceListValue = function () {
    return {
        display_value: "",
        node_value: [],
        details: [],
    };
};

export const blankDateValue = function () {
    return {
        display_value: "",
        node_value: null,
        details: [] as never[],
    };
};

export const blankBooleanValue = function () {
    return {
        display_value: "",
        node_value: null,
        details: [] as never[],
    };
};

export const blankFileListValue = function () {
    return {
        display_value: "",
        node_value: [],
        details: [] as never[],
    };
};

export const blankURLValue = function () {
    return {
        display_value: "",
        node_value: {
            url: "",
            url_label: "",
        },
        details: [],
    };
};

export const blankNumberValue = function () {
    return {
        display_value: "",
        node_value: null,
        details: [],
    };
};

export const trueBooleanValue = function () {
    return {
        display_value: "true",
        node_value: true,
        details: [],
    };
};

export const falseBooleanValue = function () {
    return {
        display_value: "false",
        node_value: false,
        details: [],
    };
};

export const blankGeoJSONValue =
    function (): GeoJSONFeatureCollectionAliasedNodeData {
        return {
            display_value: "",
            node_value: null,
            details: [] as never[],
        } satisfies GeoJSONFeatureCollectionAliasedNodeData;
    };

export const currentDateValue = function () {
    return {
        display_value: "",
        node_value: new Date().toISOString().split("T")[0],
        details: [] as never[],
    };
};

export const isValid = (
    form: Ref<FormInstance>,
    schema: GenericZodObjectType,
) => {
    if (!form.value) return false;

    const formStates = form?.value?.states;
    if (!formStates) return false;
    const fields = Object.keys(formStates);

    const allValid = fields.every((field) =>
        schema.shape?.[field]
            ? schema.shape[field]?.safeParse(formStates?.[field]?.value).success
            : true,
    );
    return allValid;
};

export const updateModelValue = async function (
    newValue: AliasedNodeData,
    attribute_name: string,
    dataObject: Record<string, unknown>,
    form: Ref<FormInstance>,
) {
    console.log("updateModelValue", attribute_name, newValue);
    if (dataObject[attribute_name] === newValue) return;
    const result = await form.value.validate(attribute_name);
    if (result?.errors?.[attribute_name]?.length ?? 0 > 0) {
        console.log(result.errors[attribute_name]);
    } else {
        dataObject[attribute_name] = newValue;
    }
};
