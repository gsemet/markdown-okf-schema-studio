/**
 * Small document rules shared by the session controllers: which documents a preview shows, path
 * containment, and the revision a render stage carries. Host-neutral (documents come from the
 * `DocumentStore` port).
 */

import * as path from "node:path";

import { READ_ONLY_FILE } from "../core/edits/readOnlyReasons";
import type { TextEdit } from "../core/edits/textEdit";
import type { ApplyEditOptions, DocumentStore, HostDocument } from "../host-api/documentStore";
import type { PageIdentity } from "../core/protocol/envelope";
import type { Revision } from "../core/protocol/revision";
import type { RenderStage } from "../core/render/renderPipeline";
import type { PreviewSession } from "./previewSession";

/** True when `candidate` is `root` or below it (no `..` escape, same drive). */
export function isPathWithin(root: string | undefined, candidate: string): boolean {
  if (!root) {
    return false;
  }
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** A preview shows saved Markdown files only: a file document with the `.md` extension. */
export function isDocumentEligible(document: HostDocument): boolean {
  return document.path !== undefined && path.extname(document.path).toLowerCase() === ".md";
}

/** The protocol revision of the document text a render stage was made from. */
export function revisionOfStage(stage: RenderStage): Revision {
  return stage.activeDocumentRevision;
}

/** Characters of a file name that a watcher glob would read as a pattern, escaped. */
export function globLiteral(name: string): string {
  return name.replace(/[\[\]{}*?]/gu, (character) => `[${character}]`);
}

/**
 * The document of a preview when a page message about it is current: the page names the revision
 * the host holds, the render shows that revision, and the document is still an eligible file.
 */
export function currentPreviewDocument(
  preview: PreviewSession,
  message: Pick<PageIdentity, "revision">,
): HostDocument | undefined {
  const document = preview.document;
  const stage = preview.stage;
  if (
    !document
    || !stage
    || document.id !== preview.documentUri
    || document.revision !== message.revision
    || stage.activeDocumentRevision !== document.revision
    || !isDocumentEligible(document)
  ) {
    return undefined;
  }
  return document;
}

// @implements_req SwRS-MDOKFSTUDIO-TRUST-065
/**
 * The document of a palette request (labels, citations, document and image pickers). Like
 * {@link currentPreviewDocument}, but while the page's block editor is open on the render the
 * request names, the document revision the editor's own saves produced is accepted: the preview
 * only refreshes when the editor closes, so insisting on the render revision would refuse every
 * request after the first autosave.
 */
export function currentPaletteDocument(
  preview: PreviewSession,
  message: Pick<PageIdentity, "revision">,
): HostDocument | undefined {
  const document = preview.document;
  const stage = preview.stage;
  const edit = preview.edits.active;
  if (
    edit
    && document
    && stage
    && edit.documentId === preview.documentUri
    && edit.revision === message.revision
    && stage.activeDocumentRevision === message.revision
    && document.id === preview.documentUri
    && isDocumentEligible(document)
  ) {
    return document;
  }
  return currentPreviewDocument(preview, message);
}

// @implements_req SwRS-MDOKFSTUDIO-TRUST-001
/**
 * Applies edits and checks that they were written. VS Code accepts an edit of a read-only file
 * (`files.readonlyInclude`, or made read-only in the session) and changes nothing: the answer is
 * then a rejection with the read-only reason, so every writer is told. An edit that changes no text
 * is never read as a refusal.
 */
export function applyWrittenEdits(
  documents: DocumentStore,
  document: HostDocument,
  edits: readonly TextEdit[],
  options?: ApplyEditOptions,
): PromiseLike<boolean> {
  const before = document.getText();
  const changes = edits.some((edit) => before.slice(edit.start, edit.end) !== edit.text);
  return documents.applyEdits(document, edits, options).then((applied) => {
    if (applied && changes && document.getText() === before) throw new Error(READ_ONLY_FILE);
    return applied;
  });
}
