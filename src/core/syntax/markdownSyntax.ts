/**
 * Markdown syntax primitives shared by the preview, the comment anchoring and the navigation, so
 * that they all agree on where a code fence or the front matter starts and ends.
 */

// @implements_req SwRS-MDOKFSTUDIO-MYST-097
/** An opening (or closing) code fence: up to three spaces of indent, then three or more of one mark. */
export const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/u;

/** {@link FENCE_OPEN} that also takes the `:::` fences of MyST directives. */
const FENCE_OPEN_OR_COLONS = /^ {0,3}(`{3,}|~{3,}|:{3,})/u;

// @implements_req SwRS-MDOKFSTUDIO-MYST-097
/**
 * The fence state after `line`: `fence` is the opening marker while inside a fence, `undefined`
 * outside. A closing fence repeats the mark of the opening one, at least as long, with nothing but
 * white space after it. With `colons`, `:::` fences count too. A line is part of a fence (opening, content or closing) when either the
 * state before or the state after is defined.
 */
export function advanceFence(
  line: string,
  fence: string | undefined,
  colons = false,
): string | undefined {
  const marker = (colons ? FENCE_OPEN_OR_COLONS : FENCE_OPEN).exec(line)?.[1];
  if (!marker) return fence;
  if (fence === undefined) return marker;
  const closes = marker[0] === fence[0] && marker.length >= fence.length
    && line.slice(line.indexOf(marker) + marker.length).trim() === "";
  return closes ? undefined : fence;
}

const FRONTMATTER_OPEN = /^---[ \t]*$/u;
const FRONTMATTER_CLOSE = /^(?:---|\.\.\.)[ \t]*$/u;

// @implements_req SwRS-MDOKFSTUDIO-MYST-097
/**
 * The number of leading lines the front matter takes, markers included; 0 when there is none.
 * It opens with `---` on the first line (no indent) and ends at the next `---` or `...` line; an
 * unclosed block is ordinary text.
 */
export function frontmatterRange(lines: readonly string[]): number {
  if (!FRONTMATTER_OPEN.test(lines[0] ?? "")) return 0;
  for (let index = 1; index < lines.length; index += 1) {
    if (FRONTMATTER_CLOSE.test(lines[index])) return index + 1;
  }
  return 0;
}

/**
 * `value` safe as HTML text and as a double-quoted attribute value. With `quotes` false the `"`
 * stays as written (text content only, e.g. highlighted code, where `&quot;` would change the
 * output).
 */
export function escapeHtml(value: string, quotes = true): string {
  const escaped = value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
  return quotes ? escaped.replace(/"/gu, "&quot;") : escaped;
}

/** `value` as a literal inside a `RegExp` source. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
