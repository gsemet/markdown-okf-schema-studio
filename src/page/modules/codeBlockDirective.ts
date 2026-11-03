/**
 * Reading and writing a MyST `{code-block}` directive for the code-block form: the language (the
 * argument), the options (`:linenos:`, `:emphasize-lines:`, `:caption:`, `:name:` and any other,
 * kept in their order) and the code. Untouched parts are written back byte for byte: an option
 * keeps its original line until its value changes, and the code is never rewritten. A `---` YAML
 * option block is not understood: `parse` refuses it and the text box stays the way to edit it.
 *
 * Pure text, no DOM.
 */

import type { TextEdit } from "./textEditing";

export interface CodeBlockOption {
  name: string;
  value: string;
  /** The original line (without indent); dropped when the value changes. */
  raw?: string;
}

export interface CodeBlockModel {
  /** Whitespace in front of the fence; every line of the directive carries it. */
  indent: string;
  /** The opening fence; empty for a new directive (chosen to outgrow the code when written). */
  fence: string;
  language: string;
  /** The opening line as read (without indent) and the language it held; reused while unchanged. */
  headRaw: string;
  originalLanguage: string;
  options: CodeBlockOption[];
  /** Blank lines between the options (or the head line) and the code. */
  gap: number;
  /** The code as read, trailing blank lines included. */
  bodyLines: string[];
  /** False when the text ended before the closing fence. */
  closed: boolean;
  originalOptionCount: number;
}

export interface CodeBlockValues {
  language: string;
  linenos: boolean;
  emphasizeLines: string;
  caption: string;
  name: string;
}

export interface CodeBlockTools {
  parse(text: string): CodeBlockModel | undefined;
  serialize(model: CodeBlockModel): string;
  /** Writes the form values into a model: only changed options lose their original line. */
  applyValues(model: CodeBlockModel, values: CodeBlockValues): CodeBlockModel;
  valuesOf(model: CodeBlockModel): CodeBlockValues;
  /** A directive to insert: no options, `bodyLines` as the code (one empty line when none). */
  newModel(language: string, bodyLines: string[]): CodeBlockModel;
  /** The range of the directive that holds `caret` (the outermost one), or undefined. */
  locate(text: string, caret: number): { start: number; end: number } | undefined;
  /** The edit that inserts `model` at the selection (wrapping the touched lines when not empty). */
  insertion(value: string, selectionStart: number, selectionEnd: number, model: CodeBlockModel): TextEdit;
  /** Field name to message; empty when the values can be written. */
  validate(values: CodeBlockValues): Record<string, string>;
}

export function createCodeBlockTools(): CodeBlockTools {
  const openPattern = /^([ \t]*)(:{3,}|`{3,}|~{3,})[ \t]*\{code-block\}[ \t]*(.*?)[ \t]*$/u;
  const optionPattern = /^:([A-Za-z][\w-]*):[ \t]*(.*?)[ \t]*$/u;
  const languagePattern = /^[\w+#.-]*$/u;
  const linesPattern = /^\d+(?:-\d+)?(?:[ \t]*,[ \t]*\d+(?:-\d+)?)*$/u;

  const blank = (line: string): boolean => line.trim() === "";

  /** The line index of the closing fence of an opening fence at `from`, or -1. */
  function closingLine(lines: string[], from: number, fence: string): number {
    const character = fence.charAt(0);
    for (let index = from + 1; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (trimmed.length >= fence.length && trimmed.split(character).join("") === "") return index;
    }
    return -1;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-272
  function parse(text: string): CodeBlockModel | undefined {
    const lines = text.split("\n");
    let first = 0;
    while (first < lines.length && blank(lines[first])) first += 1;
    const open = openPattern.exec(lines[first] ?? "");
    if (!open) return undefined;
    const indent = open[1];
    const close = closingLine(lines, first, open[2]);
    const inner = lines.slice(first + 1, close >= 0 ? close : lines.length).map((line) =>
      line.startsWith(indent) ? line.slice(indent.length) : line.trimStart());
    if (inner.length > 0 && inner[0].trim() === "---") return undefined;
    const options: CodeBlockOption[] = [];
    let index = 0;
    while (index < inner.length) {
      const option = optionPattern.exec(inner[index]);
      if (!option) break;
      options.push({ name: option[1], value: option[2], raw: inner[index] });
      index += 1;
    }
    let gap = 0;
    while (index < inner.length && blank(inner[index])) {
      gap += 1;
      index += 1;
    }
    return {
      indent, fence: open[2], language: open[3], headRaw: lines[first].slice(indent.length),
      originalLanguage: open[3], options, gap, bodyLines: inner.slice(index), closed: close >= 0,
      originalOptionCount: options.length,
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-272
  function serialize(model: CodeBlockModel): string {
    // A new directive, or code holding a fence run, needs a fence that is longer than every run.
    const character = model.fence === "" ? "`" : model.fence.charAt(0);
    let fence = model.fence === "" ? "```" : model.fence;
    for (const line of model.bodyLines) {
      const trimmed = line.trim();
      let run = 0;
      while (trimmed.charAt(run) === character) run += 1;
      if (run >= 3 && run >= fence.length) fence = character.repeat(run + 1);
    }
    const head = model.headRaw !== "" && fence === model.fence && model.language === model.originalLanguage
      ? model.headRaw
      : fence + "{code-block}" + (model.language !== "" ? " " + model.language : "");
    const lines: string[] = [head];
    for (const option of model.options) {
      lines.push(option.raw ?? ":" + option.name + ":" + (option.value !== "" ? " " + option.value : ""));
    }
    if (model.bodyLines.length > 0) {
      const gap = model.options.length !== model.originalOptionCount ? Math.max(model.gap, 1) : model.gap;
      for (let count = 0; count < gap; count += 1) lines.push("");
      lines.push(...model.bodyLines);
    }
    if (model.closed) lines.push(fence);
    return lines.map((line, position) =>
      position === 0 || line !== "" ? model.indent + line : line).join("\n");
  }

  function optionOf(model: CodeBlockModel, name: string): CodeBlockOption | undefined {
    return model.options.find((option) => option.name === name);
  }

  function valuesOf(model: CodeBlockModel): CodeBlockValues {
    return {
      language: model.language,
      linenos: optionOf(model, "linenos") !== undefined,
      emphasizeLines: optionOf(model, "emphasize-lines")?.value ?? "",
      caption: optionOf(model, "caption")?.value ?? "",
      name: optionOf(model, "name")?.value ?? "",
    };
  }

  /** Sets an option to `value`, adds it when new, removes it when `present` is false. */
  function setOption(model: CodeBlockModel, name: string, value: string, present: boolean): void {
    const existing = optionOf(model, name);
    if (!present) {
      if (existing) model.options.splice(model.options.indexOf(existing), 1);
      return;
    }
    if (!existing) {
      model.options.push({ name, value });
    } else if (existing.value !== value) {
      existing.value = value;
      existing.raw = undefined;
    }
  }

  function applyValues(model: CodeBlockModel, values: CodeBlockValues): CodeBlockModel {
    const next: CodeBlockModel = {
      ...model, options: model.options.map((option) => ({ ...option })), language: values.language.trim(),
    };
    setOption(next, "linenos", "", values.linenos);
    for (const [name, value] of [
      ["emphasize-lines", values.emphasizeLines], ["caption", values.caption], ["name", values.name],
    ]) setOption(next, name, value.trim(), value.trim() !== "");
    return next;
  }

  function newModel(language: string, bodyLines: string[]): CodeBlockModel {
    return {
      indent: "", fence: "", language, headRaw: "", originalLanguage: "", options: [], gap: 0,
      bodyLines: bodyLines.length > 0 ? bodyLines : [""], closed: true, originalOptionCount: 0,
    };
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-272
  function locate(text: string, caret: number): { start: number; end: number } | undefined {
    const lines = text.split("\n");
    let start = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const open = openPattern.exec(lines[index]);
      const close = open ? closingLine(lines, index, open[2]) : -1;
      const last = open ? (close >= 0 ? close : lines.length - 1) : index;
      const end = start + lines.slice(index, last + 1).join("\n").length;
      if (open && caret >= start && caret <= end) return { start, end };
      // The code of a directive is literal: a directive written in it is not looked at.
      if (open) {
        start = end + 1;
        index = last;
      } else {
        start += lines[index].length + 1;
      }
    }
    return undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-272
  function insertion(value: string, selectionStart: number, selectionEnd: number, model: CodeBlockModel): TextEdit {
    const firstStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const probe = selectionEnd > selectionStart && value.charAt(selectionEnd - 1) === "\n"
      ? selectionEnd - 1
      : selectionEnd;
    const lastBreak = value.indexOf("\n", probe);
    const lastEnd = lastBreak === -1 ? value.length : lastBreak;
    const touched = value.slice(firstStart, lastEnd);
    const wrap = selectionStart !== selectionEnd;
    const written = serialize(wrap ? { ...model, bodyLines: touched.split("\n") } : model);
    const lines = written.split("\n");
    // The caret goes to the first line of the code.
    const codeLine = 1 + model.options.length + (model.options.length > 0 ? Math.max(model.gap, 1) : model.gap);
    const caretIn = lines.slice(0, codeLine).reduce((sum, line) => sum + line.length + 1, 0);
    if (wrap || touched.trim() === "") {
      const caret = firstStart + caretIn;
      return { start: firstStart, end: lastEnd, text: written, selectionStart: caret, selectionEnd: caret };
    }
    const caret = lastEnd + 2 + caretIn;
    return { start: lastEnd, end: lastEnd, text: "\n\n" + written, selectionStart: caret, selectionEnd: caret };
  }

  function validate(values: CodeBlockValues): Record<string, string> {
    const problems: Record<string, string> = {};
    if (!languagePattern.test(values.language.trim())) problems.language = "Use one word, for example python or c++.";
    const lines = values.emphasizeLines.trim();
    if (lines !== "" && !linesPattern.test(lines)) problems.emphasizeLines = "Use line numbers and ranges, for example 1,3-5.";
    if (/[\r\n]/u.test(values.caption)) problems.caption = "The caption is one line.";
    if (/[\r\n]/u.test(values.name)) problems.name = "The name is one line.";
    return problems;
  }

  return { parse, serialize, applyValues, valuesOf, newModel, locate, insertion, validate };
}
