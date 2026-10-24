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

const BY_NAME = new Map<string, MystDirectiveDescriptor>();
const ATTRIBUTE_RULES = new Map<string, DirectiveAttributeRule>();
for (const directive of MYST_DIRECTIVES) {
  for (const name of directive.names) {
    if (BY_NAME.has(name)) throw new Error(`Directive {${name}} is registered twice.`);
    BY_NAME.set(name, directive);
  }
  for (const [attribute, rule] of Object.entries(directive.attributes ?? {})) {
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
