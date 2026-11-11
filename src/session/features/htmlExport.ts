/**
 * The host side of "Export to HTML": answers the page's `previewExportHtml` request. It reads the
 * images the page shows (only the files its last render mapped) and the KaTeX sheet (only for a
 * page with math), builds the file with `buildHtmlExport`, warns about the links the file cannot
 * keep, asks where to save and writes the file. A page can never open the dialogs by itself: a
 * snapshot is served only after a click on the Export button or the command this session sent.
 */

import * as path from "node:path";

import { buildHtmlExport, collectImageSources, snapshotHasMath, type HtmlExportInputs } from "../../core/export/htmlExport";
import { katexFontUrls } from "../../core/export/exportStyles";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import { fireAndForget } from "../../host-api/logger";
import type { FileSystem } from "../../host-api/fileSystem";
import type { PreviewManager } from "../previewManager";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewSession } from "../previewSession";

/** How long a command's snapshot may take (the page waits up to 10 s for diagrams, then posts). */
const COMMAND_WINDOW_MS = 60_000;

/** The most link targets the warning lists; the rest is counted. */
const MAX_LISTED_LINKS = 20;

/** The media type of an image by its file extension. */
const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

const dataUri = (mime: string, bytes: Uint8Array): string => `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

/** The warning about the links the file leaves out: the count and at most 20 targets, then "and N more". */
export function removedLinksWarning(targets: readonly string[]): { message: string; detail: string } {
  const count = targets.length;
  const listed = targets.slice(0, MAX_LISTED_LINKS).join("\n");
  const rest = count > MAX_LISTED_LINKS ? `\nand ${count - MAX_LISTED_LINKS} more` : "";
  return {
    message: count === 1
      ? "1 link to another file will be removed from the exported page."
      : `${count} links to other files will be removed from the exported page.`,
    detail: `${listed}${rest}`,
  };
}

/** The closing message of an export. */
function exportedMessage(fileName: string, missingImages: number): string {
  const images = missingImages === 0 ? "" : missingImages === 1
    ? " 1 image could not be embedded."
    : ` ${missingImages} images could not be embedded.`;
  return `Exported to \`${fileName}\`.${images}`;
}

/** The page's export requests and the command that asks for one. */
export class HtmlExportController {
  /** The sessions a command asked for a snapshot, with the time of the ask. */
  private readonly asked = new WeakMap<PreviewSession, number>();

  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handler of the export request. */
  public register(router: PageMessageRouter): void {
    router.on("previewExportHtml", (message, preview) => this.handle(preview, message));
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-134
  /** Remembers that the command asked `session` for a snapshot: its next snapshot needs no click. */
  public expectSnapshot(session: PreviewSession): void {
    this.asked.set(session, Date.now());
  }

  /** True once, for a session a command asked recently. */
  private takeAsk(session: PreviewSession): boolean {
    const at = this.asked.get(session);
    this.asked.delete(session);
    return at !== undefined && Date.now() - at <= COMMAND_WINDOW_MS;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-136
  /** The data URI of each image of the page the render mapped to a file; the others are left out (they count as missing). */
  private async readImages(preview: PreviewSession, sources: readonly string[]): Promise<Map<string, string>> {
    const resources = preview.webview.resources;
    const images = new Map<string, string>();
    await Promise.all(sources.map(async (source) => {
      const file = resources?.get(source);
      const mime = file === undefined ? undefined : IMAGE_MIME_TYPES[path.extname(file).toLowerCase()];
      if (file === undefined || mime === undefined) return;
      try {
        images.set(source, dataUri(mime, await this.manager.host.files.readFile(file)));
      } catch {
        // Unreadable now: the image is counted as missing.
      }
    }));
    return images;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-136
  /** The KaTeX sheet with its fonts, read from the host's bundle; undefined when the host has no bundle or it cannot be read. */
  private async readKatex(preview: PreviewSession): Promise<HtmlExportInputs["katex"]> {
    const root = preview.panel.bundleRoot;
    if (root === undefined) return undefined;
    const directory = path.join(root, "katex");
    const files: FileSystem = this.manager.host.files;
    try {
      const css = new TextDecoder().decode(await files.readFile(path.join(directory, "katex.min.css")));
      const fonts = new Map<string, string>();
      await Promise.all(katexFontUrls(css).map(async (url) => {
        const file = path.join(directory, url);
        if (path.relative(directory, file).startsWith("..")) return;
        try {
          fonts.set(url, dataUri("font/woff2", await files.readFile(file)));
        } catch {
          // A font that cannot be read keeps no source: the text falls back to a serif font.
        }
      }));
      return { css, fonts };
    } catch {
      return undefined;
    }
  }

  /** The file the save dialog proposes: `<stem>.html` next to the document, else in the first workspace folder. */
  private defaultTarget(preview: PreviewSession, stem: string): string {
    const documentPath = preview.document?.path;
    const folder = documentPath !== undefined
      ? path.dirname(documentPath)
      : this.manager.host.workspace.folders()[0]?.path ?? "";
    return path.join(folder, `${stem}.html`);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-134
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-135
  private async handle(preview: PreviewSession, message: PageMessageOf<"previewExportHtml">): Promise<void> {
    const { host, requests } = this.manager;
    const answer = (result: Parameters<typeof requests.postHostResult>[2]): void => requests.postHostResult(preview, message, result);
    // A script cannot post the message itself (the webview handle is not exposed to it), but do not
    // rely on the flag alone: without a click or the command's ask, no dialog opens.
    const asked = this.takeAsk(preview);
    if (message.userGesture !== true && !asked) {
      answer({ ok: false, reason: "Export needs a click on the Export button or the Export to HTML command." });
      return;
    }
    try {
      const stem = path.basename(this.manager.activePathOf(preview)).replace(/\.[^.]*$/u, "") || "page";
      const katex = snapshotHasMath(message.snapshot) ? await this.readKatex(preview) : undefined;
      const images = await this.readImages(preview, collectImageSources(message.snapshot));
      const built = buildHtmlExport(message.snapshot, {
        stem,
        maxContentWidth: preview.configuration.maxContentWidth,
        imageData: (source) => images.get(source),
        ...(katex ? { katex } : {}),
      });
      if (built.removedLinks.length > 0) {
        const { message: question, detail } = removedLinksWarning(built.removedLinks);
        if (!await host.ui.confirm({ message: question, detail, confirmLabel: "Export" })) {
          answer({ ok: true, cancelled: true });
          return;
        }
      }
      const target = await host.ui.pickSaveFile({
        defaultPath: this.defaultTarget(preview, stem),
        filters: { HTML: ["html"] },
        saveLabel: "Export",
      });
      if (target === undefined) {
        answer({ ok: true, cancelled: true });
        return;
      }
      await host.files.writeFile(target, new TextEncoder().encode(built.html));
      const fileName = path.basename(target);
      fireAndForget(host.logger, host.ui.showInformation(exportedMessage(fileName, built.missingImages)), "showInformation");
      answer({ ok: true, fileName, missingImages: built.missingImages });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      fireAndForget(host.logger, host.ui.showError(`Could not export the page: ${reason}`), "showError");
      answer({ ok: false, reason: `Could not export the page: ${reason}` });
    }
  }
}
