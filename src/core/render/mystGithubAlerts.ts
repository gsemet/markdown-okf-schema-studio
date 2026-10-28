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

const COLON_OPEN = /^\s*(:{3,})(?!:)\s*\S/u;
const COLON_CLOSE = /^\s*(:{3,})[ \t]*$/u;

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
  /** The one-based lines of `text` where the admonition of a rewritten alert opens. */
  readonly alertLines: readonly number[];
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-009
/** Rewrites alert blockquotes, including optional titles, into MyST admonitions. */
export function expandGithubAlertsWithLines(text: string): ExpandedGithubAlerts {
  const lines = text.split(/\r?\n/u);
  const output: string[] = [];
  const sourceLines: number[] = [];
  const alertLines: number[] = [];
  let rewritten = false;
  let fence: string | undefined;
  /** The lengths of the colon fences (`:::{card}`) still open at the current line. */
  const colonFences: number[] = [];
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
    const colonOpen = alertMarker ? undefined : line.match(COLON_OPEN);
    const colonClose = colonOpen ? undefined : line.match(COLON_CLOSE);
    if (colonClose && colonFences.length > 0 && colonClose[1].length >= colonFences[colonFences.length - 1]) {
      colonFences.pop();
    } else if (colonOpen) {
      colonFences.push(colonOpen[1].length);
    }
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
    // A colon fence closes at the first colon line at least as long as the container's own, and
    // an inner container must be shorter than the enclosing one, so inside a colon container
    // (the shortest has three colons) the alert is a backtick directive instead: its closing
    // line cannot end the container.
    let colons = ":::";
    if (colonFences.length > 0) {
      // Longer than any backtick fence opened in the quoted body, so the body cannot close it.
      let longest = 3;
      for (let at = index + 1; at < lines.length && /^\s*>/u.test(lines[at]); at += 1) {
        const run = stripQuote(lines[at]).match(/^\s*(`{3,})/u);
        if (run) longest = Math.max(longest, run[1].length);
      }
      colons = "`".repeat(longest + 1);
    }
    alertLines.push(output.length + 1);
    push(index, `${indent}${colons}{${kind}}${title ? ` ${title}` : ""}`, `${indent}:class: simple`);
    let cursor = index + 1;
    while (cursor < lines.length && /^\s*>/u.test(lines[cursor])) {
      push(cursor, indent + stripQuote(lines[cursor]));
      cursor += 1;
    }
    // The admonition ends on the alert's last line: its closing fence (and the blank line added
    // before an unquoted line) map there.
    const last = cursor - 1;
    if (cursor < lines.length && lines[cursor].trim() === "") {
      push(last, `${indent}${colons}`);
    } else {
      push(last, `${indent}${colons}`, "");
      cursor -= 1;
    }
    index = cursor;
  }

  return { text: output.join("\n"), sourceLines: rewritten ? sourceLines : undefined, alertLines };
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
 * `data-end-line` attributes a pass has already set. The admonition of each rewritten alert is
 * flagged `githubAlert`, so the page can open the whole alert in one block editor.
 */
export function mapAlertSourceLines(root: MystNode, expanded: ExpandedGithubAlerts, firstLine = 1): void {
  if (!expanded.sourceLines) return;
  const map = alertLineMapper(expanded, firstLine);
  const alertLines = new Set(expanded.alertLines.map((line) => line + firstLine - 1));
  const visit = (node: MystNode): void => {
    if (node.type === "mystDirective" && alertLines.has(node.position?.start?.line ?? 0)) {
      for (const child of node.children ?? []) {
        if (child.type === "admonition") child.data = { ...(child.data ?? {}), githubAlert: true };
      }
    }
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
