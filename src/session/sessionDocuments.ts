/**
 * Small document rules shared by the session controllers: which documents a preview shows, path
 * containment, and the revision a render stage carries. Host-neutral (documents come from the
 * `DocumentStore` port).
 */

import * as path from "node:path";

import type { HostDocument } from "../host-api/documentStore";
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
