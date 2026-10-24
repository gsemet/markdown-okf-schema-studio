/**
 * The shape of a MyST directive plug-in: everything the preview does for one directive (or a family
 * of directives with the same handling), registered together in `registry.ts`. Pure module: no
 * host API, no DOM, no Node built-ins.
 */

import type { PaletteActionId } from "../palette/paletteActions";
import type { MystNode } from "../render/mystNode";

/**
 * A sanitizer rule for one HTML attribute the directive's render pass writes: the sanitizer keeps
 * the attribute when `valid` accepts its value, and otherwise removes it and reports `diagnostic`.
 */
export interface DirectiveAttributeRule {
  /** True when the sanitizer may keep the value (`tagName` is the element's lower-case name). */
  valid(value: string, tagName: string): boolean;
  /** What the sanitizer reports when it removes the attribute. */
  diagnostic: { code: string; message: string };
}

/** One MyST directive plug-in (see the module comment). */
export interface MystDirectiveDescriptor {
  /** Stable id of the plug-in (`admonition`, `figure`, `tables`). */
  readonly id: string;
  /** The directive names it handles, exactly as written after `{` (`list-table`). */
  readonly names: readonly string[];
  /**
   * The render pass on the parsed `mystDirective` node (`line`: its first source line), run once
   * per node before the rest of the node normalization. It rewrites the node in place (positions,
   * titles, data the writer or a later pass reads).
   */
  readonly render?: (node: MystNode, line: number | undefined) => void;
  /**
   * Sanitizer rules of the attributes the render pass writes, by attribute name: `data-*`
   * attributes only (see `directiveAttributeAllowed`), the registry refuses any other.
   */
  readonly attributes?: Readonly<Record<string, DirectiveAttributeRule>>;
  /**
   * The preview stylesheet rules of the directive's output, placed in the theme sheet
   * (`preview/styles/contentBlockStyles.ts`).
   */
  readonly style?: string;
  /** The palette actions that insert or convert the directive (`PALETTE_ACTIONS` ids). */
  readonly paletteActions?: readonly PaletteActionId[];
}
