/**
 * The block edit actions of the palette: headings, quotes, lists, code fences, rules, alerts,
 * checkboxes, table of contents, details, footnotes, MyST admonitions, definition lists, math, images, figures,
 * dropdowns and Mermaid diagrams.
 */

import { ADMONITION_TYPES, ALERT_TYPES } from "../../core/palette/paletteActions";
import {
  editLinePrefixes,
  insertBlockAfterSelection,
  insertBlockAt,
  touchedLines,
  validSelection,
} from "./editActionHelpers";
import { imageDraft } from "./linkEditActions";
import type { EditActionContext } from "./editActions";
import type { TextEdit } from "./textEditing";

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-043
/** Sets (or, with level 0, removes) the `#` prefix on each touched non-blank line. */
export function setHeading(ctx: EditActionContext): TextEdit | undefined {
  if (ctx.arg === undefined || !/^[0-5]$/u.test(ctx.arg)) return undefined;
  const level = Number(ctx.arg);
  const prefix = level > 0 ? "#".repeat(level) + " " : "";
  return editLinePrefixes(ctx, (line, count) => {
    if (line.trim() === "") {
      return count === 1 && level > 0 ? { remove: line.length, add: prefix } : { remove: 0, add: "" };
    }
    const existing = /^(#{1,6})(?:[ \t]+|$)/u.exec(line);
    if (existing && existing[1].length === level) return { remove: 0, add: "" };
    return { remove: existing ? existing[0].length : 0, add: prefix };
  });
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-049
/**
 * Quotes every touched line with `> ` in front of any list marker, or removes one quote level
 * when every non-blank touched line is already quoted.
 */
export function toggleQuote(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const { lines } = touchedLines(ctx);
  const filled = lines.filter((line) => line.trim() !== "");
  const unquote = filled.length > 0 && filled.every((line) => line.startsWith(">"));
  return editLinePrefixes(ctx, (line, count) => {
    if (unquote) {
      const marker = /^> ?/u.exec(line);
      return { remove: marker ? marker[0].length : 0, add: "" };
    }
    if (line.trim() === "") {
      return count === 1 ? { remove: line.length, add: "> " } : { remove: 0, add: line === "" ? ">" : "" };
    }
    return { remove: 0, add: "> " };
  });
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-052
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-053
/**
 * Turns the touched lines into a bulleted (`- `) or numbered (`1. `) list, or removes the marker
 * when every non-blank touched line already has it. A marker of the other kind is replaced; an
 * empty single line gets the marker and the caret after it.
 */
export function toggleList(ctx: EditActionContext, ordered: boolean): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const own = ordered ? /^(\d{1,9}[.)])[ \t]+/u : /^[-*+][ \t]+/u;
  const other = ordered ? /^[-*+][ \t]+/u : /^\d{1,9}[.)][ \t]+/u;
  const { lines } = touchedLines(ctx);
  const filled = lines.filter((line) => line.trim() !== "");
  const remove = filled.length > 0 && filled.every((line) => own.test(line));
  let number = 0;
  return editLinePrefixes(ctx, (line, count) => {
    if (remove) {
      const marker = own.exec(line);
      return { remove: marker ? marker[0].length : 0, add: "" };
    }
    if (line.trim() === "") {
      return count === 1
        ? { remove: line.length, add: ordered ? "1. " : "- " }
        : { remove: 0, add: "" };
    }
    const prefix = ordered ? ++number + ". " : "- ";
    const existing = own.exec(line) ?? other.exec(line);
    return { remove: existing ? existing[0].length : 0, add: prefix };
  });
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-054
/**
 * Wraps the touched lines in a fence, or inserts an empty fence with the caret inside (on a
 * blank line, otherwise below the caret line). The fence outgrows any backtick run inside.
 */
export function insertCodeFence(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const language = ctx.arg !== undefined && /^[\w+#.-]+$/u.test(ctx.arg) ? ctx.arg : "";
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  const block = lines.join("\n");
  const runs = block.match(/`+/gu) ?? [];
  const width = Math.max(3, ...runs.map((run) => run.length + 1));
  const fence = "`".repeat(width);
  const open = fence + language;
  if (ctx.selectionStart !== ctx.selectionEnd) {
    return {
      start: firstStart,
      end: lastEnd,
      text: open + "\n" + block + "\n" + fence,
      selectionStart: firstStart + open.length + 1,
      selectionEnd: firstStart + open.length + 1 + block.length,
    };
  }
  if (block.trim() === "") {
    const caret = firstStart + open.length + 1;
    return {
      start: firstStart,
      end: lastEnd,
      text: open + "\n\n" + fence,
      selectionStart: caret,
      selectionEnd: caret,
    };
  }
  const caret = lastEnd + 2 + open.length + 1;
  return {
    start: lastEnd,
    end: lastEnd,
    text: "\n\n" + open + "\n\n" + fence,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-050
/** Puts a horizontal rule, set apart by blank lines, after the line the selection ends on. */
export function insertRule(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const { value } = ctx;
  const { firstStart, lastEnd } = touchedLines({ ...ctx, selectionStart: ctx.selectionEnd });
  const blank = value.slice(firstStart, lastEnd).trim() === "";
  const start = blank ? firstStart : lastEnd;
  const lead = value.slice(0, start);
  const gap = !blank
    ? "\n\n"
    : lead === "" || lead.endsWith("\n\n")
      ? ""
      : lead.endsWith("\n")
        ? "\n"
        : "\n\n";
  const end = value.charAt(lastEnd) === "\n" ? lastEnd + 1 : lastEnd;
  const text = gap + "---\n\n";
  const caret = start + text.length;
  return { start, end, text, selectionStart: caret, selectionEnd: caret };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-003
/** A `[TOC]` marker set apart after the line the selection ends on, the caret after it. */
export function insertToc(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const marker = "[TOC]";
  const { lastEnd } = touchedLines({ ...ctx, selectionStart: ctx.selectionEnd });
  return insertBlockAt({ ...ctx, selectionStart: lastEnd, selectionEnd: lastEnd }, marker, marker.length, 0);
}

const ALERT_HEAD = /^(\s{0,3}>\s?\[!)(NOTE|TIP|IMPORTANT|WARNING|CAUTION)(\][ \t]*)$/iu;

/**
 * The type word of the alert the caret is in: the head line is the first line of the run of
 * quoted lines around the caret (`> [!TYPE]`).
 */
function alertAtCaret(ctx: EditActionContext): { start: number; end: number; type: string } | undefined {
  const { value } = ctx;
  const lineEndOf = (start: number): number => {
    const end = value.indexOf("\n", start);
    return end === -1 ? value.length : end;
  };
  const quoted = (start: number): boolean => /^\s{0,3}>/u.test(value.slice(start, lineEndOf(start)));
  let lineStart = value.lastIndexOf("\n", ctx.selectionStart - 1) + 1;
  if (!quoted(lineStart)) return undefined;
  while (lineStart > 0) {
    const previousStart = value.lastIndexOf("\n", lineStart - 2) + 1;
    if (!quoted(previousStart)) break;
    lineStart = previousStart;
  }
  const head = ALERT_HEAD.exec(value.slice(lineStart, lineEndOf(lineStart)));
  if (!head) return undefined;
  const start = lineStart + head[1].length;
  return { start, end: start + head[2].length, type: head[2].toUpperCase() };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-115
/**
 * Inserts a GitHub alert (`> [!NOTE]` and the touched lines quoted) or, with the caret inside
 * an alert, changes its type to `ctx.arg`. An unknown type is refused.
 */
export function insertAlert(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  if (ctx.arg !== undefined && !ALERT_TYPES.includes(ctx.arg)) return undefined;
  const existing = alertAtCaret(ctx);
  if (existing) {
    if (ctx.arg === undefined || ctx.arg === existing.type) return undefined;
    const delta = ctx.arg.length - existing.type.length;
    const move = (position: number): number =>
      position >= existing.end ? position + delta : position > existing.start ? existing.start + ctx.arg!.length : position;
    return {
      start: existing.start,
      end: existing.end,
      text: ctx.arg,
      selectionStart: move(ctx.selectionStart),
      selectionEnd: move(ctx.selectionEnd),
    };
  }
  const head = "> [!" + (ctx.arg ?? "NOTE") + "]\n";
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  const quoted = lines.map((line) => (line.trim() === "" && lines.length > 1 ? ">" : "> " + line));
  const text = head + quoted.join("\n");
  if (ctx.selectionStart !== ctx.selectionEnd) {
    return {
      start: firstStart,
      end: lastEnd,
      text,
      selectionStart: firstStart + head.length,
      selectionEnd: firstStart + text.length,
    };
  }
  const column = ctx.selectionStart - firstStart;
  const caret = firstStart + head.length + 2 + Math.min(column, lines[0].length);
  return { start: firstStart, end: lastEnd, text, selectionStart: caret, selectionEnd: caret };
}

const CHECKBOX_LINE = /^(\s*(?:[-*+]|\d{1,9}[.)])[ \t]+)\[[ xX]\][ \t]?/u;

const LIST_ITEM_LINE = /^(\s*(?:[-*+]|\d{1,9}[.)])[ \t]+)/u;

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-123
/**
 * Toggles a task-list checkbox on the touched lines: when every non-blank line has one they
 * lose it (the list item stays), otherwise the lines without one gain `[ ]` after their list
 * marker, or `- [ ] ` when they have none.
 */
export function toggleCheckbox(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  const filled = lines.filter((line) => line.trim() !== "");
  const remove = filled.length > 0 && filled.every((line) => CHECKBOX_LINE.test(line));
  // For each line: where the change happens, how many characters go and what comes instead.
  const changes = lines.map((line) => {
    if (line.trim() === "" && lines.length > 1) return { at: 0, drop: 0, add: "" };
    const boxed = CHECKBOX_LINE.exec(line);
    if (remove) {
      const marker = boxed![1];
      return { at: marker.length, drop: boxed![0].length - marker.length, add: "" };
    }
    if (boxed) return { at: 0, drop: 0, add: "" };
    const item = LIST_ITEM_LINE.exec(line);
    if (item) return { at: item[1].length, drop: 0, add: "[ ] " };
    const indent = (/^[ \t]*/u.exec(line) ?? [""])[0].length;
    return { at: indent, drop: 0, add: "- [ ] " };
  });
  const text = lines.map((line, index) => {
    const change = changes[index];
    return line.slice(0, change.at) + change.add + line.slice(change.at + change.drop);
  }).join("\n");
  if (text === lines.join("\n")) return undefined;
  if (lines.length === 1 && ctx.selectionStart === ctx.selectionEnd) {
    const change = changes[0];
    const column = ctx.selectionStart - firstStart;
    const next = column < change.at
      ? column
      : column >= change.at + change.drop ? column - change.drop + change.add.length : change.at;
    const caret = firstStart + next;
    return { start: firstStart, end: lastEnd, text, selectionStart: caret, selectionEnd: caret };
  }
  return {
    start: firstStart,
    end: lastEnd,
    text,
    selectionStart: firstStart,
    selectionEnd: firstStart + text.length,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-124
/**
 * Wraps the touched lines (or a new sample) in `<details><summary>`; the summary text is
 * selected. A blank line after the summary lets the content render as Markdown.
 */
export function insertDetails(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  if (ctx.selectionStart === ctx.selectionEnd) {
    return insertBlockAfterSelection(
      ctx, "<details>\n<summary>Summary</summary>\n\nContent\n\n</details>", "Summary");
  }
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  const head = "<details>\n<summary>";
  const text = head + "Summary</summary>\n\n" + lines.join("\n") + "\n\n</details>";
  return {
    start: firstStart,
    end: lastEnd,
    text,
    selectionStart: firstStart + head.length,
    selectionEnd: firstStart + head.length + "Summary".length,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-125
/**
 * Adds a footnote: `[^n]` after the selection and an empty `[^n]: ` definition at the end of
 * the text (after the footnote definitions already there), the caret in it. `n` is one more than
 * the highest numeric label in use.
 */
export function insertFootnote(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  let highest = 0;
  for (const label of ctx.value.matchAll(/\[\^(\d+)\]/gu)) highest = Math.max(highest, Number(label[1]));
  const mark = "[^" + (highest + 1) + "]";
  const at = ctx.selectionEnd;
  const rest = ctx.value.slice(at);
  const content = rest.replace(/\s+$/u, "");
  const trailing = rest.slice(content.length);
  const body = ctx.value.slice(0, at) + mark + content;
  const lastLine = body.slice(body.lastIndexOf("\n") + 1);
  const separator = /^\[\^[^\]]+\]:/u.test(lastLine) ? "\n" : "\n\n";
  const text = mark + content + separator + mark + ": ";
  const caret = at + text.length;
  return { start: at, end: ctx.value.length, text: text + trailing, selectionStart: caret, selectionEnd: caret };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-127
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-130
/**
 * Wraps the touched lines in a MyST colon-fence admonition (`:::{type}`), or inserts an empty one;
 * "custom" writes `{admonition} Title` with a `:class:`. The outer fence is one colon longer than
 * the longest colon fence inside.
 */
export function insertAdmonition(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const type = ctx.arg;
  if (type === undefined || (type !== "custom" && !ADMONITION_TYPES.includes(type))) return undefined;
  const custom = type === "custom";
  const selected = ctx.selectionStart !== ctx.selectionEnd;
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  let longest = 2;
  if (selected) {
    for (const line of lines) {
      const fence = /^\s*(:{3,})/u.exec(line);
      if (fence) longest = Math.max(longest, fence[1].length);
    }
  }
  const colons = ":".repeat(longest + 1);
  const head = colons + (custom ? "{admonition} Title\n:class: note\n\n" : "{" + type + "}\n");
  const body = selected ? lines.join("\n") : "";
  const text = head + (selected ? body + "\n" : custom ? "" : "\n") + colons;
  const titleAt = head.indexOf("Title");
  if (selected) {
    return {
      start: firstStart,
      end: lastEnd,
      text,
      selectionStart: firstStart + (custom ? titleAt : head.length),
      selectionEnd: firstStart + (custom ? titleAt + 5 : head.length + body.length),
    };
  }
  return insertBlockAt(ctx, text, custom ? titleAt : head.length, custom ? 5 : 0);
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-132
/** Makes the touched lines a definition list term with an `: Definition` line below (or a sample). */
export function insertDefinitionList(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  if (ctx.selectionStart === ctx.selectionEnd) {
    return insertBlockAt(ctx, "Term\n: Definition", 0, 4);
  }
  const { lastEnd } = touchedLines(ctx);
  return {
    start: lastEnd,
    end: lastEnd,
    text: "\n: Definition",
    selectionStart: lastEnd + 3,
    selectionEnd: lastEnd + 13,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-133
/** Math: `inline` wraps in `$…$`, `display` in a `$$` block and `aligned` in `\begin{align}`. */
export function insertMath(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const kind = ctx.arg;
  if (kind !== "inline" && kind !== "display" && kind !== "aligned") return undefined;
  const selected = ctx.selectionStart !== ctx.selectionEnd;
  if (kind === "inline") {
    const text = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd) || "x";
    return {
      start: ctx.selectionStart,
      end: ctx.selectionEnd,
      text: "$" + text + "$",
      selectionStart: ctx.selectionStart + 1,
      selectionEnd: ctx.selectionStart + 1 + text.length,
    };
  }
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  const content = selected ? lines.join("\n") : kind === "display" ? "E = mc^2" : "a &= b";
  const head = kind === "display" ? "$$\n" : "$$\n\\begin{align}\n";
  const tail = kind === "display" ? "\n$$" : "\n\\end{align}\n$$";
  const text = head + content + tail;
  if (selected) {
    return {
      start: firstStart, end: lastEnd, text,
      selectionStart: firstStart + head.length, selectionEnd: firstStart + head.length + content.length,
    };
  }
  return insertBlockAt(ctx, text, head.length, content.length);
}

/** The file stem of a picked path, without the characters that would break `![alt]`. */
function imageName(imagePath: string): string {
  const file = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  const dot = file.lastIndexOf(".");
  const stem = (dot > 0 ? file.slice(0, dot) : file).replace(/[\[\]\\]/gu, "").trim();
  return stem === "" ? "image" : stem;
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-109
/** A picked path the actions can write: relative text without line breaks or angle brackets. */
function pickedImagePath(ctx: EditActionContext): string | undefined {
  const picked = ctx.arg;
  if (picked === undefined || picked === "" || /[<>\r\n]/u.test(picked)) return undefined;
  return picked;
}

/** `![name](path)` over the selection with the name selected; `<…>` around spaces or parentheses. */
export function insertImage(ctx: EditActionContext): TextEdit | undefined {
  const picked = pickedImagePath(ctx);
  if (!validSelection(ctx) || picked === undefined) return undefined;
  // With the caret in an existing image the pick replaces its path; alt text and title stay.
  const existing = imageDraft(ctx);
  const name = existing && existing.alt !== "" ? existing.alt.replace(/([[\]])/gu, "\\$1") : imageName(picked);
  const target = /[\s()]/u.test(picked) ? "<" + picked + ">" : picked;
  const text = "![" + name + "](" + target + (existing?.title === undefined ? "" : " " + existing.title) + ")";
  const start = existing ? existing.start : ctx.selectionStart;
  return {
    start, end: existing ? existing.end : ctx.selectionEnd, text,
    selectionStart: start + 2, selectionEnd: start + 2 + name.length,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-150
/**
 * `:::{figure} path` with `:alt:` and an empty caption line. The touched lines of a selection
 * become the caption; the fence is one colon longer than the longest colon fence inside them.
 */
export function insertFigure(ctx: EditActionContext): TextEdit | undefined {
  const picked = pickedImagePath(ctx);
  if (!validSelection(ctx) || picked === undefined) return undefined;
  const selected = ctx.selectionStart !== ctx.selectionEnd;
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  let longest = 2;
  if (selected) {
    for (const line of lines) {
      const fence = /^\s*(:{3,})/u.exec(line);
      if (fence) longest = Math.max(longest, fence[1].length);
    }
  }
  const colons = ":".repeat(longest + 1);
  const head = colons + "{figure} " + picked + "\n:alt: " + imageName(picked) + "\n\n";
  const text = head + (selected ? lines.join("\n") : "") + "\n" + colons;
  if (selected) {
    return { start: firstStart, end: lastEnd, text, selectionStart: firstStart + head.length, selectionEnd: firstStart + head.length };
  }
  return insertBlockAt(ctx, text, head.length, 0);
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-137
/** A MyST dropdown: a note admonition with `:class: dropdown`; the touched lines become its body. */
export function insertDropdown(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  const selected = ctx.selectionStart !== ctx.selectionEnd;
  const { firstStart, lastEnd, lines } = touchedLines(ctx);
  let longest = 2;
  if (selected) {
    for (const line of lines) {
      const fence = /^\s*(:{3,})/u.exec(line);
      if (fence) longest = Math.max(longest, fence[1].length);
    }
  }
  const colons = ":".repeat(longest + 1);
  const head = colons + "{note} Title\n:class: dropdown\n\n";
  const text = head + (selected ? lines.join("\n") : "Content") + "\n" + colons;
  const titleAt = head.indexOf("Title");
  if (selected) {
    return { start: firstStart, end: lastEnd, text, selectionStart: firstStart + titleAt, selectionEnd: firstStart + titleAt + 5 };
  }
  return insertBlockAt(ctx, text, titleAt, 5);
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-265
/** A fenced Vega-Lite bar chart with inline data, set apart after the selection, its title selected. */
export function insertVegaLite(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  return insertBlockAfterSelection(ctx, [
    "```vega-lite",
    "{",
    '  "title": "Chart title",',
    '  "data": { "values": [',
    '    { "category": "A", "amount": 28 },',
    '    { "category": "B", "amount": 55 },',
    '    { "category": "C", "amount": 43 }',
    "  ] },",
    '  "mark": "bar",',
    '  "encoding": {',
    '    "x": { "field": "category", "type": "nominal" },',
    '    "y": { "field": "amount", "type": "quantitative" }',
    "  }",
    "}",
    "```",
  ].join("\n"), "Chart title");
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-265
/** A fenced Vega bar chart with inline data, set apart after the selection, its title selected. */
export function insertVega(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  return insertBlockAfterSelection(ctx, [
    "```vega",
    "{",
    '  "$schema": "https://vega.github.io/schema/vega/v6.json",',
    '  "title": "Chart title",',
    '  "width": 300,',
    '  "height": 160,',
    '  "padding": 5,',
    '  "data": [{ "name": "table", "values": [',
    '    { "category": "A", "amount": 28 },',
    '    { "category": "B", "amount": 55 },',
    '    { "category": "C", "amount": 43 }',
    "  ] }],",
    '  "scales": [',
    '    { "name": "x", "type": "band", "domain": { "data": "table", "field": "category" }, "range": "width", "padding": 0.1 },',
    '    { "name": "y", "domain": { "data": "table", "field": "amount" }, "nice": true, "range": "height" }',
    "  ],",
    '  "axes": [{ "orient": "bottom", "scale": "x" }, { "orient": "left", "scale": "y" }],',
    '  "marks": [{',
    '    "type": "rect",',
    '    "from": { "data": "table" },',
    '    "encode": { "enter": {',
    '      "x": { "scale": "x", "field": "category" },',
    '      "width": { "scale": "x", "band": 1 },',
    '      "y": { "scale": "y", "field": "amount" },',
    '      "y2": { "scale": "y", "value": 0 }',
    "    } }",
    "  }]",
    "}",
    "```",
  ].join("\n"), "Chart title");
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-017
/** A fenced Mermaid flowchart set apart after the selection, its first node label selected. */
export function insertMermaid(ctx: EditActionContext): TextEdit | undefined {
  if (!validSelection(ctx)) return undefined;
  return insertBlockAfterSelection(
    ctx, "```mermaid\nflowchart TD\n  A[Start] --> B[End]\n```", "Start");
}
