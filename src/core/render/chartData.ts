/**
 * Data files of Vega-Lite and Vega charts. A chart names its data inline (`values`) or by a
 * relative `url`. The webview has no network (`connect-src 'none'`) and no file access, so the
 * host reads each relative file under the rules of `{include}` (see `readBoundedText`) and hands
 * the text to the page next to the chart; remote URLs are never read. Pure module: no host API,
 * no DOM, no Node built-ins.
 */

import { parse } from "yaml";

import type { MystNode } from "./mystNode";

/** The two kinds of chart the preview draws (the fence languages `vega-lite` and `vega`). */
export type ChartKind = "vega-lite" | "vega";

/** At most this many data files are read for one chart. */
export const MAX_CHART_FILES = 16;

// @implements_req SwRS-MDOKFSTUDIO-DIAG-121
/** The kind of chart a code block holds, from its fence language; undefined for other blocks. */
export function chartKindOf(node: MystNode): ChartKind | undefined {
  if (node.type !== "code") return undefined;
  const lang = node.lang?.toLowerCase();
  return lang === "vega-lite" || lang === "vega" ? lang : undefined;
}

/** True for a URL that is not a plain relative path: it has a scheme (`https:`, `file:`) or `//`. */
export function isRemoteDataUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(url.trim());
}

/** The spec of a chart block: JSON or YAML text to an object, or the reason it is no spec. */
export function parseChartSource(source: string): { ok: true; spec: Record<string, unknown> } | { ok: false; error: string } {
  if (!source.trim()) return { ok: false, error: "The chart has no specification." };
  try {
    const value: unknown = parse(source);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "A chart specification is a JSON or YAML object." };
    }
    return { ok: true, spec: value as Record<string, unknown> };
  } catch (error) {
    return { ok: false, error: `The chart specification is neither valid JSON nor valid YAML: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}` };
  }
}

/**
 * The `url` of every data source of a spec (`data: {url}` of Vega-Lite, `data: [{url}]` of Vega,
 * nested views, lookups included), in order and without duplicates.
 */
export function chartDataUrls(spec: unknown): string[] {
  const urls = new Set<string>();
  const visit = (value: unknown, depth: number): void => {
    if (depth > 64 || value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "data") {
        for (const source of Array.isArray(child) ? child : [child]) {
          const url = (source as { url?: unknown } | null)?.url;
          if (typeof url === "string" && url.trim()) urls.add(url.trim());
        }
      }
      visit(child, depth + 1);
    }
  };
  visit(spec, 0);
  return [...urls];
}

/** Why a data file is not read, for the message shown in place of the chart. */
export function describeChartFileRefusal(url: string, refusal: string): string {
  switch (refusal) {
    case "missing-resource":
      return `Chart data file not found: ${url}.`;
    case "resource-outside-root":
    case "symlink-escape":
      return `Chart data file ${url} is outside the folders the preview reads `
        + "(the workspace, or only the document's folder in Restricted Mode).";
    case "blocked-resource-scheme":
      return `Chart data file ${url} must be a relative path to a local file.`;
    case "too-large":
      return `Chart data file ${url} is larger than the preview limit.`;
    default:
      return `Chart data file ${url} could not be read.`;
  }
}

/** What the page receives with a chart: the text of each readable file, the message of each refusal. */
export interface ChartFiles {
  files: Record<string, string>;
  errors: Record<string, string>;
}
