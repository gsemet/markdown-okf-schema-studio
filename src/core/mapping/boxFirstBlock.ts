/**
 * What a block would do to an admonition or a GitHub alert (a box) as the first block of its body.
 * A `---` line there is read as the start of the directive's options, so the box shows nothing; a
 * heading there becomes the title of an admonition that is given none. Read on the source lines, so
 * the block move can refuse before it writes.
 */

import { ADMONITION_TITLES } from "../directives/admonition";
import { VERSION_ADMONITION_TYPES } from "../palette/paletteActions";
import { isAlertMarkerLine } from "../render/mystGithubAlerts";
import type { BlockLines } from "./blockMove";

const HIDDEN_BODY = "A --- line cannot start an admonition or an alert: its content would not show.";
const TAKEN_AS_TITLE = "A heading cannot start this admonition: it would become its title.";

/** The opening line of a directive: its quote and list markers, its name or classes, its argument. */
const OPENING = /^((?:[ \t>]|(?:[-*+]|\d{1,9}[.)])[ \t])*)(?::{3,}|`{3,}|~{3,})[ \t]*\{([^}]*)\}(.*)$/u;
const OPTION = /^:[\w-]+:/u;
const DASHES = /^---+[ \t]*$/u;
const LINK_DEFINITION = /^\[[^\]]+\]:[ \t]*\S/u;
const ATX_HEADING = /^#{1,6}(?:[ \t]|$)/u;
const SETEXT_UNDERLINE = /^(?:=+|-+)[ \t]*$/u;
/** The first line of a block that an underline cannot turn into a heading. */
const NOT_A_PARAGRAPH = /^(?:>|[-*+][ \t]|\d{1,9}[.)][ \t]|`{3,}|~{3,}|:{3,}|\|)/u;

/** A box whose body starts above a given line. */
interface Box {
  /** What a body line starts with before its own text: indentation and the markers around the box. */
  container: RegExp;
  /** The column of the opening fence or alert marker: dashes indented past it are a rule. */
  column: number;
  /** True when a heading as the first block of the body becomes the title. */
  takesTitle: boolean;
}

function directiveBox(line: string): Box | undefined {
  const opening = OPENING.exec(line);
  if (!opening) return undefined;
  const [, markers, name, argument] = opening as unknown as [string, string, string, string];
  const callout = /(?:^|\s)\.callout-/u.test(name);
  const admonition = name === "admonition" || Object.hasOwn(ADMONITION_TITLES, name);
  if (!callout && !admonition && name !== "dropdown" && !VERSION_ADMONITION_TYPES.includes(name)) return undefined;
  return {
    container: new RegExp(`^[ \\t]*(?:>[ \\t]*){${markers.split(">").length - 1}}`, "u"),
    column: markers.length,
    takesTitle: callout || (admonition && argument.trim() === ""),
  };
}

/** True when the lines between an opening line and a block hold no block: options, blank lines. */
function isPreamble(lines: readonly string[], linksToo: boolean): boolean {
  let next = 0;
  if (DASHES.test(lines[0] ?? "")) {
    next = lines.findIndex((line, index) => index > 0 && DASHES.test(line)) + 1;
    if (next === 0) return false;
  } else {
    while (OPTION.test(lines[next] ?? "")) next += 1;
  }
  return lines.slice(next).every((line) => line === "" || (linksToo && LINK_DEFINITION.test(line)));
}

/**
 * The box whose body has no block above line `line` (one-based). With `linksToo`, link definitions
 * count as no block.
 */
function boxStartingAt(texts: readonly string[], line: number, linksToo: boolean): Box | undefined {
  let quoted = true;
  for (let above = line - 2; above >= 0; above -= 1) {
    const text = texts[above]!;
    if (quoted && isAlertMarkerLine(text)) {
      return { container: /^[ \t]*>[ \t]?/u, column: text.indexOf(">") + 2, takesTitle: false };
    }
    quoted &&= /^[ \t]*>[ \t]*$/u.test(text);
    const box = directiveBox(text);
    if (!box) continue;
    const between = texts.slice(above + 1, line - 1).map((body) => body.replace(box.container, ""));
    return isPreamble(between, linksToo) ? box : undefined;
  }
  return undefined;
}

function startsWithDashes(line: string, box: Box): boolean {
  const own = line.replace(box.container, "");
  return DASHES.test(own) && line.length - own.length <= box.column;
}

function isHeading(block: readonly string[], box: Box): boolean {
  const first = block[0]!.replace(box.container, "");
  if (ATX_HEADING.test(first)) return block[0]!.length - first.length <= box.column + 3;
  return block.length > 1 && !NOT_A_PARAGRAPH.test(first)
    && SETEXT_UNDERLINE.test(block[block.length - 1]!.replace(box.container, ""));
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-124
/**
 * The reason why `block` may not take the place of the block that starts on line `first`: that
 * line starts the body of a box, which `block` would hide or give a title. Undefined otherwise.
 * `texts` are the lines of the document.
 */
export function firstBlockRefusal(texts: readonly string[], first: number, block: BlockLines): string | undefined {
  const moving = texts.slice(block.line - 1, block.endLine);
  const rendered = boxStartingAt(texts, first, false);
  if (rendered && startsWithDashes(moving[0]!, rendered)) return HIDDEN_BODY;
  const titled = boxStartingAt(texts, first, true);
  return titled?.takesTitle && isHeading(moving, titled) ? TAKEN_AS_TITLE : undefined;
}
