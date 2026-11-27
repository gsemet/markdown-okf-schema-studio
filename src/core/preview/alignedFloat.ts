/**
 * Whether the content holds an image, figure or table floated left or right (MyST `:align:` or the
 * HTML `align` attribute). The content root says it in one attribute, so the style rules test the
 * root alone: a `:has()` on the root made every change of the document restyle all of it. The host
 * writes the attribute in the page it renders and in the exported file; the page script keeps it up
 * to date while the content changes. Pure module: no host API, no DOM, no Node built-ins.
 */

/** An aligned float, as a selector of the page. */
export const ALIGNED_FLOAT_SELECTOR =
  ':is(img, figure, table):is(.align-left, .align-right, [align="left" i], [align="right" i])';

/** On the content root exactly while a descendant matches {@link ALIGNED_FLOAT_SELECTOR}. */
export const ALIGNED_FLOAT_ATTRIBUTE = "data-okf-aligned-float";

/** The elements that can be an aligned float. */
const FLOAT_TAGS = new Set(["img", "figure", "table"]);

/** What the test reads of a parsed (parse5) element. */
export interface ParsedElement {
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: readonly object[];
}

/** {@link ALIGNED_FLOAT_SELECTOR} for a parsed element: the host has no selector engine. */
function isAlignedFloat(element: ParsedElement): boolean {
  if (!FLOAT_TAGS.has(element.tagName ?? "")) return false;
  return (element.attrs ?? []).some(({ name, value }) => {
    if (name === "align") return /^(?:left|right)$/iu.test(value);
    return name === "class" && value.split(/[\t\n\f\r ]+/u).some((item) => item === "align-left" || item === "align-right");
  });
}

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-043
/** Sets {@link ALIGNED_FLOAT_ATTRIBUTE} on a parsed content root when a descendant is an aligned float, else removes it. */
export function markAlignedFloat(root: ParsedElement): void {
  const pending: ParsedElement[] = [...(root.childNodes ?? [])] as ParsedElement[];
  let found = false;
  // A stack, not recursion: a deeply nested document stays within the call stack.
  while (!found && pending.length > 0) {
    const element = pending.pop()!;
    found = isAlignedFloat(element);
    for (const child of element.childNodes ?? []) pending.push(child as ParsedElement);
  }
  const attributes = (root.attrs ?? []).filter(({ name }) => name !== ALIGNED_FLOAT_ATTRIBUTE);
  if (found) attributes.push({ name: ALIGNED_FLOAT_ATTRIBUTE, value: "" });
  root.attrs = attributes;
}
