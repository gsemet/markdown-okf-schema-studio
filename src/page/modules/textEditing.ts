export interface TextEdit {
  start: number;
  end: number;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Pure text-editing helpers for the raw-Markdown block editor.
 */
export function createTextEditingTools() {
  /**
   * Returns the edit that Enter should apply at the caret to continue the construct of the current
   * line (list item, quote, indentation), or `undefined` to leave Enter to the native textarea.
   */
  function continueOnEnter(
    value: string,
    selectionStart: number,
    selectionEnd: number,
  ): TextEdit | undefined {
    if (selectionStart !== selectionEnd) return undefined;
    const caret = selectionStart;
    if (caret < 0 || caret > value.length) return undefined;
    const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
    const nextBreak = value.indexOf("\n", caret);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const line = value.slice(lineStart, lineEnd);
    const caretInLine = caret - lineStart;

    const insertion = (prefix: string): TextEdit => ({
      start: caret,
      end: caret,
      text: "\n" + prefix,
      selectionStart: caret + 1 + prefix.length,
      selectionEnd: caret + 1 + prefix.length,
    });

    // Inside a fenced block only the indentation is carried.
    let fences = 0;
    for (const previous of value.slice(0, lineStart).split("\n")) {
      if (/^\s*(```|~~~)/u.test(previous)) fences += 1;
    }
    if (fences % 2 === 1) {
      const indent = /^[ \t]*/u.exec(line)![0];
      if (indent.length === 0 || caretInLine < indent.length) return undefined;
      return insertion(indent);
    }

    const quote = /^(?:[ \t]*>[ \t]?)*/u.exec(line)![0];
    const list = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(\[[ xX]\][ \t]+)?/u.exec(
      line.slice(quote.length),
    );
    const prefixEnd = quote.length + (list ? list[0].length : 0);
    if (caretInLine < prefixEnd) return undefined;

    const body = line.slice(prefixEnd);
    if (quote.length > 0 || list) {
      if (body.trim().length === 0) {
        return {
          start: lineStart,
          end: lineEnd,
          text: "",
          selectionStart: lineStart,
          selectionEnd: lineStart,
        };
      }
    }
    if (list) {
      const marker = list[2];
      const numbered = /^(\d+)([.)])$/u.exec(marker);
      const nextMarker = numbered ? String(Number(numbered[1]) + 1) + numbered[2] : marker;
      const task = list[4] ? "[ ] " : "";
      return insertion(quote + list[1] + nextMarker + list[3] + task);
    }
    if (quote.length > 0) return insertion(quote);
    const indent = /^[ \t]*/u.exec(line)![0];
    if (indent.length > 0 && caretInLine >= indent.length) return insertion(indent);
    return undefined;
  }

  /**
   * Returns the edit that Tab (or Shift+Tab when `outdent`) should apply to the lines touched by
   * the selection. List lines move by their marker width, other lines by 4 spaces; a collapsed
   * caret on a non-list line inserts 4 spaces at the caret. Returns `undefined` when an outdent
   * has nothing to remove.
   */
  function indentSelection(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    outdent: boolean,
  ): TextEdit | undefined {
    if (selectionStart < 0 || selectionEnd > value.length || selectionStart > selectionEnd) {
      return undefined;
    }
    const firstStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    // A non-empty selection that ends at a line start does not include that last line.
    const probe =
      selectionEnd > selectionStart && value.charAt(selectionEnd - 1) === "\n"
        ? selectionEnd - 1
        : selectionEnd;
    const lastBreak = value.indexOf("\n", probe);
    const lastEnd = lastBreak === -1 ? value.length : lastBreak;

    const lines = value.slice(firstStart, lastEnd).split("\n");
    const listPattern = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+/u;
    const changes: { at: number; remove: number; insert: string }[] = [];
    const out: string[] = [];
    let offset = firstStart;
    for (const line of lines) {
      const quote = /^(?:[ \t]*>[ \t]?)*/u.exec(line)![0];
      const rest = line.slice(quote.length);
      const list = listPattern.exec(rest);
      const unit = list ? list[0].length - /^[ \t]*/u.exec(list[0])![0].length : 4;
      const at = offset + quote.length;
      if (!outdent) {
        const spaces = " ".repeat(unit);
        changes.push({ at, remove: 0, insert: spaces });
        out.push(quote + spaces + rest);
      } else {
        let remove = 0;
        while (remove < unit && rest.charAt(remove) === " ") remove += 1;
        if (remove === 0 && rest.charAt(0) === "\t") remove = 1;
        changes.push({ at, remove, insert: "" });
        out.push(quote + rest.slice(remove));
      }
      offset += line.length + 1;
    }

    if (outdent && changes.every((change) => change.remove === 0)) return undefined;

    // Collapsed caret on a non-list line: insert the spaces at the caret, not at the line start.
    if (!outdent && selectionStart === selectionEnd && lines.length === 1) {
      const quote = /^(?:[ \t]*>[ \t]?)*/u.exec(lines[0])![0];
      if (!listPattern.test(lines[0].slice(quote.length))) {
        return {
          start: selectionStart,
          end: selectionStart,
          text: "    ",
          selectionStart: selectionStart + 4,
          selectionEnd: selectionStart + 4,
        };
      }
    }

    const shift = (position: number): number => {
      let result = position;
      for (const change of changes) {
        if (position >= change.at + change.remove) {
          result += change.insert.length - change.remove;
        } else if (position > change.at) {
          result -= position - change.at;
        }
      }
      return result;
    };

    return {
      start: firstStart,
      end: lastEnd,
      text: out.join("\n"),
      selectionStart: shift(selectionStart),
      selectionEnd: shift(selectionEnd),
    };
  }

  /**
   * Returns the edit that typing a Markdown emphasis marker (`*`, `_`, backtick or `~`) applies
   * to a non-empty selection: the marker goes on both sides and the text stays selected, so
   * typing the marker again wraps once more. Returns `undefined` for anything else, which leaves
   * the key to the native textarea.
   */
  function wrapSelection(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    marker: string,
  ): TextEdit | undefined {
    if (marker.length !== 1 || !"*_`~".includes(marker)) return undefined;
    if (selectionStart < 0 || selectionEnd > value.length || selectionStart >= selectionEnd) {
      return undefined;
    }
    return {
      start: selectionStart,
      end: selectionEnd,
      text: marker + value.slice(selectionStart, selectionEnd) + marker,
      selectionStart: selectionStart + 1,
      selectionEnd: selectionEnd + 1,
    };
  }

  /**
   * Maps a click in the rendered text to a caret offset in the Markdown `source`. `before` and
   * `after` are the rendered characters on each side of the click. Returns `undefined` when no
   * unique match exists, so the caller can fall back to the end of the block.
   */
  function mapRenderedCaret(source: string, before: string, after: string): number | undefined {
    const projected: string[] = [];
    const indexMap: number[] = [];
    const push = (char: string, index: number): void => {
      if (/\s/u.test(char)) {
        if (projected.length > 0 && projected[projected.length - 1] === " ") return;
        projected.push(" ");
      } else {
        projected.push(char);
      }
      indexMap.push(index);
    };
    let offset = 0;
    for (const line of source.split("\n")) {
      let i = 0;
      const quote = /^(?:[ \t]*>[ \t]?)*/u.exec(line)![0];
      i = quote.length;
      const marker = /^[ \t]*(?:#{1,6}[ \t]+|(?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)/u.exec(
        line.slice(i),
      );
      if (marker) i += marker[0].length;
      while (i < line.length) {
        const char = line.charAt(i);
        if (char === "]" && line.charAt(i + 1) === "(") {
          const close = line.indexOf(")", i + 2);
          if (close !== -1) {
            i = close + 1;
            continue;
          }
        }
        if ("*_`~[]".includes(char)) {
          i += 1;
          continue;
        }
        if (char === "\r") {
          i += 1;
          continue;
        }
        push(char, offset + i);
        i += 1;
      }
      push("\n", offset + line.length);
      offset += line.length + 1;
    }
    const text = projected.join("");
    const collapse = (value: string): string => value.replace(/\s+/gu, " ");
    const b = collapse(before);
    const a = collapse(after);

    const find = (needle: string): number | undefined => {
      if (needle.length === 0) return undefined;
      const first = text.indexOf(needle);
      if (first === -1 || text.indexOf(needle, first + 1) !== -1) return undefined;
      return first;
    };
    // Source offset right after the projected character at `index`.
    const afterChar = (index: number): number => indexMap[index] + 1;
    const atChar = (index: number): number =>
      index < indexMap.length ? indexMap[index] : source.length;

    let hit = find(b + a);
    if (hit !== undefined) return b.length > 0 ? afterChar(hit + b.length - 1) : atChar(hit);
    const bTail = b.slice(-12);
    const aHead = a.slice(0, 12);
    hit = find(bTail + aHead);
    if (hit !== undefined) {
      return bTail.length > 0 ? afterChar(hit + bTail.length - 1) : atChar(hit);
    }
    hit = find(bTail);
    if (hit !== undefined) return afterChar(hit + bTail.length - 1);
    hit = find(aHead);
    if (hit !== undefined) return atChar(hit);
    return undefined;
  }

  /**
   * Makes an edit safe for a Markdown table cell: an unescaped `|` in the inserted text gets a
   * backslash (one already escaped, or preceded by an escaping backslash in the cell, stays as it
   * is) and every line break becomes a space. The selection moves with the characters it sat on.
   */
  function cellSafeEdit(value: string, edit: TextEdit): TextEdit {
    const before = value.slice(0, edit.start);
    const clean = (prefix: string): string => {
      let result = "";
      for (let index = 0; index < prefix.length; index += 1) {
        const character = prefix[index];
        if (character === "\r" || character === "\n") {
          if (character === "\r" && prefix[index + 1] === "\n") index += 1;
          result += " ";
        } else if (character === "|") {
          const preceding = before + result;
          let backslashes = 0;
          for (let back = preceding.length - 1; back >= 0 && preceding[back] === "\\"; back -= 1) {
            backslashes += 1;
          }
          result += backslashes % 2 === 1 ? "|" : "\\|";
        } else {
          result += character;
        }
      }
      return result;
    };
    const text = clean(edit.text);
    if (text === edit.text) return edit;
    const moved = (offset: number): number => {
      if (offset <= edit.start) return offset;
      if (offset >= edit.start + edit.text.length) return offset + text.length - edit.text.length;
      return edit.start + clean(edit.text.slice(0, offset - edit.start)).length;
    };
    return {
      start: edit.start,
      end: edit.end,
      text,
      selectionStart: moved(edit.selectionStart),
      selectionEnd: moved(edit.selectionEnd),
    };
  }

  return { continueOnEnter, indentSelection, wrapSelection, mapRenderedCaret, cellSafeEdit };
}
