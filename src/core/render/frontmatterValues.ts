/**
 * Front matter values in the body: inline code that is exactly `= this.<field>` (or
 * `=this.<field>`, a dotted path follows nested objects) shows the value of that field of the
 * document's own front matter, as text. A field without a value keeps the inline code as written,
 * with a warning style and a warning diagnostic. A tree pass of the MyST renderer. Pure: no host
 * API, no DOM.
 */

import { stringify } from "yaml";

import { extractFrontmatterShared } from "../frontmatter/frontmatterParse";
import { mergeProperties, type MystNode, setHast } from "./mystNode";
import type { RenderDiagnostic } from "./mystTypes";

/** The whole text of the inline code: `=`, at most one space, `this.`, then a dotted path. */
const THIS_FIELD = /^=[ ]?this\.([\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)*)$/u;

/** Warnings reported for one render: a page full of missing keys does not flood the diagnostics. */
const MAX_MISSING_VALUE_WARNINGS = 20;

/** The class of the span that shows a value. */
const VALUE_CLASS = "okf-frontmatter-value";
/** The class of the inline code whose field has no value. */
const MISSING_CLASS = "okf-frontmatter-missing";

/** The value at `path` (own properties of plain objects only), or undefined. */
function valueAt(data: Record<string, unknown>, path: string): unknown {
  // A key that holds a dot itself wins over the path through nested objects.
  if (Object.hasOwn(data, path)) return data[path];
  let current: unknown = data;
  for (const segment of path.split(".")) {
    if (typeof current !== "object" || current === null || Array.isArray(current)
      || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** One YAML value on one line: scalars as text, collections in flow style. */
function oneLine(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return String(value);
  return stringify(value, { collectionStyle: "flow", lineWidth: 0 }).trim().replace(/\s*\n\s*/gu, " ");
}

/**
 * The text a value shows as: a string or a number as it is, a boolean as `true` or `false`, a list
 * as its items joined with `, `, an object as its YAML on one line. Undefined when the field has no
 * value to show (absent, empty or `null`): the page never shows an empty string for it.
 */
function frontmatterValueText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return undefined;
  const text = Array.isArray(value) ? value.map(oneLine).join(", ") : oneLine(value);
  return text === "" ? undefined : text;
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-079
/**
 * Shows the front matter value of each inline code `= this.<field>` of the tree. Only the document's
 * own front matter (`source`) is read; the value is set as a text child of a span, never as Markdown
 * or HTML. A missing field leaves the inline code as written, marked with a warning class and a
 * title, and adds a warning to `diagnostics` (at most 20).
 */
export function showFrontmatterValues(root: MystNode, source: string, diagnostics: RenderDiagnostic[]): void {
  // The front matter is read on the first use of the form: most documents never write it. The tree
  // is walked, not the source, so a form that comes from an included file is found too.
  let extraction: ReturnType<typeof extractFrontmatterShared> | undefined;
  let warnings = 0;
  const visit = (node: MystNode): void => {
    if (node.type === "inlineCode" && typeof node.value === "string") {
      const path = THIS_FIELD.exec(node.value)?.[1];
      if (path === undefined) return;
      extraction ??= extractFrontmatterShared(source);
      const text = frontmatterValueText(valueAt(extraction.frontmatter ?? {}, path));
      if (text !== undefined) {
        const holder = node;
        holder.type = "okfFrontmatterValue";
        // The text stays on the node (the table of contents builds its entry text from it); the empty
        // children keep the HTML conversion from walking a node that has none.
        holder.value = text;
        holder.children = [];
        setHast(holder, "span", { class: VALUE_CLASS, "data-okf-this-field": path }, [{ type: "text", value: text }]);
        return;
      }
      const reason = !extraction.present
        ? "the document has no front matter"
        : extraction.error ? "the front matter is not valid YAML" : "the front matter has no value for it";
      mergeProperties(node, { class: MISSING_CLASS, title: `No value for "${path}": ${reason}` });
      if (warnings < MAX_MISSING_VALUE_WARNINGS) {
        warnings += 1;
        diagnostics.push({
          severity: "warning",
          message: `\`${node.value}\` shows as written: ${reason} (field "${path}").`,
          ...(node.position?.start?.line === undefined ? {} : { line: node.position.start.line }),
        });
      }
      return;
    }
    node.children?.forEach(visit);
  };
  visit(root);
}
