/**
 * Radio choice markers: a list item that starts with `( )`, `(x)` or `(X)` followed by a space or a
 * tab. The renderer turns a run of at least two such items of one list into a radio group (see
 * `radioGroups.ts`); the host moves the `x` of a group with one-character edits. Pure module: no
 * host API, no DOM, no Node built-ins.
 */

/**
 * The start of a list item up to its radio marker: optional block quote markers, the indentation,
 * a bullet (`-`, `*`, `+`) or an ordered marker (`1.`, `1)`), and the spaces after it.
 */
const RADIO_ITEM = /^(((?:[ \t]*>)*[ \t]*)([-*+]|\d{1,9}([.)]))[ \t]+)\(([ xX])\)(?=[ \t])/u;

/** The zero-based column of the `(` of the radio marker that starts the list item `line`, or -1. */
export function radioMarkerColumn(line: string): number {
  const match = RADIO_ITEM.exec(line);
  return match ? match[1].length : -1;
}

/** The start of any list item: quote markers and indentation, then a bullet or an ordered marker. */
const LIST_ITEM = /^((?:[ \t]*>)*[ \t]*)(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/u;
/** A line that is blank once its block quote markers are removed. */
const BLANK_LINE = /^[\s>]*$/u;
/** The block starts that end a list when they are indented less than its items' content. */
const LIST_ENDING_BLOCK = /^((?:[ \t]*>)*[ \t]*)(?:#{1,6}(?:[ \t]|$)|(?:\*[ \t]*){3,}$|(?:-[ \t]*){3,}$|(?:_[ \t]*){3,}$|`{3,}|~{3,})/u;

/**
 * True when the positions can be the options of one radio group of `lineText`'s document: strictly
 * ascending lines; each line a radio item whose `(` sits at its column; every item with the same
 * indentation and the same kind of list marker (one list); and nothing between two options that
 * ends the group: a blank line, another item of the same or an outer list, or a heading, thematic
 * break or code fence outside the item. The renderer is the authority on groups; this cheap check
 * keeps a forged request from moving the `x` of options in other groups or other lists.
 */
function isOneRadioGroup(lineText: (line: number) => string | undefined, group: readonly RadioPosition[]): boolean {
  let shape: { indent: number; kind: string } | undefined;
  let previous: RadioPosition | undefined;
  for (const option of group) {
    const text = lineText(option.line);
    const match = text === undefined ? null : RADIO_ITEM.exec(text);
    if (!match || match[1].length !== option.column) return false;
    const indent = match[2].length;
    const kind = match[4] ?? match[3];
    if (shape && (indent !== shape.indent || kind !== shape.kind)) return false;
    shape = { indent, kind };
    if (previous) {
      if (option.line <= previous.line) return false;
      for (let line = previous.line + 1; line < option.line; line += 1) {
        const between = lineText(line) ?? "";
        if (BLANK_LINE.test(between)) return false;
        const item = LIST_ITEM.exec(between);
        if (item && item[1].length <= indent) return false;
        const block = LIST_ENDING_BLOCK.exec(between);
        if (block && block[1].length < previous.column) return false;
      }
    }
    previous = option;
  }
  return true;
}

/** One option of a radio group, by the position of its `(` in the source. */
export interface RadioPosition {
  /** One-based line in the full document. */
  readonly line: number;
  /** Zero-based UTF-16 column of the opening parenthesis. */
  readonly column: number;
}

/** A one-character change of a radio marker: the column of the character between the parentheses. */
export interface RadioCharacterEdit {
  readonly line: number;
  readonly column: number;
  readonly replacement: "x" | " ";
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-039
/**
 * The edits that select `target` among `group`: the target becomes `(x)` and every other selected
 * option `( )`. An option already in its state is left as written (`(X)` stays `(X)`), so a click on
 * the only selected option gives no edit, and a group with two selected options is normalised by
 * any click. Returns undefined when a line of the group no longer starts with a radio marker at its
 * column, when the target is not one of the group's options, when an option is listed twice, or
 * when the positions do not form one group of consecutive radio items of one list.
 */
export function radioSelectEdits(
  lineText: (line: number) => string | undefined,
  target: RadioPosition,
  group: readonly RadioPosition[],
): RadioCharacterEdit[] | undefined {
  if (!group.some((option) => option.line === target.line && option.column === target.column)) return undefined;
  const edits: RadioCharacterEdit[] = [];
  const seen = new Set<string>();
  for (const option of group) {
    const key = `${option.line}:${option.column}`;
    if (seen.has(key)) return undefined;
    seen.add(key);
    const text = lineText(option.line);
    if (text === undefined || radioMarkerColumn(text) !== option.column) return undefined;
    const selected = text[option.column + 1] !== " ";
    const wanted = option.line === target.line && option.column === target.column;
    if (selected !== wanted) {
      edits.push({ line: option.line, column: option.column + 1, replacement: wanted ? "x" : " " });
    }
  }
  return isOneRadioGroup(lineText, group) ? edits : undefined;
}
