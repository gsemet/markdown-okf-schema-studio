/**
 * Puts the data files of a chart into its spec as inline `values`. The page cannot let Vega parse
 * CSV or TSV: its parser (d3-dsv) builds row readers with `new Function`, which the page's
 * Content Security Policy forbids. So the files the host read (see `chartData.ts`) are parsed here
 * and the spec Vega sees has no `url` left. Pure module: no host API, no DOM, no Node built-ins.
 */

import { type ChartFiles, isRemoteDataUrl } from "./chartData";

type Row = Record<string, unknown>;

/** Rows of delimited text: the first record names the columns; numbers and booleans are typed. */
export function parseDelimited(text: string, delimiter: string): Row[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const endRecord = (): void => {
    record.push(field);
    field = "";
    if (record.length > 1 || record[0] !== "") records.push(record);
    record = [];
  };
  for (let at = 0; at < input.length; at += 1) {
    const char = input[at]!;
    if (quoted) {
      if (char === '"' && input[at + 1] === '"') { field += '"'; at += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) { record.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[at + 1] === "\n") at += 1;
      endRecord();
    } else field += char;
  }
  if (field !== "" || record.length > 0) endRecord();
  const [header, ...rows] = records;
  if (!header) return [];
  return rows.map((cells) => Object.fromEntries(header.map((name, index) => [name, typed(cells[index] ?? "")])));
}

function typed(cell: string): unknown {
  const value = cell.trim();
  if (value === "") return null;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return cell;
}

function dataFormat(url: string, format: unknown): { type: string; delimiter?: string } {
  const given = format as { type?: unknown; delimiter?: unknown } | null | undefined;
  if (typeof given?.type === "string") {
    return { type: given.type, ...(typeof given.delimiter === "string" ? { delimiter: given.delimiter } : {}) };
  }
  const extension = /\.([a-z0-9]+)$/iu.exec(url.split(/[?#]/u)[0] ?? "")?.[1]?.toLowerCase();
  return { type: extension === "csv" || extension === "tsv" ? extension : "json" };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-122
/**
 * A copy of `spec` whose data sources name no `url`: each one holds the rows of its file as
 * `values`. Throws the message to show when a file was refused, was never read, or is remote.
 */
export function inlineChartFiles(spec: Record<string, unknown>, chart: Partial<ChartFiles>): Record<string, unknown> {
  const files = chart.files ?? {};
  const errors = chart.errors ?? {};
  const copy = structuredClone(spec);
  const inline = (source: unknown): void => {
    const entry = source as { url?: unknown; values?: unknown; format?: unknown } | null;
    if (entry === null || typeof entry !== "object" || typeof entry.url !== "string") return;
    const url = entry.url.trim();
    if (Object.hasOwn(errors, url)) throw new Error(errors[url]);
    if (isRemoteDataUrl(url)) {
      throw new Error(`Remote chart data is not loaded: ${url}. Use inline values or a file next to the document.`);
    }
    if (!Object.hasOwn(files, url)) throw new Error(`Chart data file ${url} was not read by the preview.`);
    const text = files[url]!;
    const format = dataFormat(url, entry.format);
    const rest = { ...(entry.format as Record<string, unknown> | undefined) };
    delete entry.url;
    if (format.type === "csv" || format.type === "tsv" || format.type === "dsv") {
      entry.values = parseDelimited(text, format.delimiter ?? (format.type === "tsv" ? "\t" : ","));
      delete rest.type;
      delete rest.delimiter;
      if (Object.keys(rest).length > 0) entry.format = rest;
      else delete entry.format;
    } else if (format.type === "json") {
      try {
        entry.values = JSON.parse(text);
      } catch (error) {
        throw new Error(`Chart data file ${url} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
      entry.format = { ...rest, type: "json" };
    } else {
      throw new Error(`Chart data file ${url} has the format ${format.type}, which the preview does not read (csv, tsv and json are).`);
    }
  };
  const visit = (value: unknown, depth: number): void => {
    if (depth > 64 || value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "data") for (const source of Array.isArray(child) ? child : [child]) inline(source);
      visit(child, depth + 1);
    }
  };
  visit(copy, 0);
  return copy;
}
