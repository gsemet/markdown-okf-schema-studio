/**
 * The source pass that rewrites GitHub alert blockquotes (`> [!NOTE]`, `> **Note**`) into MyST
 * admonitions before parsing, leaving fenced code untouched.
 */

import { advanceFence } from "../syntax/markdownSyntax";

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

// @implements_req SwRS-MDOKFSTUDIO-GFM-009
/** Rewrites alert blockquotes, including optional titles, into MyST admonitions. */
export function expandGithubAlerts(text: string): string {
  const lines = text.split(/\r?\n/u);
  const output: string[] = [];
  let fence: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const wasInFence = fence !== undefined;
    fence = advanceFence(line, fence);
    if (wasInFence || fence !== undefined) {
      output.push(line);
      continue;
    }

    const alertMarker = line.match(ALERT_MARKER);
    const boldMarker = line.match(GITHUB_BOLD_ALERT_MARKER);
    const marker = alertMarker ?? boldMarker;
    const kind = alertMarker
      ? GITHUB_ALERT_TYPES.get(alertMarker[2].toUpperCase())
      : boldMarker ? GITHUB_ALERT_TYPES.get(boldMarker[2].toUpperCase()) : undefined;
    if (!marker || !kind) {
      output.push(line);
      continue;
    }

    const indent = marker[1];
    const title = alertMarker?.[3];
    output.push(`${indent}:::{${kind}}${title ? ` ${title}` : ""}`);
    output.push(`${indent}:class: simple`);
    let cursor = index + 1;
    while (cursor < lines.length && /^\s*>/u.test(lines[cursor])) {
      output.push(indent + stripQuote(lines[cursor]));
      cursor += 1;
    }
    if (cursor < lines.length && lines[cursor].trim() === "") {
      output.push(`${indent}:::`);
    } else {
      output.push(`${indent}:::`, "");
      cursor -= 1;
    }
    index = cursor;
  }

  return output.join("\n");
}
