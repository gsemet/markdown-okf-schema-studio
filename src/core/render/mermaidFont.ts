// @implements_req SwRS-MDOKFSTUDIO-DIAG-001
/**
 * The one font Mermaid diagrams measure and draw their labels with.
 *
 * The page shows a diagram as an SVG image, and Mermaid measures each HTML label in the page
 * before it draws it. The page's Content Security Policy blocks the style sheet Mermaid puts in
 * its SVG while it measures, so the label would be measured with the page font and size, then
 * drawn in the image with the font and size of that style sheet: wider, so the end of the label
 * is cut ("Yes|", "Nc", "Hold and inspe"). Both sides use these values instead: Mermaid's
 * configuration and theme for the image, and the page style sheet for the element Mermaid
 * measures in (`MERMAID_MEASURE_CLASS`).
 *
 * A system font stack only, no web font: an SVG image cannot load the page's fonts.
 */
export const MERMAID_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Ubuntu, "Helvetica Neue", Arial, sans-serif';

/** Mermaid's own default label size, written out so both sides use it. */
export const MERMAID_FONT_SIZE = "16px";

/** The class of the element the page gives Mermaid to measure and draw a diagram in. */
export const MERMAID_MEASURE_CLASS = "myst-mermaid-measure";
