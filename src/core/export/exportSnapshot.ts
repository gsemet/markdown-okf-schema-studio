/**
 * What the preview page sends the host to export itself (the `previewExportHtml` request): the
 * rendered content and the values the page resolved at the moment of the export. Pure module: no
 * host API, no DOM, no Node built-ins, so the page, the protocol, the builder and the tests share it.
 */

import { isBoundedString } from "../protocol/envelope";

/** The longest snapshot the host accepts, in characters of its text fields (about 50 MB). */
const MAX_EXPORT_SNAPSHOT_TRANSPORT_LENGTH = 50_000_000;

/** What the page and the host tell the user when the snapshot is over the bound. */
export const EXPORT_TOO_LARGE = "This page is too large to export.";

/** What the host tells the user when it cannot read the snapshot (a malformed shape, or another document). */
export const EXPORT_REFUSED = "Could not export the page: the host did not accept its snapshot.";

/** True when a snapshot with these text fields is over the transport bound. */
export const isExportSnapshotTooLarge = (snapshot: Pick<ExportSnapshot, "contentHtml" | "mathStyles">): boolean =>
  snapshot.contentHtml.length + snapshot.mathStyles.length > MAX_EXPORT_SNAPSHOT_TRANSPORT_LENGTH;

/** The root attributes of the preview page the export keeps (the CSS reads them) or reads. */
export const EXPORT_ROOT_ATTRIBUTES = [
  "data-sphinx-preview-theme-mode",
  "data-okf-code-dark-background",
  "data-sphinx-preview-width",
  "data-sphinx-preview-theme",
] as const;

/** A snapshot of the page: the content as the reader sees it now, with what the page resolved. */
export interface ExportSnapshot {
  /** The `outerHTML` of `main#sphinx-myst-preview-content`, taken after the pending diagrams settled. */
  contentHtml: string;
  /** The root attributes of {@link EXPORT_ROOT_ATTRIBUTES} that the page has set (name to value). */
  rootAttributes: Record<string, string>;
  /** The resolved value of every `--studio-*` token, by token name without the prefix. */
  tokens: Record<string, string>;
  /** The text of `style[data-studio-math-styles]` (the per-page math class rules); empty without math. */
  mathStyles: string;
  /** The index of the shown tab of each tab set, in document order. */
  shownTabs: number[];
}

/** True when `value` has the shape of an {@link ExportSnapshot} and fits the transport bound. */
export function isExportSnapshot(value: unknown): value is ExportSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Record<string, unknown>;
  if (!isBoundedString(snapshot.contentHtml, MAX_EXPORT_SNAPSHOT_TRANSPORT_LENGTH)
    || !isBoundedString(snapshot.mathStyles, MAX_EXPORT_SNAPSHOT_TRANSPORT_LENGTH)
    || snapshot.contentHtml.length + snapshot.mathStyles.length > MAX_EXPORT_SNAPSHOT_TRANSPORT_LENGTH) {
    return false;
  }
  const isStringRecord = (record: unknown): boolean => typeof record === "object" && record !== null
    && !Array.isArray(record)
    && Object.values(record).every((entry) => isBoundedString(entry, 10_000));
  return isStringRecord(snapshot.rootAttributes) && isStringRecord(snapshot.tokens)
    && Array.isArray(snapshot.shownTabs)
    && snapshot.shownTabs.length <= 10_000
    && snapshot.shownTabs.every((index) => Number.isSafeInteger(index) && (index as number) >= 0);
}
