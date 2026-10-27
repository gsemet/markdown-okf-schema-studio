/**
 * The title an edit-mode block shows for the syntax that produced it: the literal opening tag,
 * written in code font by the stylesheet. An HTML comment is titled `<!-- -->` (`<!-- TODO -->`
 * for a TODO comment), an HTML element block by its real opening tag, shortened with `…` when long,
 * and a table-of-contents block by its marker (`[TOC]`, `[[_TOC_]]`, or the `{contents}` line).
 */

/** The longest title, in characters, before the opening tag is shortened. */
export const TAG_TITLE_MAX = 48;

const OPENING_TAG = /^<([A-Za-z][\w:-]*)(?:\s[^<>]*)?\/?>/u;

/** The title of a comment block: `<!-- TODO -->` for a TODO comment, `<!-- -->` otherwise. */
export function commentTagTitle(todo: boolean): string {
  return todo ? "<!-- TODO -->" : "<!-- -->";
}

/**
 * The title of an HTML element block: its opening tag with the attributes as written, white space
 * collapsed, and cut with `…` before the closing `>` past `max` characters. Undefined when the
 * value does not start with an opening tag.
 */
export function openingTagTitle(html: string, max: number = TAG_TITLE_MAX): string | undefined {
  const match = OPENING_TAG.exec(html.trimStart());
  if (!match) return undefined;
  const tag = match[0].replace(/\s+/gu, " ");
  if (tag.length <= max) return tag;
  const closing = tag.endsWith("/>") ? "/>" : ">";
  return `${tag.slice(0, Math.max(1, max - closing.length - 1)).trimEnd()}…${closing}`;
}

/** The title of a `[TOC]` / `[[_TOC_]]` block: the marker as written, in the case written. */
export function tocTagTitle(marker: string): string {
  return marker.trim();
}

/** The title of a `{contents}` block: its opening line, `{contents} Title` when it has a title. */
export function contentsTagTitle(args?: string): string {
  const title = (args ?? "").replace(/\s+/gu, " ").trim();
  return title === "" ? "{contents}" : `{contents} ${title}`;
}
