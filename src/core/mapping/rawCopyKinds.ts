/**
 * Which rendered elements the raw copy treats specially: generated content copied whole (atomic
 * blocks and inline constructs) and the title of a container, whose text is not in the source.
 * Shared by the page's copy handler (live DOM) and the unit tests (parsed HTML) through a probe.
 */

import type { ChromeProbe } from "../export/chromeMarks";

/**
 * One character standing in a rendered text for an inline construct copied whole (an image, an
 * inline formula, a footnote reference, a role, a citation): the alignment matches it with the
 * construct in the source.
 */
export const RAW_COPY_PLACEHOLDER = "";

const ATOMIC_BLOCK_CLASSES = [
  "myst-mermaid-figure", "myst-mermaid-diagram", "myst-plantuml-diagram", "myst-vega-diagram", "okf-toc", "math-display",
];

const ATOMIC_INLINE_CLASSES = ["math-inline", "myst-cite-group", "role"];

const hasAttribute = (probe: ChromeProbe, name: string): boolean => probe.attributeNames().includes(name);

/**
 * True for a block rendered from a construct that is copied whole: a diagram, a generated table of
 * contents, display math, a figure, the properties table, a block of an included file.
 */
export function isAtomicBlock(probe: ChromeProbe): boolean {
  return probe.tagName === "figure"
    || ATOMIC_BLOCK_CLASSES.some((name) => probe.hasClass(name))
    || hasAttribute(probe, "data-okf-properties")
    || hasAttribute(probe, "data-sphinx-preview-included");
}

/**
 * True for an inline element whose rendered text is not (only) the source's text: an image, an
 * inline formula, a footnote reference, a role, a citation.
 */
export function isAtomicInline(probe: ChromeProbe): boolean {
  return probe.tagName === "img"
    || (probe.tagName === "a" && hasAttribute(probe, "data-footnote-ref"))
    || ATOMIC_INLINE_CLASSES.some((name) => probe.hasClass(name));
}

/** True for the title of a container (an admonition, a dropdown): written or default, never aligned. */
export function isContainerTitle(probe: ChromeProbe): boolean {
  return probe.hasClass("admonition-title") || probe.tagName === "summary";
}
