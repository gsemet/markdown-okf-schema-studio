/**
 * The text at the last commit rendered like the page content, for the side-by-side diff of changed
 * blocks (CR 147). The render is the one of the preview itself (same engine, same sanitizer, same
 * resource policy); only the content container's inner HTML is kept.
 */

import { extractMainContent, MAX_PATCH_CONTENT_LENGTH } from "../../core/preview/contentPatch";
import { renderPreviewDocument, type RenderStage } from "../../core/render/renderPipeline";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { buildPreviewWebviewHtml } from "../webview";

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-006
/**
 * The sanitized inner HTML of the content container for `baseText`, its blocks numbered by the lines
 * of `baseText`, or undefined when it cannot be rendered, is too large or would carry a script.
 * `shown` is the stage the page shows: the baseline takes its document, identity and paths.
 */
export async function renderBaselineContent(
  manager: PreviewManager,
  preview: PreviewSession,
  shown: RenderStage,
  baseText: string,
): Promise<string | undefined> {
  const { host } = manager;
  let result;
  try {
    result = await renderPreviewDocument({
      document: {
        uri: { scheme: "file", fsPath: shown.activeDocumentPath },
        languageId: "markdown",
        getText: () => baseText,
      },
      revision: shown.activeDocumentRevision,
      workspaceRoot: preview.workspaceRoot,
      readOnly: preview.readOnly,
      requestId: shown.requestId,
      documentIdentity: shown.activeDocumentIdentity,
      isWorkspaceTrusted: () => host.workspace.trusted,
      allowUntrusted: true,
      plantUmlJarPath: preview.plantUmlConfiguration.jarPath,
      plantUmlEngine: manager.plantUml.engineFor(preview),
      renderSource: host.previewRenderer?.render,
    });
  } catch {
    return undefined;
  }
  try {
    const page = buildPreviewWebviewHtml(
      result.html,
      result.stage.outputDirectory,
      preview.panel.assets,
      manager.rendering.runtimeContext(result.stage),
      preview.workspaceRoot,
      undefined,
      preview.configuration.maxContentWidth,
      false,
      false,
      [],
      "host",
      preview.readOnly,
    );
    const inner = extractMainContent(page.html)?.inner;
    if (inner === undefined || inner.length > MAX_PATCH_CONTENT_LENGTH) return undefined;
    // The page runtime and the nonce belong to the page shell; content that carries either is not used.
    return /nonce\s*=|<script/iu.test(inner) ? undefined : inner;
  } finally {
    result.stage.dispose();
  }
}
