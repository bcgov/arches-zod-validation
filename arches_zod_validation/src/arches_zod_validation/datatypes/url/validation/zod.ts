import { z } from "zod";

export const UrlValueSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.object({
        url: z
            .url({ message: "Please enter a valid URL." })
            .min(1, { message: "URL is required." }),
        url_label: z.string().nullish(),
    }),
    details: z.array(z.never()),
});

export const UrlValueLabelRequiredSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.object({
        url: z
            .url({ message: "Please enter a valid URL." })
            .min(1, { message: "URL is required." }),
        url_label: z.string().min(1, { message: "URL label is required." }),
    }),
    details: z.array(z.never()),
});

export const HttpUrlValueSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.object({
        url: z
            .httpUrl({
                message:
                    "Please enter a valid URL starting with http:// or https://.",
            })
            .min(1, { message: "URL is required." }),
        url_label: z.string().nullish(),
    }),
    details: z.array(z.never()),
});

export const HttpUrlValueLabelRequiredSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.object({
        url: z
            .httpUrl({
                message:
                    "Please enter a valid URL starting with http:// or https://.",
            })
            .min(1, { message: "URL is required." }),
        url_label: z.string().min(1, { message: "URL label is required." }),
    }),
    details: z.array(z.never()),
});
