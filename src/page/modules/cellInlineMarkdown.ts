/**
 * The inline Markdown of a table cell, built as DOM nodes: code, strong, emphasis, strikethrough,
 * links, line breaks and backslash escapes. It shows the text just typed in a cell the editor
 * left, until the next render of the page replaces it with the full rendering. It never parses
 * HTML: every text goes through `textContent`.
 */

const SAFE_HREF = /^(?:https?:|mailto:|#|\/(?!\/)|\.\.?\/)/iu;

type Inline = { open: string; tag: string };
const MARKS: readonly Inline[] = [
  { open: "**", tag: "strong" },
  { open: "__", tag: "strong" },
  { open: "~~", tag: "del" },
  { open: "*", tag: "em" },
  { open: "_", tag: "em" },
];

const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/u;

/**
 * The index of the delimiter closing the one opened at `index`, or -1. Follows the CommonMark
 * flanking rules as far as is simple: the text after the opener and before the closer is not a
 * space, and `_` never opens or closes inside a word (`snake_case_name` stays text).
 */
function closingIndex(text: string, index: number, open: string): number {
  const after = text[index + open.length];
  if (after === undefined || SPACE.test(after)) return -1;
  const underscore = open.startsWith("_");
  if (underscore && index > 0 && WORD.test(text[index - 1]!)) return -1;
  let close = text.indexOf(open, index + open.length);
  while (close > index + open.length) {
    const before = text[close - 1]!;
    const next = text[close + open.length];
    if (!SPACE.test(before) && !(underscore && next !== undefined && WORD.test(next))) return close;
    close = text.indexOf(open, close + 1);
  }
  return -1;
}

function textSpan(document: Document, text: string): HTMLElement {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

/** Appends the rendering of `text` (one cell of Markdown) to `parent`. */
function appendCellInline(document: Document, parent: HTMLElement, text: string): void {
  let plain = "";
  const flush = (): void => {
    if (plain) parent.appendChild(textSpan(document, plain));
    plain = "";
  };
  const wrap = (tag: string, inner: string): void => {
    flush();
    const element = document.createElement(tag);
    appendCellInline(document, element, inner);
    parent.appendChild(element);
  };
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const char = text[index]!;
    if (char === "\\" && index + 1 < text.length && /[\\`*_{}[\]()#+\-.!|~<>]/u.test(text[index + 1]!)) {
      plain += text[index + 1];
      index += 2;
      continue;
    }
    const lineBreak = /^<br\s*\/?>/iu.exec(rest);
    if (lineBreak) {
      flush();
      parent.appendChild(document.createElement("br"));
      index += lineBreak[0].length;
      continue;
    }
    if (char === "`") {
      const close = text.indexOf("`", index + 1);
      if (close > index + 1) {
        flush();
        const code = document.createElement("code");
        code.textContent = text.slice(index + 1, close);
        parent.appendChild(code);
        index = close + 1;
        continue;
      }
    }
    if (char === "[") {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)/u.exec(rest);
      if (link) {
        flush();
        const anchor = document.createElement("a");
        if (SAFE_HREF.test(link[2]!)) anchor.setAttribute("href", link[2]!);
        appendCellInline(document, anchor, link[1]!);
        parent.appendChild(anchor);
        index += link[0].length;
        continue;
      }
    }
    const mark = MARKS.find((candidate) => rest.startsWith(candidate.open));
    if (mark) {
      const close = closingIndex(text, index, mark.open);
      if (close > 0) {
        wrap(mark.tag, text.slice(index + mark.open.length, close));
        index = close + mark.open.length;
        continue;
      }
      plain += mark.open;
      index += mark.open.length;
      continue;
    }
    plain += char;
    index += 1;
  }
  flush();
}

/** Replaces the children of `parent` with the rendering of `text`. */
export function setCellInline(document: Document, parent: HTMLElement, text: string): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  appendCellInline(document, parent, text);
}
