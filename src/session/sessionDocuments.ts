/**
 * Small document rules shared by the session controllers: which documents a preview shows, path
 * containment, and the revision a render stage carries. Host-neutral (documents come from the
 * `DocumentStore` port).
 */

import * as path from "node:path";

import type { HostDocument } from "../host-api/documentStore";
import { readOnlyReason } from "../core/edits/sourceEdits";
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

/** Why a read-only preview refuses to edit: the missing workspace folder, else the missing trust. */
export function previewReadOnlyReason(preview: Pick<PreviewSession, "workspaceFolder">): string {
  return readOnlyReason(preview.workspaceFolder !== undefined);
}
