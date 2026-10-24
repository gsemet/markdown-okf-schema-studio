/**
 * Reading and writing a MyST `{figure}` directive for the figure editor: the source, the options
 * (`:alt:`, `:width:`, `:align:`, `:name:` and any other, kept in their order), the caption (the
 * first paragraph of the body) and the legend (the paragraphs after it). Untouched parts are
 * written back byte for byte: an option keeps its original line until its value changes, and a
 * body whose caption and legend were not edited keeps its original text. A `---` YAML option
 * block is not understood: `parseFigure` refuses it and the text box stays the way to edit it.
 *
 * The factory is injected into the page script with `.toString()`: its body must not use anything
 * defined outside it. Pure text, no DOM.
 */

export interface FigureOption {
  name: string;
  value: string;
  /** The original line (without indent); dropped when the value changes. */
  raw?: string;
}

export interface FigureModel {
  /** Whitespace in front of the fence; every line of the directive carries it. */
  indent: string;
  /** The opening fence: `:::`, a backtick run or a tilde run. */
  fence: string;
  source: string;
  /** The opening line as read (without indent) and the source it held; reused while unchanged. */
  headRaw: string;
  originalSource: string;
  options: FigureOption[];
  /** Blank lines between the options (or the head line) and the body. */
  gap: number;
  caption: string;
  legend: string;
  /** False when the text ended before the closing fence. */
  closed: boolean;
  /** The body as read (trailing blank lines included) and what it parsed to. */
  bodyRaw: string;
  originalCaption: string;
  originalLegend: string;
  originalOptionCount: number;
}

/** What `locateFigure` finds: a figure directive, or a Markdown image alone in its paragraph. */
export interface FigureLocation {
  kind: "figure" | "image";
  start: number;
  end: number;
  /** For an image: its alt text and path. */
  alt?: string;
  source?: string;
}

export interface FigureValues {
  source: string;
  alt: string;
  caption: string;
  legend: string;
  width: string;
  align: string;
  name: string;
}

export interface FigureTools {
  parseFigure(text: string): FigureModel | undefined;
  serializeFigure(model: FigureModel): string;
  /** Writes the form values into a model: only changed options lose their original line. */
  applyValues(model: FigureModel, values: FigureValues): FigureModel;
  valuesOf(model: FigureModel): FigureValues;
  /** The figure directive that contains `caret` (the first one without `caret`), or the image. */
  locateFigure(text: string, caret?: number): FigureLocation | undefined;
  /** A figure model for a Markdown image (`![alt](path)`), to convert it. */
  modelFromImage(alt: string, source: string): FigureModel;
  validWidth(value: string): boolean;
  /** Field name to message; empty when the values can be written. */
  validate(values: FigureValues): Record<string, string>;
}

export function createFigureTools(): FigureTools {
  const widthPattern = /^\d+(?:\.\d+)?(?:px|%|em|rem)?$/u;
  const alignments = ["left", "center", "right"];
  const openPattern = /^([ \t]*)(:{3,}|`{3,}|~{3,})[ \t]*\{figure\}[ \t]*(.*?)[ \t]*$/u;
  const optionPattern = /^:([A-Za-z][\w-]*):[ \t]*(.*?)[ \t]*$/u;
  const imagePattern = /^!\[([^\]\n]*)\]\((<[^>\n]*>|[^\s()<>]*)(?:[ \t]+"[^"\n]*")?\)$/u;

  const blank = (line: string): boolean => line.trim() === "";

  function lineStarts(lines: string[]): number[] {
    const starts: number[] = [];
    let offset = 0;
    for (const line of lines) {
      starts.push(offset);
      offset += line.length + 1;
    }
    return starts;
  }

  /** The line index of the closing fence of an opening fence at `from`, or -1. */
  function closingLine(lines: string[], from: number, fence: string): number {
    const character = fence.charAt(0);
    for (let index = from + 1; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (trimmed.length >= fence.length && trimmed.split(character).join("") === "") return index;
    }
    return -1;
  }

  function validWidth(value: string): boolean {
    return widthPattern.test(value);
  }

  function parseFigure(text: string): FigureModel | undefined {
    const lines = text.split("\n");
    let first = 0;
    while (first < lines.length && blank(lines[first])) first += 1;
    const open = openPattern.exec(lines[first] ?? "");
    if (!open) return undefined;
    const indent = open[1];
    const fence = open[2];
    const close = closingLine(lines, first, fence);
    const closed = close >= 0;
    const inner = lines.slice(first + 1, closed ? close : lines.length).map((line) =>
      line.startsWith(indent) ? line.slice(indent.length) : line.trimStart());
    if (inner.length > 0 && inner[0].trim() === "---") return undefined;
    const options: FigureOption[] = [];
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
    const bodyLines = inner.slice(index);
    const bodyRaw = bodyLines.join("\n");
    const content = bodyLines.slice();
    while (content.length > 0 && blank(content[content.length - 1])) content.pop();
    let captionEnd = 0;
    while (captionEnd < content.length && !blank(content[captionEnd])) captionEnd += 1;
    let legendStart = captionEnd;
    while (legendStart < content.length && blank(content[legendStart])) legendStart += 1;
    const caption = content.slice(0, captionEnd).join("\n");
    const legend = content.slice(legendStart).join("\n");
    return {
      indent, fence, source: open[3], headRaw: lines[first].slice(indent.length),
      originalSource: open[3], options, gap, caption, legend, closed, bodyRaw,
      originalCaption: caption, originalLegend: legend, originalOptionCount: options.length,
    };
  }

  function serializeFigure(model: FigureModel): string {
    const edited = model.caption !== model.originalCaption || model.legend !== model.originalLegend;
    const body = !edited
      ? model.bodyRaw
      : model.caption + (model.legend !== "" ? "\n\n" + model.legend : "");
    const bodyLines = body === "" ? [] : body.split("\n");
    // A fence inside the caption or the legend needs an outer fence that is longer.
    const character = model.fence.charAt(0);
    let fence = model.fence;
    for (const line of bodyLines) {
      const trimmed = line.trim();
      let run = 0;
      while (trimmed.charAt(run) === character) run += 1;
      if (run >= 3 && run >= fence.length) fence = character.repeat(run + 1);
    }
    const head = model.headRaw !== "" && fence === model.fence && model.source === model.originalSource
      ? model.headRaw
      : fence + "{figure}" + (model.source !== "" ? " " + model.source : "");
    const lines: string[] = [head];
    let written = 0;
    for (const option of model.options) {
      const known = option.name === "alt" || option.name === "width"
        || option.name === "align" || option.name === "name";
      if (known && option.value === "") continue;
      lines.push(option.raw ?? ":" + option.name + ": " + option.value);
      written += 1;
    }
    if (bodyLines.length > 0) {
      const gap = written !== model.originalOptionCount ? Math.max(model.gap, 1) : model.gap;
      for (let count = 0; count < gap; count += 1) lines.push("");
      for (const line of bodyLines) lines.push(line);
    }
    if (model.closed) lines.push(fence);
    return lines.map((line, position) =>
      position === 0 || line !== "" ? model.indent + line : line).join("\n");
  }

  function optionValue(model: FigureModel, name: string): string {
    for (const option of model.options) if (option.name === name) return option.value;
    return "";
  }

  function setOption(model: FigureModel, name: string, value: string): void {
    for (const option of model.options) {
      if (option.name !== name) continue;
      if (option.value !== value) {
        option.value = value;
        option.raw = undefined;
      }
      return;
    }
    if (value !== "") model.options.push({ name, value });
  }

  function valuesOf(model: FigureModel): FigureValues {
    return {
      source: model.source,
      alt: optionValue(model, "alt"),
      caption: model.caption,
      legend: model.legend,
      width: optionValue(model, "width"),
      align: optionValue(model, "align"),
      name: optionValue(model, "name"),
    };
  }

  function applyValues(model: FigureModel, values: FigureValues): FigureModel {
    const next: FigureModel = { ...model, options: model.options.map((option) => ({ ...option })) };
    next.source = values.source.trim();
    next.caption = values.caption.trim();
    next.legend = values.legend.trim();
    if (next.caption === model.originalCaption.trim()) next.caption = model.caption;
    if (next.legend === model.originalLegend.trim()) next.legend = model.legend;
    setOption(next, "alt", values.alt.trim());
    setOption(next, "width", values.width.trim());
    setOption(next, "align", values.align.trim());
    setOption(next, "name", values.name.trim());
    return next;
  }

  function validate(values: FigureValues): Record<string, string> {
    const problems: Record<string, string> = {};
    const source = values.source.trim();
    if (source === "") problems.source = "Choose or type the image path.";
    else if (/[\r\n]/u.test(source)) problems.source = "The path is one line.";
    if (/[\r\n]/u.test(values.alt)) problems.alt = "The alt text is one line.";
    const width = values.width.trim();
    if (width !== "" && !validWidth(width)) {
      problems.width = "Use a number with px, %, em or rem, for example 60% or 300px.";
    }
    const align = values.align.trim();
    if (align !== "" && !alignments.includes(align)) problems.align = "Use left, center or right.";
    if (/[\r\n]/u.test(values.name)) problems.name = "The name is one line.";
    if (/\n[ \t]*\n/u.test(values.caption.trim())) {
      problems.caption = "The caption is one paragraph; put the others in the legend.";
    }
    if (values.caption.trim() === "" && values.legend.trim() !== "") {
      problems.legend = "A legend needs a caption.";
    }
    return problems;
  }

  function modelFromImage(alt: string, source: string): FigureModel {
    const model: FigureModel = {
      indent: "", fence: ":::", source, headRaw: "", originalSource: "", options: [], gap: 1, caption: "", legend: "", closed: true,
      bodyRaw: "", originalCaption: "", originalLegend: "", originalOptionCount: 0,
    };
    setOption(model, "alt", alt);
    return model;
  }

  function locateFigure(text: string, caret?: number): FigureLocation | undefined {
    const lines = text.split("\n");
    const starts = lineStarts(lines);
    let found: FigureLocation | undefined;
    for (let index = 0; index < lines.length; index += 1) {
      const open = openPattern.exec(lines[index]);
      if (!open) continue;
      const close = closingLine(lines, index, open[2]);
      const last = close >= 0 ? close : lines.length - 1;
      const start = starts[index];
      const end = starts[last] + lines[last].length;
      if (caret === undefined || (caret >= start && caret <= end)) {
        // The innermost directive that holds the caret wins.
        if (!found || (start >= found.start && end <= found.end)) found = { kind: "figure", start, end };
        if (caret === undefined) break;
      }
    }
    if (found || caret === undefined) return found;
    // A Markdown image alone in its paragraph.
    let line = 0;
    while (line + 1 < lines.length && starts[line + 1] <= caret) line += 1;
    let from = line;
    while (from > 0 && !blank(lines[from - 1])) from -= 1;
    let to = line;
    while (to + 1 < lines.length && !blank(lines[to + 1])) to += 1;
    const paragraph = lines.slice(from, to + 1).join("\n");
    const image = imagePattern.exec(paragraph.trim());
    if (!image || blank(lines[line])) return undefined;
    const lead = paragraph.length - paragraph.trimStart().length;
    const source = image[2].startsWith("<") ? image[2].slice(1, -1) : image[2];
    return {
      kind: "image",
      start: starts[from] + lead,
      end: starts[from] + lead + paragraph.trim().length,
      alt: image[1],
      source,
    };
  }

  return {
    parseFigure, serializeFigure, applyValues, valuesOf, locateFigure, modelFromImage,
    validWidth, validate,
  };
}
