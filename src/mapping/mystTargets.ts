/**
 * Pure helpers behind the MyST reference and citation pickers: the `(label)=` targets of a
 * document, the keys of BibTeX text and the `{doc}` path of a picked file. Everything is bounded:
 * a long document or a huge `.bib` file yields a capped list, never an unbounded one. This module
 * must not import `vscode`.
 */

import * as path from "node:path";

import { isValidLabelName } from "./labelRename";

export const MAX_TARGETS = 500;
export const MAX_BIB_KEYS = 1000;
const MAX_TITLE_LENGTH = 80;

export interface DocumentTarget {
  name: string;
  /** 1-based source line of the `(name)=` line. */
  line: number;
  /** The heading, or the first text line, that follows the label. */
  title?: string;
}

export interface BibKey {
  key: string;
  title?: string;
}

const LABEL_LINE = /^[ \t]*\(([^()\s]+)\)=[ \t]*$/u;
const FENCE_LINE = /^[ \t]{0,3}(`{3,}|~{3,})/u;
const HEADING_LINE = /^[ \t]{0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/u;

function clip(text: string): string {
  const flat = text.replace(/\s+/gu, " ").trim();
  return flat.length > MAX_TITLE_LENGTH ? flat.slice(0, MAX_TITLE_LENGTH - 1) + "…" : flat;
}

/** The `(label)=` targets outside code fences, in source order, at most `MAX_TARGETS`. */
export function documentTargets(text: string): { items: DocumentTarget[]; truncated: boolean } {
  const lines = text.split(/\r?\n/u);
  const items: DocumentTarget[] = [];
  let fence: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const marker = FENCE_LINE.exec(lines[index])?.[1];
    if (marker) {
      if (fence === undefined) fence = marker[0].repeat(marker.length);
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      continue;
    }
    if (fence !== undefined) continue;
    const name = LABEL_LINE.exec(lines[index])?.[1];
    if (name === undefined || !isValidLabelName(name)) continue;
    if (items.length >= MAX_TARGETS) return { items, truncated: true };
    let next = index + 1;
    while (next < lines.length && LABEL_LINE.test(lines[next])) next += 1;
    const following = next < lines.length ? lines[next] : "";
    const title = clip(HEADING_LINE.exec(following)?.[1] ?? following);
    items.push({ name, line: index + 1, ...(title ? { title } : {}) });
  }
  return { items, truncated: false };
}

const BIB_ENTRY = /^[ \t]*@([A-Za-z]+)[ \t]*[{(][ \t]*([^,\s{}()]+)[ \t]*,/u;
const BIB_TITLE = /^[ \t]*title[ \t]*=[ \t]*[{"]+(.*?)[}"]*[ \t]*,?[ \t]*$/iu;
const BIB_SKIPPED = new Set(["comment", "string", "preamble"]);

/** Citation keys of BibTeX text, with the entry title when its own line is found. */
export function bibKeys(text: string): BibKey[] {
  const found: BibKey[] = [];
  let current: BibKey | undefined;
  for (const line of text.split(/\r?\n/u)) {
    const entry = BIB_ENTRY.exec(line);
    if (entry) {
      current = BIB_SKIPPED.has(entry[1].toLowerCase()) ? undefined : { key: entry[2] };
      if (current) {
        found.push(current);
        const inline = /\btitle[ \t]*=[ \t]*[{"]+([^{}"]*)/iu.exec(line);
        if (inline?.[1].trim()) current.title = clip(inline[1]);
      }
      continue;
    }
    const title = current && current.title === undefined ? BIB_TITLE.exec(line)?.[1] : undefined;
    if (current && title) current.title = clip(title.replace(/[{}]/gu, ""));
  }
  return found;
}

/** Keys of several `.bib` texts: no duplicates, sorted, at most `MAX_BIB_KEYS`. */
export function collectBibKeys(texts: readonly string[]): { items: BibKey[]; truncated: boolean } {
  const byKey = new Map<string, BibKey>();
  for (const text of texts) {
    for (const entry of bibKeys(text)) if (!byKey.has(entry.key)) byKey.set(entry.key, entry);
  }
  const sorted = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key, "en"));
  return { items: sorted.slice(0, MAX_BIB_KEYS), truncated: sorted.length > MAX_BIB_KEYS };
}

/**
 * The `{doc}` path of `target` seen from `from`: relative, POSIX separators, no extension. A path
 * a role cannot hold (backtick, angle brackets, line break) gives `undefined`.
 */
export function docReference(from: string, target: string): string | undefined {
  const windows = from.includes("\\") || target.includes("\\");
  const flavour = windows ? path.win32 : path.posix;
  const rawRelative = flavour.relative(flavour.dirname(from), target);
  // Another Windows drive has no relative path: relative() returns the absolute target.
  if (flavour.isAbsolute(rawRelative)) return undefined;
  const relative = rawRelative.split(flavour.sep).join("/");
  const withoutExtension = relative.replace(/\.(?:md|markdown)$/iu, "");
  if (withoutExtension === "" || /[`<>\r\n]/u.test(withoutExtension)) return undefined;
  return withoutExtension;
}
