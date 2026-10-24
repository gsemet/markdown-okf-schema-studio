/**
 * The colour edit actions of the palette: a text colour or background as an HTML span, and the
 * colour code under the caret. `isSafeColor` is the sanitizer's colour grammar (`isSafeOkfColor`):
 * the actions write nothing it would reject, and without it they refuse.
 */

import { isSpace, isWordChar, validSelection } from "./editActionHelpers";
import type { EditActionContext } from "./editActions";
import type { TextEdit } from "./textEditing";

/** The colour actions bound to the sanitizer's colour grammar. */
export function createColourEditActions(isSafeColor: ((value: string) => boolean) | undefined) {
  // Colour picker. The span is the exact shape the renderer keeps and the sanitizer turns into
  // data attributes: `<span style="color:#c00; background-color:#ff0">…</span>`, no other
  // attribute. Colours go through the sanitizer's own grammar; a value with a control character
  // is refused as well (it could break the tag).
  const COLOUR_PROPERTIES = ["color", "background-color"];

  const colourOk = (value: string): boolean =>
    typeof isSafeColor === "function" && value !== "" && !/[\u0000-\u001f\u007f]/u.test(value)
    && isSafeColor(value);

  /** The declarations of a span this action could have written, or `undefined` for any other. */
  function colourDeclarations(tag: string): Array<[string, string]> | undefined {
    const match = /^<span style="([^"<>]*)">$/u.exec(tag);
    if (!match) return undefined;
    const found: Array<[string, string]> = [];
    for (const declaration of (match[1] ?? "").split(";")) {
      if (declaration.trim() === "") continue;
      const separator = declaration.indexOf(":");
      if (separator < 0) return undefined;
      const property = declaration.slice(0, separator).trim();
      const colour = declaration.slice(separator + 1).trim();
      if (!COLOUR_PROPERTIES.includes(property) || found.some(([name]) => name === property)
        || !colourOk(colour)) {
        return undefined;
      }
      found.push([property, colour]);
    }
    return found.length > 0 ? found : undefined;
  }

  function colourTag(declarations: Array<[string, string]>): string {
    const ordered = COLOUR_PROPERTIES.flatMap((property) =>
      declarations.filter(([name]) => name === property));
    return '<span style="' + ordered.map(([name, colour]) => name + ":" + colour).join("; ") + '">';
  }

  interface ColourSpan {
    open: number;
    openEnd: number;
    close: number;
    closeEnd: number;
    declarations: Array<[string, string]>;
  }

  /** Every well-formed span of the text that carries colour declarations only. */
  function colourSpans(value: string): ColourSpan[] {
    const tokens = /<span(?:\s[^<>]*)?>|<\/span>/giu;
    const stack: Array<{ open: number; openEnd: number; declarations?: Array<[string, string]> }> = [];
    const found: ColourSpan[] = [];
    let match: RegExpExecArray | null;
    while ((match = tokens.exec(value)) !== null) {
      if (match[0].startsWith("</")) {
        const top = stack.pop();
        if (top?.declarations) {
          found.push({
            open: top.open,
            openEnd: top.openEnd,
            close: match.index,
            closeEnd: match.index + match[0].length,
            declarations: top.declarations,
          });
        }
      } else {
        const declarations = colourDeclarations(match[0]);
        stack.push({
          open: match.index,
          openEnd: match.index + match[0].length,
          ...(declarations ? { declarations } : {}),
        });
      }
    }
    return found;
  }

  /**
   * The innermost generated span the selection stands for: a caret anywhere in its content, a
   * selection of exactly its content, or one covering the whole span with its tags.
   */
  function colourTarget(value: string, start: number, end: number): ColourSpan | undefined {
    let best: ColourSpan | undefined;
    for (const span of colourSpans(value)) {
      const inside = start === end
        ? start >= span.openEnd && start <= span.close
        : (start === span.openEnd && end === span.close) || (start === span.open && end === span.closeEnd);
      if (inside && (!best || span.open > best.open)) best = span;
    }
    return best;
  }

  function applyColour(ctx: EditActionContext): TextEdit | undefined {
    if (!validSelection(ctx)) return undefined;
    const match = /^(text|background):([\s\S]*)$/u.exec(ctx.arg ?? "");
    if (!match) return undefined;
    const property = match[1] === "text" ? "color" : "background-color";
    const colour = (match[2] ?? "").trim();
    if (colour !== "" && !colourOk(colour)) return undefined;
    const { value, selectionStart, selectionEnd } = ctx;
    const collapsed = selectionStart === selectionEnd;
    // A boundary inside a tag's own text (`style="…"`, `onclick="…"`) is never a place to edit.
    const tags = /<\/?[a-z][^<>]*>/giu;
    let tag: RegExpExecArray | null;
    while ((tag = tags.exec(value)) !== null) {
      const tagEnd = tag.index + tag[0].length;
      for (const position of [selectionStart, selectionEnd]) {
        if (position > tag.index && position < tagEnd) return undefined;
      }
    }
    const target = colourTarget(value, selectionStart, selectionEnd);

    if (!target) {
      if (colour === "") return undefined;
      let start = selectionStart;
      let end = selectionEnd;
      while (start < end && isSpace(value.charAt(start))) start += 1;
      while (end > start && isSpace(value.charAt(end - 1))) end -= 1;
      if (start === end) {
        start = selectionStart;
        end = selectionStart;
      }
      // A slice with an unmatched `<span>` or `</span>` would recolour text outside the selection.
      let depth = 0;
      for (const token of value.slice(start, end).matchAll(/<span(?:\s[^<>]*)?>|<\/span>/giu)) {
        depth += token[0].startsWith("</") ? -1 : 1;
        if (depth < 0) return undefined;
      }
      if (depth !== 0) return undefined;
      const open = colourTag([[property, colour]]);
      return {
        start,
        end,
        text: open + value.slice(start, end) + "</span>",
        selectionStart: start + open.length,
        selectionEnd: end + open.length,
      };
    }

    const kept = target.declarations.filter(([name]) => name !== property);
    const declarations: Array<[string, string]> = colour === "" ? kept : [...kept, [property, colour]];
    const inner = value.slice(target.openEnd, target.close);
    if (colour === "" && declarations.length === target.declarations.length) return undefined;
    if (declarations.length === 0) {
      // Nothing left to say: unwrap, keeping the caret on its character or the text selected.
      const shift = target.openEnd - target.open;
      const from = collapsed ? selectionStart - shift : target.open;
      return {
        start: target.open,
        end: target.closeEnd,
        text: inner,
        selectionStart: from,
        selectionEnd: collapsed ? from : from + inner.length,
      };
    }
    const open = colourTag(declarations);
    const oldLength = target.openEnd - target.open;
    const caret = selectionStart + open.length - oldLength;
    return {
      start: target.open,
      end: target.openEnd,
      text: open,
      selectionStart: collapsed ? caret : target.open + open.length,
      selectionEnd: collapsed ? caret : target.open + open.length + inner.length,
    };
  }

  /** The `#rgb`, `#rrggbb` or `rgb()` code the selection lies in, or `undefined`. */
  function colourCodeAt(ctx: EditActionContext): { start: number; end: number; text: string } | undefined {
    if (!validSelection(ctx)) return undefined;
    const { value, selectionStart, selectionEnd } = ctx;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineBreak = value.indexOf("\n", selectionStart);
    const line = value.slice(lineStart, lineBreak === -1 ? value.length : lineBreak);
    const codes = /#[0-9a-f]+|rgba?\([^()\n]*\)/giu;
    let match: RegExpExecArray | null;
    while ((match = codes.exec(line)) !== null) {
      const start = lineStart + match.index;
      const end = start + match[0].length;
      if (selectionStart < start || selectionEnd > end) continue;
      const before = value.charAt(start - 1);
      const after = value.charAt(end);
      // "&#123;" is a character reference and "abc#fff" part of a word, neither is a colour.
      if (before !== "" && (isWordChar(before) || before === "&" || before === "#")) continue;
      if (match[0].startsWith("#") && after !== "" && isWordChar(after)) continue;
      if (!colourOk(match[0])) continue;
      return { start, end, text: match[0] };
    }
    return undefined;
  }

  function applyColourCode(ctx: EditActionContext): TextEdit | undefined {
    const code = colourCodeAt(ctx);
    const colour = (ctx.arg ?? "").trim();
    if (!code || !colourOk(colour)) return undefined;
    const caret = code.start + colour.length;
    return { start: code.start, end: code.end, text: colour, selectionStart: caret, selectionEnd: caret };
  }

  return { colourOk, applyColour, colourCodeAt, applyColourCode };
}
