import * as path from "node:path";

import type { AssetResolver } from "../host-api/assetResolver";
import { type FrontmatterResult } from "../core/frontmatter/okfFrontmatter";
import { renderPropertiesTable } from "../core/frontmatter/propertiesTable";
import { createContentSecurityPolicy, createNonce } from "../core/security/csp";
import {
  PREVIEW_ACCESSIBILITY_CSS,
  PREVIEW_THEME_CSS,
  previewContentWidthCss,
} from "../core/preview/previewStyles";
import { renderPreviewStickyHeadings, renderPreviewToolbar } from "../core/preview/previewToolbar";
import {
  injectContentSecurityPolicy,
  rewriteSphinxHtml,
  ResolvedResource,
} from "../core/security/html-sanitizer";
import {
  createPreviewResourcePolicy,
  type PolicyFiles,
  type ResourceRequest,
  resourceReferenceSuffix,
  SecurityDiagnostic,
} from "../core/security/resource-policy";
import {
  injectPlantUmlDiagrams,
  PlantUmlDiagramRender,
} from "../core/render/plantUmlRenderer";
import {
  type PreviewRuntimeContext,
  RUNTIME_CONTEXT_ATTRIBUTE,
  serializeRuntimeContext,
} from "../core/protocol/bootContext";
import { renderMathHtml } from "../core/render/mathRenderer";
import { classifyPreviewReference } from "../core/navigation/previewNavigation";
import { escapeHtml } from "../core/syntax/markdownSyntax";
import {
  type PreviewStatus,
  type PreviewStatusDiagnostic,
  statusMarkup,
} from "../core/preview/previewStatus";

export interface PreviewWebviewResult {
  html: string;
  diagnostics: SecurityDiagnostic[];
  nonce: string;
  frontmatter?: FrontmatterResult;
  /**
   * The local images the page shows: the URL of the `img` (as the page has it) to the file system
   * path it was made from. The HTML export embeds only these files.
   */
  resources?: ReadonlyMap<string, string>;
}

export {
  formatStatusDiagnostic,
  PREVIEW_STATUS_LABELS,
  setPreviewStatus,
  type PreviewStatus,
  type PreviewStatusDiagnostic,
  type PreviewStatusDiagnosticItem,
} from "../core/preview/previewStatus";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-059
// @implements_req SwRS-MDOKFSTUDIO-TRUST-012
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

// @implements_req SwRS-MDOKFSTUDIO-TRUST-007
/**
 * The runtime as a file (PERF-11): the boot context of this render in an inert JSON element, then
 * the bundled runtime script (src/page/main.ts), which reads it. Only the JSON changes from one
 * render to the next. Without a bundle URL (a host that serves no bundle) the page gets the context
 * only: the runtime exists as the bundle file alone.
 */
function injectRuntimeFile(html: string, context: PreviewRuntimeContext, runtimeUri: string | undefined, nonce: string): string {
  return injectRuntimeTags(
    html,
    `<script type="application/json" ${RUNTIME_CONTEXT_ATTRIBUTE}>${serializeRuntimeContext(context)}</script>`
      + (runtimeUri === undefined
        ? ""
        : `<script nonce="${escapeHtml(nonce)}" src="${escapeHtml(runtimeUri)}" data-sphinx-preview-scroll-sync></script>`),
  );
}

function injectRuntimeTags(html: string, tag: string): string {
  if (/<\/body>/iu.test(html)) {
    return html.replace(/<\/body>/iu, () => `${tag}</body>`);
  }
  if (/<\/html>/iu.test(html)) {
    return html.replace(/<\/html>/iu, () => `${tag}</html>`);
  }
  return `${html}${tag}`;
}

function injectMermaidRenderer(html: string, rendererUri: string, nonce: string): string {
  const tag = `<script type="module" nonce="${escapeHtml(nonce)}" src="${escapeHtml(rendererUri)}" data-sphinx-preview-mermaid></script>`;
  if (/<\/body>/iu.test(html)) {
    return html.replace(/<\/body>/iu, () => `${tag}</body>`);
  }
  return `${html}${tag}`;
}

function injectChartRenderer(html: string, rendererUri: string, nonce: string): string {
  const tag = `<script nonce="${escapeHtml(nonce)}" src="${escapeHtml(rendererUri)}" defer data-sphinx-preview-vega></script>`;
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

function injectPreviewThemeControl(html: string): string {
  const bodyOpening = /<body(?:\s[^>]*)?>/iu;
  if (!bodyOpening.test(html)) {
    return html;
  }
  return html.replace(
    bodyOpening,
    (opening) => `${opening}${renderPreviewToolbar()}${renderPreviewStickyHeadings()}`,
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

/** The most extra passes of the sanitizer after its first one (see {@link buildPreviewWebviewHtml}). */
const MAX_PRIMING_PASSES = 3;

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&#x([\da-f]+);/giu, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&quot;/gu, '"').replace(/&apos;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">")
    .replace(/&amp;/gu, "&");
}

/**
 * The resource requests the sanitizer is likely to resolve (`src`, `srcset`, `poster`, `data` and the
 * `href` of a `<link>`), read off the HTML text (the quotes of the regular expressions are written as hexadecimal escapes) so the policy can ask the file system for them
 * before the synchronous sanitizer runs. A guess only: a request it misses is found by the
 * sanitizer itself and primed before a second pass.
 */
function likelyResourceRequests(html: string, baseDirectory: string): ResourceRequest[] {
  const requests: string[] = [];
  for (const match of html.matchAll(/\b(src|srcset|poster|data)\s*=\s*(?:\x22([^\x22]*)\x22|\x27([^\x27]*)\x27)/giu)) {
    const value = decodeHtmlAttribute(match[2] ?? match[3] ?? "");
    if (match[1].toLowerCase() === "srcset") {
      for (const candidate of value.split(",")) requests.push(candidate.trim().split(/\s+/u)[0]);
    } else {
      requests.push(value);
    }
  }
  for (const match of html.matchAll(/<link\b[^>]*?\bhref\s*=\s*(?:\x22([^\x22]*)\x22|\x27([^\x27]*)\x27)/giu)) {
    requests.push(decodeHtmlAttribute(match[1] ?? match[2] ?? ""));
  }
  return [...new Set(requests)]
    .filter((request) => request !== "" && !request.startsWith("#"))
    .map((request) => ({ request, baseDirectory, options: { image: true } }));
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-001
// @implements_req SwRS-MDOKFSTUDIO-DIAG-023
// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-002
// @implements_req SwRS-MDOKFSTUDIO-TRUST-022
// @implements_req SwRS-MDOKFSTUDIO-TRUST-002
export async function buildPreviewWebviewHtml(
  files: PolicyFiles,
  sphinxHtml: string,
  outputDirectory: string,
  /** Where the page loads workspace files and the extension bundle from (see AssetResolver). */
  assets: AssetResolver,
  scrollContext?: PreviewRuntimeContext,
  workspaceRoot?: string,
  frontmatter?: { result: FrontmatterResult; tableEnabled: boolean },
  maxContentWidth?: number,
  /** False for a preview with restricted reads: the page loads no external script. */
  allowExternalScripts = true,
  plantUmlDiagrams: readonly PlantUmlDiagramRender[] = [],
  /** `builtin`: the page loads the bundled PlantUML engine; `host`: the diagrams come injected. */
  plantUmlRenderer: "builtin" | "host" = "host",
  /** Restricted reads: the resource policy is narrowed (TRUST-002). */
  restrictedReads = false,
): Promise<PreviewWebviewResult> {
  const policy = createPreviewResourcePolicy(files, outputDirectory, workspaceRoot, restrictedReads);
  const nonce = createNonce();
  // The sanitizer is synchronous and asks the policy about each local resource; the policy answers
  // from the file facts `prime` gathered. The likely requests are primed first; a request the guess
  // missed is refused in the pass, listed by the policy, primed, and the page sanitized again.
  const sanitizePass = (): {
    rewritten: ReturnType<typeof rewriteSphinxHtml>;
    stylesheetDiagnostics: SecurityDiagnostic[];
    resources: Map<string, string>;
  } => {
    const resolvedStylesheets = new Set<string>();
    const stylesheetDiagnostics: SecurityDiagnostic[] = [];
    const resources = new Map<string, string>();
    const resolveResource = (request: string, baseDirectory: string): ResolvedResource | undefined => {
      const resourcePath = policy.resolvePrimed(request, baseDirectory, { image: true });
      if (!resourcePath) {
        return undefined;
      }
      const uri = `${assets.resourceUri(resourcePath)}${resourceReferenceSuffix(request)}`;
      resources.set(uri, resourcePath);
      return { path: resourcePath, uri };
    };
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-042
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
    // The sanitizer's one parse also numbers the source blocks (`sourceMapping`).
    const rewritten = rewriteSphinxHtml(sphinxHtml, {
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
    return { rewritten, stylesheetDiagnostics, resources };
  };
  await policy.prime(likelyResourceRequests(sphinxHtml, outputDirectory));
  const diagnosticsBefore = policy.diagnostics.length;
  let pass = sanitizePass();
  for (let extra = 0; extra < MAX_PRIMING_PASSES; extra += 1) {
    const missed = policy.takeUnprimed();
    if (missed.length === 0) break;
    // The refusals of the first pass are recorded again by the next one.
    policy.diagnostics.length = diagnosticsBefore;
    await policy.prime(missed);
    pass = sanitizePass();
  }
  policy.takeUnprimed();
  const { rewritten, stylesheetDiagnostics, resources } = pass;
  const withPlantUml = injectPlantUmlDiagrams(rewritten.html, plantUmlDiagrams);
  const csp = createContentSecurityPolicy(assets.cspSource, nonce);
  const bundleUri = (file: string): string | undefined => assets.bundleUri(file);
  // The static stylesheet is a bundled file (PERF-11), imported by the page's one nonce style
  // element, which keeps only the rule that depends on the settings.
  const stylesheetUri = bundleUri("preview.css");
  const accessibleHtml = injectAccessibilityStyles(
    scrollContext ? injectPreviewThemeControl(withPlantUml) : withPlantUml,
    stylesheetUri
      ? `@import url("${stylesheetUri.replace(/["\\\n]/gu, encodeURIComponent)}");${previewContentWidthCss(maxContentWidth)}`
      : `${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}${previewContentWidthCss(maxContentWidth)}`,
    nonce,
  );
  const mermaidRendererUri = rewritten.html.includes('class="myst-mermaid-figure"')
    ? assets.bundleUri("mermaidPreview.js")
    : undefined;
  const katexStylesheetUri = assets.bundleUri("katex", "katex.min.css");
  const withMath = katexStylesheetUri !== undefined
    ? renderMathHtml(accessibleHtml, katexStylesheetUri, nonce)
    : accessibleHtml;
  const plantUmlRendererUri = plantUmlRenderer === "builtin"
    && rewritten.html.includes('class="myst-plantuml-figure"')
    ? assets.bundleUri("plantumlPreview.js")
    : undefined;
  // @implements_req SwRS-MDOKFSTUDIO-DIAG-129
  const chartRendererUri = rewritten.html.includes('class="myst-vega-figure"')
    ? assets.bundleUri("vegaPreview.js")
    : undefined;
  const withMermaid = mermaidRendererUri
    ? injectMermaidRenderer(withMath, mermaidRendererUri, nonce)
    : withMath;
  const withChart = chartRendererUri
    ? injectChartRenderer(withMermaid, chartRendererUri, nonce)
    : withMermaid;
  const withMermaidRenderer = plantUmlRendererUri
    ? injectPlantUmlRenderer(withChart, plantUmlRendererUri, nonce)
    : withChart;
  const runtimeUri = bundleUri("preview.js");
  const html = !scrollContext
    ? withMermaidRenderer
    : injectRuntimeFile(withMermaidRenderer, scrollContext, runtimeUri, nonce);
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
    resources,
  };
}

export function buildErrorWebviewHtml(
  message: string,
  cspSource: string,
): string {
  return buildStatusWebviewHtml("error", cspSource, message);
}
