/**
 * Folding of the sections of a preview: which blocks a folded heading hides, and the fold state a
 * page keeps per document. A section is a heading and every block after it up to the next heading
 * of the same or a higher level. The fold state is a view state: it is never written to the
 * document. This module must not import `vscode`.
 */

/** Most documents whose folded headings the page state keeps (the oldest are dropped). */
export const MAX_FOLDED_DOCUMENTS = 24;

/** Folded heading keys of one document, as kept in the page state. */
export type HeadingFolds = Record<string, string[]>;

/**
 * The key of a heading: level, text and the number of earlier headings with the same level and
 * text, so two equal headings are told apart. Same shape as the keys of the table of contents.
 */
export function headingFoldKey(level: number, text: string, occurrence: number): string {
  return `${level}|${text}|${occurrence}`;
}

/** One block of the content: the level of a heading (1 to 6), or `undefined` for any other block. */
export type FoldBlock = number | undefined;

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-003
/**
 * For each block, whether a folded heading above it hides it. `folded` holds the indexes of the
 * folded headings. A folded heading stays visible; a heading inside a folded section is hidden
 * and its own fold state does not matter until the section opens.
 */
export function planHeadingFold(blocks: readonly FoldBlock[], folded: ReadonlySet<number>): boolean[] {
  const hidden: boolean[] = [];
  let hidingLevel: number | undefined;
  blocks.forEach((level, index) => {
    if (level !== undefined && hidingLevel !== undefined && level <= hidingLevel) hidingLevel = undefined;
    hidden.push(hidingLevel !== undefined);
    if (level !== undefined && hidingLevel === undefined && folded.has(index)) hidingLevel = level;
  });
  return hidden;
}

/**
 * The index after the last block of the section that starts at heading `index`: the next heading
 * of the same or a higher level, or the end of the content.
 */
export function sectionEnd(blocks: readonly FoldBlock[], index: number): number {
  const level = blocks[index];
  if (level === undefined) return index;
  let end = index + 1;
  while (end < blocks.length) {
    const next = blocks[end];
    if (next !== undefined && next <= level) break;
    end += 1;
  }
  return end;
}

/** True when the heading at `index` has at least one block in its section. */
export function hasSection(blocks: readonly FoldBlock[], index: number): boolean {
  return sectionEnd(blocks, index) > index + 1;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-004
/** The fold state of a page state: documents mapped to arrays of keys; anything else is dropped. */
export function normalizeHeadingFolds(value: unknown): HeadingFolds {
  const result: HeadingFolds = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [documentId, keys] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(keys)) continue;
    const list = keys.filter((key): key is string => typeof key === "string");
    if (list.length > 0) result[documentId] = list;
  }
  return result;
}

/**
 * The fold state with the keys of `documentId` replaced (removed when empty). The document becomes
 * the most recent entry; beyond {@link MAX_FOLDED_DOCUMENTS} the oldest documents are dropped.
 */
export function withDocumentFolds(folds: HeadingFolds, documentId: string, keys: readonly string[]): HeadingFolds {
  const { [documentId]: _previous, ...others } = folds;
  const next: HeadingFolds = keys.length > 0 ? { ...others, [documentId]: [...keys] } : others;
  const ids = Object.keys(next);
  for (const id of ids.slice(0, Math.max(0, ids.length - MAX_FOLDED_DOCUMENTS))) delete next[id];
  return next;
}
