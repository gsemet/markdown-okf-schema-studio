/**
 * The source pass that rewrites GitHub alert blockquotes (`> [!NOTE]`, `> **Note**`) into MyST
 * admonitions before parsing, leaving fenced code untouched, and the tree pass that maps the lines
 * of the rewritten text back to the lines of the document.
 */

import { advanceFence } from "../syntax/markdownSyntax";
import type { MystNode } from "./mystNode";

const GITHUB_ALERT_TYPES = new Map([
  ["NOTE", "note"],
  ["TIP", "tip"],
  ["IMPORTANT", "important"],
  ["WARNING", "warning"],
  ["CAUTION", "caution"],
]);

const ALERT_MARKER = /^(\s*)>\s*\[!([A-Za-z]+)\](?:[ \t]+(\S(?:.*?\S)?))?[ \t]*$/u;
const GITHUB_BOLD_ALERT_MARKER = /^(\s*)>\s*\*\*(Note|Important|Warning)\*\*[ \t]*$/iu;

function stripQuote(line: string): string {
  return line.replace(/^\s*>\s?/u, "");
}

/** The rewritten text and, when an alert was rewritten, where each of its lines comes from. */
export interface ExpandedGithubAlerts {
  readonly text: string;
  /**
   * For each line of `text`, the one-based line of the input it comes from; `undefined` when no
   * alert was rewritten (the lines are the input's). The admonition's opening and `:class:` lines
   * come from the marker line, its closing line from the alert's last line.
   */
  readonly sourceLines: readonly number[] | undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-009
/** Rewrites alert blockquotes, including optional titles, into MyST admonitions. */
export function expandGithubAlertsWithLines(text: string): ExpandedGithubAlerts {
  const lines = text.split(/\r?\n/u);
  const output: string[] = [];
  const sourceLines: number[] = [];
  let rewritten = false;
  let fence: string | undefined;
  /** Appends output lines that come from the zero-based input line `from`. */
  const push = (from: number, ...added: string[]): void => {
    for (const line of added) {
      output.push(line);
      sourceLines.push(from + 1);
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const wasInFence = fence !== undefined;
    fence = advanceFence(line, fence);
    if (wasInFence || fence !== undefined) {
      push(index, line);
      continue;
    }

    const alertMarker = line.match(ALERT_MARKER);
    const boldMarker = line.match(GITHUB_BOLD_ALERT_MARKER);
    const marker = alertMarker ?? boldMarker;
    const kind = alertMarker
      ? GITHUB_ALERT_TYPES.get(alertMarker[2].toUpperCase())
      : boldMarker ? GITHUB_ALERT_TYPES.get(boldMarker[2].toUpperCase()) : undefined;
    if (!marker || !kind) {
      push(index, line);
      continue;
    }

    rewritten = true;
    const indent = marker[1];
    const title = alertMarker?.[3];
    push(index, `${indent}:::{${kind}}${title ? ` ${title}` : ""}`, `${indent}:class: simple`);
    let cursor = index + 1;
    while (cursor < lines.length && /^\s*>/u.test(lines[cursor])) {
      push(cursor, indent + stripQuote(lines[cursor]));
      cursor += 1;
    }
    // The admonition ends on the alert's last line: its closing fence (and the blank line added
    // before an unquoted line) map there.
    const last = cursor - 1;
    if (cursor < lines.length && lines[cursor].trim() === "") {
      push(last, `${indent}:::`);
    } else {
      push(last, `${indent}:::`, "");
      cursor -= 1;
    }
    index = cursor;
  }

  return { text: output.join("\n"), sourceLines: rewritten ? sourceLines : undefined };
}

/** Rewrites alert blockquotes, including optional titles, into MyST admonitions. */
export function expandGithubAlerts(text: string): string {
  return expandGithubAlertsWithLines(text).text;
}

/**
 * The function from a line of the tree parsed from `expanded.text` to the line of the input text.
 * `firstLine` is the tree's number of the first line of the text (1 when the tree counts from the
 * text, the frontmatter lines plus one when it counts from the whole file); lines before it are
 * kept, lines after the text keep their distance to its last line.
 */
export function alertLineMapper(expanded: ExpandedGithubAlerts, firstLine = 1): (line: number) => number {
  const sourceLines = expanded.sourceLines;
  if (!sourceLines || sourceLines.length === 0) return (line) => line;
  const shift = firstLine - 1;
  return (line) => {
    const index = line - shift;
    if (index < 1) return line;
    const known = Math.min(index, sourceLines.length);
    return sourceLines[known - 1]! + (index - known) + shift;
  };
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-009
/**
 * Maps the source lines of a tree parsed from `expanded.text` back to the lines of the input
 * text (see `alertLineMapper`): the positions of every node and the `data-line` /
 * `data-end-line` attributes a pass has already set.
 */
export function mapAlertSourceLines(root: MystNode, expanded: ExpandedGithubAlerts, firstLine = 1): void {
  if (!expanded.sourceLines) return;
  const map = alertLineMapper(expanded, firstLine);
  const visit = (node: MystNode): void => {
    if (node.position?.start?.line !== undefined) {
      node.position.start.line = map(node.position.start.line);
    }
    if (node.position?.end?.line !== undefined) {
      node.position.end.line = map(node.position.end.line);
    }
    const properties = node.data?.hProperties as Record<string, unknown> | undefined;
    for (const name of ["data-line", "data-end-line"]) {
      const value = properties?.[name];
      if (properties && typeof value === "number") {
        properties[name] = map(value);
      }
    }
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(root);
}
