/**
 * The source pass that rewrites GitHub alert blockquotes (`> [!NOTE]`, `> **Note**`) into MyST
 * admonitions before parsing, leaving fenced code untouched.
 */

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

interface MarkdownFence {
  marker: "`" | "~";
  length: number;
}

function openingFence(line: string): MarkdownFence | undefined {
  const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
  return marker ? { marker: marker[0] as "`" | "~", length: marker.length } : undefined;
}

function closesFence(line: string, fence: MarkdownFence): boolean {
  const marker = /^(`+|~+)[ \t]*$/u.exec(line.trimStart())?.[1];
  return Boolean(marker && marker[0] === fence.marker && marker.length >= fence.length);
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-009
/** Rewrites alert blockquotes, including optional titles, into MyST admonitions. */
export function expandGithubAlerts(text: string): string {
  const lines = text.split(/\r?\n/u);
  const output: string[] = [];
  let fence: MarkdownFence | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (fence) {
      output.push(line);
      if (closesFence(line, fence)) {
        fence = undefined;
      }
      continue;
    }

    const nextFence = openingFence(line);
    if (nextFence) {
      fence = nextFence;
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
