/**
 * The host request controller: what the page asks the host for while the reader writes, without
 * editing the document itself. The copy of a code block, the palette's Reference and Citation lists,
 * the native pickers of the `{doc}` link and image buttons, and the image or rich text pasted into
 * the open block editor. Each answer repeats the request's identity (`<type>Result`).
 */

import * as path from "node:path";

import { IMAGE_EXTENSIONS, isImageFileName, relativeImageReference } from "../../core/mapping/imageReference";
import { docReference, documentTargets } from "../../core/mapping/mystTargets";
import {
  imageTypeOfMime,
  isBase64,
  MAX_PASTED_IMAGE_BYTES,
  nextImageName,
  PASTED_IMAGE_EXTENSION,
  sniffImage,
} from "../../core/mapping/pastedImage";
import { htmlToMarkdown } from "../../core/paste/htmlToMarkdown";
import type { FileSystem } from "../../host-api/fileSystem";
import { scanBibKeys } from "../bibScan";
import type { HostRequestType } from "../../core/protocol/hostToPage";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { currentPaletteDocument, isDocumentEligible, isPathWithin } from "../sessionDocuments";

/** The answer of a palette list request. */
export type HostListAnswer =
  | { ok: true; items: Array<{ value: string; label: string; detail?: string }>; truncated: boolean }
  | { ok: false; reason: string };

/** The `(label)=` targets of a text, as the palette's Reference list. */
export function targetChoices(text: string): HostListAnswer & { ok: true } {
  const { items, truncated } = documentTargets(text);
  return {
    ok: true,
    items: items.map((item) => ({ value: item.name, label: item.name, ...(item.title ? { detail: item.title } : {}) })),
    truncated,
  };
}

/**
 * Writes `bytes` as the new file `fileName` of `folderPath` so that the name never shows partial
 * bytes: a host's `writeFile` creates the file before its bytes are written (VS Code's disk
 * provider opens it with `w`, then writes), and a reader in between sees an empty file (CI run
 * 40016132398). The bytes go to a hidden file of the same folder, which is then renamed without
 * overwrite, so the name appears complete and a file another writer created in between is kept.
 * On failure the hidden file is removed and nothing is left under either name.
 */
export async function writeNewFileAtomically(
  files: FileSystem,
  folderPath: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<void> {
  const partialPath = path.join(folderPath, `.${fileName}.${Math.random().toString(36).slice(2, 10)}.partial`);
  let placed = false;
  try {
    await files.writeFile(partialPath, bytes);
    await files.rename(partialPath, path.join(folderPath, fileName), { overwrite: false });
    placed = true;
  } finally {
    if (!placed) await files.delete(partialPath).then(undefined, () => undefined);
  }
}

/** The page's requests to the host that edit no document. */
export class HostRequestController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of the host requests. */
  public register(router: PageMessageRouter): void {
    const { host } = this.manager;
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-006
    // Copies the raw code of a code block. It does not edit anything, so a read-only preview allows it.
    router.on("previewCopyText", (message) => host.ui.writeClipboard(message.text));
    router.on("previewListTargets", (message, preview) => this.handleListTargets(preview, message));
    router.on("previewListCitations", (message, preview) => this.handleListCitations(preview, message));
    router.on("previewPickDocument", (message, preview) => this.handlePickDocument(preview, message));
    router.on("previewPickImage", (message, preview) => this.handlePickImage(preview, message));
    router.on("previewPasteImage", (message, preview) => this.handlePasteImage(preview, message));
    router.on("previewPasteHtml", (message, preview) => this.handlePasteHtml(preview, message));
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-090
  /** Answers a host request: `<type>Result` with the request's identity. */
  public postHostResult(
    preview: PreviewSession,
    message: PageMessageOf<HostRequestType>,
    result: HostListAnswer
      | { ok: true; path?: string; cancelled?: boolean; fileName?: string; markdown?: string }
      | { ok: true; id: string; text: string }
      | { ok: false; reason: string },
  ): void {
    void preview.postToPage({
      type: `${message.type}Result`,
      documentId: message.documentId,
      revision: message.revision,
      requestId: message.requestId,
      editId: message.editId,
      ...result,
    });
  }

  /** The citation keys of the workspace's `.bib` files next to `documentPath` (bounded scan). */
  public listCitations(documentPath: string | undefined): ReturnType<typeof scanBibKeys> {
    return scanBibKeys(documentPath, this.manager.host);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-065
  private handleListTargets(preview: PreviewSession, message: PageMessageOf<"previewListTargets">): void {
    const document = currentPaletteDocument(preview, message);
    if (!document) {
      this.postHostResult(preview, message, { ok: false, reason: "The preview is out of date. Try again once it has refreshed." });
      return;
    }
    this.postHostResult(preview, message, targetChoices(document.getText()));
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-183
  private handleListCitations(
    preview: PreviewSession,
    message: PageMessageOf<"previewListCitations">,
  ): PromiseLike<void> | undefined {
    if (preview.readOnly) {
      this.postHostResult(preview, message, { ok: false, reason: "Citations are read from the workspace, which needs trust." });
      return undefined;
    }
    const document = currentPaletteDocument(preview, message);
    if (!document) {
      this.postHostResult(preview, message, { ok: false, reason: "The preview is out of date. Try again once it has refreshed." });
      return undefined;
    }
    return this.listCitations(document.path).then((scan) => {
      this.postHostResult(preview, message, {
        ok: true,
        items: scan.items.map((item) => ({ value: item.key, label: item.key, ...(item.title ? { detail: item.title } : {}) })),
        truncated: scan.truncated,
      });
    }, (error: unknown) => {
      this.postHostResult(preview, message, { ok: false, reason: error instanceof Error ? error.message : String(error) });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-148
  /** Native open dialog for a `{doc}` link: answers with the path relative to the document. */
  private handlePickDocument(
    preview: PreviewSession,
    message: PageMessageOf<"previewPickDocument">,
  ): PromiseLike<void> | undefined {
    if (preview.readOnly) {
      this.postHostResult(preview, message, { ok: false, reason: "Linking a document needs a trusted workspace." });
      return undefined;
    }
    const document = currentPaletteDocument(preview, message);
    const documentPath = document?.path;
    if (!document || documentPath === undefined) {
      this.postHostResult(preview, message, { ok: false, reason: "The preview is out of date, or the document is not a file." });
      return undefined;
    }
    return this.manager.host.ui.pickFile({
      defaultDirectory: path.dirname(documentPath),
      filters: { Markdown: ["md", "markdown"] },
      openLabel: "Link document",
    }).then((file) => {
      if (!file) {
        this.postHostResult(preview, message, { ok: true, cancelled: true });
        return;
      }
      const reference = docReference(documentPath, file.path);
      this.postHostResult(preview, message, reference === undefined
        ? { ok: false, reason: "That file name cannot be written in a {doc} link." }
        : { ok: true, path: reference });
    }, (error: unknown) => {
      this.postHostResult(preview, message, { ok: false, reason: error instanceof Error ? error.message : String(error) });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-192
  /**
   * Native open dialog for the Image and Figure buttons: answers with the picked image as a path
   * relative to the document. Nothing is read or written. A file outside the workspace folders, on
   * another drive, or that is not an image is refused with a message the page shows.
   */
  private handlePickImage(preview: PreviewSession, message: PageMessageOf<"previewPickImage">): PromiseLike<void> | undefined {
    const { host } = this.manager;
    if (preview.readOnly) {
      this.postHostResult(preview, message, { ok: false, reason: "Inserting an image needs a trusted workspace." });
      return undefined;
    }
    const document = currentPaletteDocument(preview, message);
    const documentPath = document?.path;
    if (!document || documentPath === undefined) {
      this.postHostResult(preview, message, { ok: false, reason: "The preview is out of date, or the document is not a file." });
      return undefined;
    }
    return host.ui.pickFile({
      defaultDirectory: path.dirname(documentPath),
      filters: { Images: IMAGE_EXTENSIONS },
      openLabel: "Insert image",
    }).then((file) => {
      if (!file) {
        this.postHostResult(preview, message, { ok: true, cancelled: true });
        return;
      }
      if (!file.local || !isImageFileName(file.path)) {
        this.postHostResult(preview, message, { ok: false, reason: "Pick a png, jpeg, gif, webp or svg image." });
        return;
      }
      if (!host.workspace.folderOf(file.path)) {
        this.postHostResult(preview, message, { ok: false, reason: "The image must be inside a workspace folder." });
        return;
      }
      const reference = relativeImageReference(documentPath, file.path);
      this.postHostResult(preview, message, reference === undefined
        ? { ok: false, reason: "That image cannot be referenced from this document (another drive, or an unusual name)." }
        : { ok: true, path: reference });
    }, (error: unknown) => {
      this.postHostResult(preview, message, { ok: false, reason: error instanceof Error ? error.message : String(error) });
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-196
  /**
   * An image pasted into the open block editor: saved next to the document under a name chosen
   * here (`image.png`, `image-1.png`, …), never a name from the page. Refused in a read-only
   * preview, for a document that is not a saved file, for a folder that
   * is not inside a workspace folder (symlinks resolved), for bytes that are not the announced
   * png, jpeg, gif or webp, and above 10 MB. Only a block editor's text box posts this message (no
   * editor open: the page ignores the paste); the host has no state for an editor that is open but
   * not yet saved, and the editor's autosaves move the document version, so neither is checked.
   */
  private handlePasteImage(preview: PreviewSession, message: PageMessageOf<"previewPasteImage">): PromiseLike<void> | undefined {
    const { host } = this.manager;
    const refuse = (reason: string): undefined => {
      this.postHostResult(preview, message, { ok: false, reason });
      return undefined;
    };
    if (preview.readOnly) return refuse("Pasting an image needs a trusted workspace.");
    const document = preview.document;
    const documentPath = document?.path;
    if (!document || documentPath === undefined || document.id !== preview.documentUri) {
      return refuse("Save the document before pasting an image.");
    }
    if (!isDocumentEligible(document)) return refuse("Pasting an image needs a Markdown file.");
    const workspaceFolder = host.workspace.folderOf(documentPath);
    const folderPath = path.dirname(documentPath);
    const { canonicalPath } = this.manager;
    if (!workspaceFolder
      || !isPathWithin(canonicalPath(workspaceFolder.path), canonicalPath(folderPath))) {
      return refuse("The image must be saved inside a workspace folder.");
    }
    const announced = imageTypeOfMime(String(message.mime));
    const encoded = String(message.dataBase64);
    if (!announced || !isBase64(encoded)) return refuse("That clipboard image type is not supported.");
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length > MAX_PASTED_IMAGE_BYTES) return refuse("The image is larger than 10 MB.");
    const sniffed = sniffImage(bytes);
    if (sniffed === undefined || sniffed !== announced) {
      return refuse("The clipboard data is not a png, jpeg, gif or webp image.");
    }
    return host.files.readDirectory(folderPath).then(async (entries) => {
      const fileName = nextImageName(new Set(entries.map(([name]) => name)), PASTED_IMAGE_EXTENSION[sniffed]);
      if (fileName === undefined) {
        refuse("Too many pasted images next to this document.");
        return;
      }
      await writeNewFileAtomically(host.files, folderPath, fileName, bytes);
      this.postHostResult(preview, message, { ok: true, fileName });
    }).then(undefined, (error: unknown) => {
      refuse(error instanceof Error ? error.message : String(error));
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-213
  /** Rich text pasted into the open block editor: the clipboard's HTML as Markdown. No file is touched. */
  private handlePasteHtml(preview: PreviewSession, message: PageMessageOf<"previewPasteHtml">): void {
    try {
      this.postHostResult(preview, message, { ok: true, markdown: htmlToMarkdown(String(message.html)) });
    } catch (error) {
      this.postHostResult(preview, message, { ok: false, reason: error instanceof Error ? error.message : String(error) });
    }
  }
}
