import type { StringAliasedNodeData } from "@/arches_vue_components/datatypes/string/types.ts";

export function convertNbspToSpaces(stringValue: StringAliasedNodeData) {
    if (!stringValue) return stringValue;
    const val = stringValue;
    Object.keys(val.node_value as object).forEach((lang) => {
        if (val?.node_value?.[lang]?.value) {
            val.node_value[lang].value = convertNbspStringToSpaces(
                val.node_value[lang].value,
            );
        }
    });
    val.display_value = convertNbspStringToSpaces(val.display_value);
    return val;
}

export function convertNbspStringToSpaces(value: string) {
    return !value
        ? value
        : value.replace(/&nbsp;/g, " ").replace(/\u00A0/g, " ");
}

export function htmlToPlainText(html: string): string {
    if (!html) return "";

    // If for some reason this runs in a non-DOM context, fall back to a dumb stripper
    if (typeof document === "undefined") {
        return stripTagsFallback(html);
    }

    const container = document.createElement("div");
    container.innerHTML = html;

    // 1) Turn <br> into explicit newline characters
    container.querySelectorAll("br").forEach((br) => {
        br.replaceWith("\n");
    });
    // 2b) Clean up whitespace-only text nodes inside lists so we don't get
    // extra blank lines or indentation between list items from pretty-printed HTML
    container.querySelectorAll("ul, ol").forEach((list) => {
        Array.from(list.childNodes).forEach((node) => {
            if (
                node.nodeType === Node.TEXT_NODE &&
                !(node.textContent || "").trim()
            ) {
                list.removeChild(node);
            }
        });
    });
    // 2) Handle list items (<ul>/<ol>/<li>) → bullets / numbers
    container.querySelectorAll("li").forEach((li) => {
        const parent = li.parentElement;
        let prefix = "• ";

        if (parent && parent.tagName.toLowerCase() === "ol") {
            // Compute 1-based index among sibling <li> elements
            const lis = Array.from(parent.children).filter(
                (el) => el.tagName && el.tagName.toLowerCase() === "li",
            );
            const index = lis.indexOf(li);
            prefix = `${index + 1}. `;
        }

        // Insert the prefix at the start of the <li>
        li.insertBefore(document.createTextNode(prefix), li.firstChild);
        // Add a newline after each list item
        li.appendChild(document.createTextNode("\n"));
    });

    // 3) Paragraphs: ensure a blank line after each <p>
    container.querySelectorAll("p").forEach((p) => {
        p.appendChild(document.createTextNode("\n"));
    });

    // 4) Let the browser do the hard part: strip all remaining tags
    let text = container.textContent || "";

    // 5) Normalize whitespace a bit
    text = text
        .replace(/\u00a0/g, " ") // non-breaking spaces → regular spaces
        .replace(/[ \t]+\n/g, "\n") // trim spaces before newlines
        // .replace(/\n{3,}/g, '\n\n') // collapse >2 consecutive newlines to 2
        // .replace(/[ \t]{2,}/g, ' ') // collapse multiple spaces to one
        .replace(/[ \t]+•/g, "•") // collapse multiple spaces to one
        .trim();

    return text;
}

// Very simple fallback if document is not available (e.g., SSR or tests)
function stripTagsFallback(html: string): string {
    let out = html;
    let prev;
    do {
        prev = out;
        out = out
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<[^>]+>/g, "");
    } while (out !== prev);
    return out.replace(/\s+/g, " ").trim();
}
