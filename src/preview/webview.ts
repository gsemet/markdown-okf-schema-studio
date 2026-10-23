import * as path from "node:path";

import * as vscode from "vscode";

import { type FrontmatterResult } from "../frontmatter/okfFrontmatter";
import { renderPropertiesTable } from "../frontmatter/propertiesTable";
import { annotateSourceMappings } from "../mapping/sourceMapping";
import { createContentSecurityPolicy, createNonce } from "../security/csp";
import {
  PREVIEW_ACCESSIBILITY_CSS,
  PREVIEW_THEME_CSS,
  previewContentWidthCss,
} from "./previewStyles";
import { renderPreviewStickyHeadings, renderPreviewToolbar } from "./previewToolbar";
import {
  injectContentSecurityPolicy,
  rewriteSphinxHtml,
  ResolvedResource,
} from "../security/html-sanitizer";
import {
  createPreviewResourcePolicy,
  resourceReferenceSuffix,
  SecurityDiagnostic,
} from "../security/resource-policy";
import {
  injectPlantUmlDiagrams,
  PlantUmlDiagramRender,
} from "../render/plantUmlRenderer";
import { createScrollSyncScript, PreviewRuntimeContext } from "../webview/scrollSync";
import { renderMathHtml } from "../render/mathRenderer";
import { classifyPreviewReference } from "../navigation/previewNavigation";
import {
  escapeHtml,
  type PreviewStatus,
  type PreviewStatusDiagnostic,
  statusMarkup,
} from "./previewStatus";

export interface PreviewWebviewResult {
  html: string;
  diagnostics: SecurityDiagnostic[];
  nonce: string;
  frontmatter?: FrontmatterResult;
}

export {
  formatStatusDiagnostic,
  PREVIEW_STATUS_LABELS,
  setPreviewStatus,
  type PreviewStatus,
  type PreviewStatusDiagnostic,
  type PreviewStatusDiagnosticItem,
} from "./previewStatus";

export function buildStatusWebviewHtml(
  status: PreviewStatus,
  cspSource: string,
  message?: string,
  diagnostics: readonly PreviewStatusDiagnostic[] = [],
): string {
  const nonce = createNonce();
  const csp = createContentSecurityPolicy(cspSource, nonce);
  const html = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Markdown OKF-Schema Studio</title></head><body data-sphinx-preview-status-page>${statusMarkup(status, message, diagnostics)}</body></html>`;
  return injectAccessibilityStyles(html, PREVIEW_ACCESSIBILITY_CSS, nonce);
}

function injectScrollSyncScript(html: string, script: string, nonce: string): string {
  const tag = `<script nonce="${nonce}" data-sphinx-preview-scroll-sync>${script}</script>`;
  if (/<\/body>/iu.test(html)) {
    return html.replace(/<\/body>/iu, () => `${tag}</body>`);
  }
  if (/<\/html>/iu.test(html)) {
    return html.replace(/<\/html>/iu, () => `${tag}</html>`);
  }
  return `${html}${tag}`;
}

function injectMermaidRenderer(html: string, rendererUri: string, nonce: string): string {
  const tag = `<script nonce="${escapeHtml(nonce)}" src="${escapeHtml(rendererUri)}" defer data-sphinx-preview-mermaid></script>`;
  if (/<\/body>/iu.test(html)) {
    return html.replace(/<\/body>/iu, () => `${tag}</body>`);
  }
  return `${html}${tag}`;
}

function injectPlantUmlRenderer(html: string, rendererUri: string, nonce: string): string {
  const tag = `<script nonce="${escapeHtml(nonce)}" src="${escapeHtml(rendererUri)}" defer data-sphinx-preview-plantuml></script>`;
  if (/<\/body>/iu.test(html)) {
    return html.replace(/<\/body>/iu, () => `${tag}</body>`);
  }
  return `${html}${tag}`;
}

function injectAccessibilityStyles(html: string, css: string, nonce: string): string {
  const style = `<style nonce="${escapeHtml(nonce)}" data-sphinx-preview-accessibility>${css}</style>`;
  if (/<\/head>/iu.test(html)) {
    return html.replace(/<\/head>/iu, () => `${style}</head>`);
  }
  return html;
}

function injectPreviewThemeControl(html: string, editingEnabled: boolean): string {
  const bodyOpening = /<body(?:\s[^>]*)?>/iu;
  if (!bodyOpening.test(html)) {
    return html;
  }
  return html.replace(
    bodyOpening,
    (opening) => `${opening}${renderPreviewToolbar(editingEnabled)}${renderPreviewStickyHeadings()}`,
  );
}

/**
 * Inserts the OKF properties table as the first child of the preview content
 * container. Plain string splicing on the unique id anchor keeps this free of
 * a second parse/serialize pass.
 */
function injectPropertiesTable(html: string, markup: string): string {
  if (!markup) {
    return html;
  }
  const anchor = /<main\s+id="sphinx-myst-preview-content"[^>]*>/u;
  if (anchor.test(html)) {
    return html.replace(anchor, (opening) => `${opening}${markup}`);
  }
  return html;
}

export function buildPreviewWebviewHtml(
  sphinxHtml: string,
  outputDirectory: string,
  webview: Pick<vscode.Webview, "asWebviewUri" | "cspSource">,
  scrollContext?: PreviewRuntimeContext,
  workspaceRoot?: string,
  frontmatter?: { result: FrontmatterResult; tableEnabled: boolean },
  maxContentWidth?: number,
  extensionUri?: vscode.Uri,
  editingEnabled = true,
  allowExternalScripts = true,
  plantUmlDiagrams: readonly PlantUmlDiagramRender[] = [],
  /** `builtin`: the page loads the bundled PlantUML engine; `host`: the diagrams come injected. */
  plantUmlRenderer: "builtin" | "host" = "host",
): PreviewWebviewResult {
  const policy = createPreviewResourcePolicy(outputDirectory, workspaceRoot);
  const nonce = createNonce();
  const resolvedStylesheets = new Set<string>();
  const stylesheetDiagnostics: SecurityDiagnostic[] = [];
  const resolveResource = (request: string, baseDirectory: string): ResolvedResource | undefined => {
    const resourcePath = policy.resolveResource(request, baseDirectory);
    if (!resourcePath) {
      return undefined;
    }
    return {
      path: resourcePath,
      uri: `${webview.asWebviewUri(vscode.Uri.file(resourcePath)).toString()}${resourceReferenceSuffix(request)}`,
    };
  };
  const resolveNavigation = (
    request: string,
    _baseDirectory: string,
  ): { kind: "anchor" | "external" | "deferred" | "blocked"; value?: string } | ResolvedResource => {
    const reference = classifyPreviewReference(request);
    return reference.kind === "relative" || reference.kind === "wiki"
      ? { kind: "deferred", value: reference.value }
      : reference;
  };
  /**
   * Refuses linked stylesheets outright.
   *
   * The preview renders a fragment from the buffer and supplies its own theme, so any
   * `<link rel="stylesheet">` can only come from raw HTML in the document. Sanitizing one
   * would mean rewriting a file that belongs to the user, which the preview must never do.
   */
  const processStylesheet = (stylesheetPath: string): void => {
    if (resolvedStylesheets.has(stylesheetPath)) {
      return;
    }
    resolvedStylesheets.add(stylesheetPath);
    stylesheetDiagnostics.push({
      code: "blocked-stylesheet",
      message: "Ignored a linked stylesheet; the preview supplies its own theme.",
      value: stylesheetPath,
    });
  };
  const mappedHtml = scrollContext
    ? annotateSourceMappings(sphinxHtml, {
      documentId: scrollContext.documentId,
      activeSourceFile: scrollContext.activeSourceFile,
    })
    : sphinxHtml;
  const rewritten = rewriteSphinxHtml(mappedHtml, {
    outputRoot: outputDirectory,
    policy,
    nonce,
    ...(scrollContext ? {
      sourceMapping: {
        sourceFile: scrollContext.activeSourceFile,
        documentId: scrollContext.documentId,
      },
    } : {}),
    resolveResource,
    resolveNavigation,
    processStylesheet,
    allowExternalScripts,
  });
  const withPlantUml = injectPlantUmlDiagrams(rewritten.html, plantUmlDiagrams);
  const csp = createContentSecurityPolicy(webview.cspSource, nonce);
  const accessibleHtml = injectAccessibilityStyles(
    scrollContext ? injectPreviewThemeControl(withPlantUml, editingEnabled) : withPlantUml,
    `${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}${previewContentWidthCss(maxContentWidth)}`,
    nonce,
  );
  const mermaidRendererUri = extensionUri && rewritten.html.includes('class="myst-mermaid-figure"')
    ? webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "out", "bundle", "mermaidPreview.js")).toString()
    : undefined;
  const withMath = extensionUri
    ? renderMathHtml(accessibleHtml, webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "out", "bundle", "katex", "katex.min.css"),
    ).toString(), nonce)
    : accessibleHtml;
  const plantUmlRendererUri = extensionUri
    && plantUmlRenderer === "builtin"
    && rewritten.html.includes('class="myst-plantuml-figure"')
    ? webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "out", "bundle", "plantumlPreview.js")).toString()
    : undefined;
  const withMermaid = mermaidRendererUri
    ? injectMermaidRenderer(withMath, mermaidRendererUri, nonce)
    : withMath;
  const withMermaidRenderer = plantUmlRendererUri
    ? injectPlantUmlRenderer(withMermaid, plantUmlRendererUri, nonce)
    : withMermaid;
  const html = scrollContext
    ? injectScrollSyncScript(
      withMermaidRenderer,
      createScrollSyncScript(scrollContext),
      nonce,
    )
    : withMermaidRenderer;
  const withFrontmatter = injectPropertiesTable(
    html,
    frontmatter
      ? renderPropertiesTable(frontmatter.result, frontmatter.tableEnabled, scrollContext)
      : "",
  );
  return {
    html: injectContentSecurityPolicy(withFrontmatter, csp),
    diagnostics: [...policy.diagnostics, ...rewritten.diagnostics, ...stylesheetDiagnostics],
    nonce,
    frontmatter: frontmatter?.result,
  };
}

export function buildErrorWebviewHtml(
  message: string,
  cspSource: string,
): string {
  return buildStatusWebviewHtml("error", cspSource, message);
}
