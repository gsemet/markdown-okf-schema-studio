/**
 * The MyST directive registry: every directive plug-in (`directive.ts`) the preview knows, and the
 * lookups the renderer (render passes), the sanitizer (attribute rules) and the stylesheet (styles)
 * use. A directive without a plug-in still renders through the MyST writer, or as a placeholder.
 * Pure module: no host API, no DOM, no Node built-ins.
 */

import { ADMONITION_DIRECTIVE } from "./admonition";
import type { DirectiveAttributeRule, MystDirectiveDescriptor } from "./directive";
import { FIGURE_DIRECTIVE } from "./figure";
import { TABLES_DIRECTIVE } from "./tables";

/** Every directive plug-in. Add a new one here. */
export const MYST_DIRECTIVES: readonly MystDirectiveDescriptor[] = [
  ADMONITION_DIRECTIVE,
  FIGURE_DIRECTIVE,
  TABLES_DIRECTIVE,
];

/** The `data-*` attributes the sanitizer handles itself: no plug-in rule may replace its handling. */
const SANITIZER_DATA_ATTRIBUTES = new Set(["data-myst-table-style", "data-okf-color", "data-okf-background"]);

/**
 * True when a plug-in may declare a sanitizer rule for `attribute`: a `data-*` attribute the
 * sanitizer does not already handle. The rules run before the sanitizer's generic checks (event
 * handlers, `style`, URL attributes), so a rule for any other attribute would bypass them.
 */
export function directiveAttributeAllowed(attribute: string): boolean {
  return attribute.startsWith("data-") && !SANITIZER_DATA_ATTRIBUTES.has(attribute);
}

const BY_NAME = new Map<string, MystDirectiveDescriptor>();
const ATTRIBUTE_RULES = new Map<string, DirectiveAttributeRule>();
for (const directive of MYST_DIRECTIVES) {
  for (const name of directive.names) {
    if (BY_NAME.has(name)) throw new Error(`Directive {${name}} is registered twice.`);
    BY_NAME.set(name, directive);
  }
  for (const [attribute, rule] of Object.entries(directive.attributes ?? {})) {
    if (!directiveAttributeAllowed(attribute)) {
      throw new Error(`Directive rule for ${attribute}: plug-in attribute rules are for data-* attributes only.`);
    }
    if (ATTRIBUTE_RULES.has(attribute)) throw new Error(`Attribute ${attribute} has two directive rules.`);
    ATTRIBUTE_RULES.set(attribute, rule);
  }
}

/** The plug-in of a directive name (exact, as written after `{`), or `undefined`. */
export function directiveNamed(name: string | undefined): MystDirectiveDescriptor | undefined {
  return name === undefined ? undefined : BY_NAME.get(name);
}

/** The sanitizer rule of an attribute (lower-case name) a directive writes, or `undefined`. */
export function directiveAttributeRule(attribute: string): DirectiveAttributeRule | undefined {
  return ATTRIBUTE_RULES.get(attribute);
}

/** The stylesheet rules of a plug-in, by id ("" when it has none or is unknown). */
export function directiveStyle(id: string): string {
  return MYST_DIRECTIVES.find((directive) => directive.id === id)?.style ?? "";
}
