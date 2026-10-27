/**
 * Decides whether a finished render can replace only the content of the loaded preview page, and
 * extracts that content (T34).
 *
 * The preview document has a "shell" (head, toolbar, status region, scripts, stylesheets) and one
 * content container, `<main id="sphinx-myst-preview-content">`. Two renders of the same kind of
 * document have the same shell; only the container's inner HTML differs. The host patches the
 * loaded page in place when, and only when, the shell is unchanged. Everything else keeps today's
 * full document assignment.
 *
 * The host's sanitized render is the only source of the inner HTML. The patch refuses content that
 * carries a `nonce` attribute or a `<script`: a nonce is valid for the document that was loaded
 * with it, so such content would not work in a patched page (P-S1).
 */

import { parse, serialize, type DefaultTreeAdapterTypes } from "parse5";

import {
  PREVIEW_STARTUP_SETTING_KEYS,
  type PreviewStartupSettings,
} from "../configuration/previewConfiguration";

type TreeNode = DefaultTreeAdapterTypes.Node;
type TreeElement = DefaultTreeAdapterTypes.Element;
type TreeChildNode = DefaultTreeAdapterTypes.ChildNode;

const CONTENT_ID = "sphinx-myst-preview-content";

/** Upper bound for the content one patch message may carry (the runtime enforces the same). */
export const MAX_PATCH_CONTENT_LENGTH = 20 * 1024 * 1024;

const NONCE_PLACEHOLDER = "NONCE";

export interface MainContent {
  /** Offset of the first character after the opening tag of the content container. */
  start: number;
  /** Offset of the closing tag of the content container. */
  end: number;
  inner: string;
}

interface PageAnalysis {
  content: MainContent | undefined;
  key: string;
}

function hasAttribute(element: TreeElement, name: string): boolean {
  return element.attrs.some((attribute) => attribute.name === name);
}

function isContentContainer(node: TreeNode): node is TreeElement {
  return "tagName" in node
    && node.tagName === "main"
    && node.attrs.some((attribute) => attribute.name === "id" && attribute.value === CONTENT_ID);
}

function isStatusRegion(node: TreeNode): boolean {
  return "tagName" in node && node.tagName === "aside" && hasAttribute(node, "data-sphinx-preview-status");
}

/** The runtime script, inline or as a file, and the JSON element with the context it reads. */
function isRuntimeScript(node: TreeNode): node is TreeElement {
  return "tagName" in node && node.tagName === "script"
    && (hasAttribute(node, "data-sphinx-preview-scroll-sync") || hasAttribute(node, "data-sphinx-preview-runtime-context"));
}

let parsedPages = 0;

/** How many pages `analyze` has parsed so far (a test reads it to check what a plan parses). */
export function parsedPageCount(): number {
  return parsedPages;
}

function analyze(html: string): PageAnalysis {
  parsedPages += 1;
  const document = parse(html, { sourceCodeLocationInfo: true });
  let content: MainContent | undefined;
  let contentSeen = false;
  const visit = (parent: { childNodes: TreeChildNode[] }): void => {
    parent.childNodes = parent.childNodes.filter((child) => !isStatusRegion(child));
    for (const child of parent.childNodes) {
      if (!("tagName" in child)) {
        continue;
      }
      if (!contentSeen && isContentContainer(child)) {
        contentSeen = true;
        const location = child.sourceCodeLocation;
        const start = location?.startTag?.endOffset;
        const end = location?.endTag?.startOffset;
        if (start !== undefined && end !== undefined && end >= start) {
          content = { start, end, inner: html.slice(start, end) };
        }
        // The content is what a patch replaces, so it is not part of the shell.
        child.childNodes = [];
        continue;
      }
      if (isRuntimeScript(child)) {
        // The runtime context embeds the identifiers of its render; the patch updates them itself.
        child.childNodes = [];
        continue;
      }
      visit(child);
    }
  };
  visit(document);
  const key = normalizeNonces(serialize(document));
  return { content, key };
}

function normalizeNonces(html: string): string {
  return html
    .replace(/(\snonce=")[^"]*"/giu, `$1${NONCE_PLACEHOLDER}"`)
    .replace(/'nonce-[^'"\s;]*'/gu, `'nonce-${NONCE_PLACEHOLDER}'`);
}

/** What the planner needs of a page it has already analyzed: the shell key, and whether it has content. */
interface PageShell {
  hasContent: boolean;
  key: string;
}

/**
 * The shells of the last pages analyzed, by the page text with its nonces normalized. The page
 * the host loaded was the new page of the previous plan, with its nonce swapped for the loaded one
 * (`reuseNonce`), so the next plan finds it here and parses only the new page (P-03).
 */
const MAX_REMEMBERED_SHELLS = 3;
const rememberedShells = new Map<string, PageShell>();

/** A 64-bit digest (two independent 32-bit mixes) plus the length: the memory keeps no page text. */
function digest(normalizedHtml: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalizedHtml.length; i += 1) {
    const code = normalizedHtml.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${normalizedHtml.length}:${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

function rememberShell(normalizedHtml: string, analysis: PageAnalysis): void {
  const id = digest(normalizedHtml);
  rememberedShells.delete(id);
  rememberedShells.set(id, { hasContent: analysis.content !== undefined, key: analysis.key });
  while (rememberedShells.size > MAX_REMEMBERED_SHELLS) {
    const oldest = rememberedShells.keys().next();
    if (oldest.done) break;
    rememberedShells.delete(oldest.value);
  }
}

/** The shell of `html`: from the memory when the page (up to its nonces) was analyzed before. */
function shellOf(html: string): PageShell {
  const normalized = normalizeNonces(html);
  const remembered = rememberedShells.get(digest(normalized));
  if (remembered) {
    return remembered;
  }
  const analysis = analyze(html);
  rememberShell(normalized, analysis);
  return { hasContent: analysis.content !== undefined, key: analysis.key };
}

/** The inner HTML of the content container, or undefined when the page has none. */
export function extractMainContent(html: string): MainContent | undefined {
  return analyze(html).content;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-071
// @implements_req SwRS-MDOKFSTUDIO-THEME-043
/**
 * The page without its content, its status region and the identifiers embedded in the runtime
 * script and in the nonces. Equal keys mean that the loaded page already has the right shell.
 * Undefined when the page has no content container (a status page).
 */
export function shellKey(html: string): string | undefined {
  const shell = shellOf(html);
  return shell.hasContent ? shell.key : undefined;
}

function contentIsPatchable(inner: string): boolean {
  return inner.length <= MAX_PATCH_CONTENT_LENGTH
    && !/nonce\s*=/iu.test(inner)
    && !/<script/iu.test(inner);
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-069
/**
 * The new content when the loaded page (`previousHtml`) can be updated in place to `nextHtml`:
 * the shells are equal and the content carries no nonce and no script. Undefined otherwise.
 */
export function planContentPatch(previousHtml: string, nextHtml: string): { contentHtml: string } | undefined {
  const previous = shellOf(previousHtml);
  const next = analyze(nextHtml);
  rememberShell(normalizeNonces(nextHtml), next);
  if (!previous.hasContent || !next.content || previous.key !== next.key) {
    return undefined;
  }
  return contentIsPatchable(next.content.inner) ? { contentHtml: next.content.inner } : undefined;
}

export function canPatch(previousHtml: string, nextHtml: string): boolean {
  return planContentPatch(previousHtml, nextHtml) !== undefined;
}

/** Limits of the status fields of a patch message; the webview runtime enforces the same ones. */
export const MAX_PATCH_DIAGNOSTICS = 500;
const MAX_PATCH_DIAGNOSTIC_TEXT = 20_000;
const MAX_PATCH_DIAGNOSTIC_SEVERITY = 50;

/** True when the runtime would accept these status lines (otherwise it ignores the whole patch). */
export function diagnosticsFitPatch(diagnostics: readonly { severity: string; text: string }[]): boolean {
  return diagnostics.length <= MAX_PATCH_DIAGNOSTICS
    && diagnostics.every((diagnostic) => diagnostic.text.length <= MAX_PATCH_DIAGNOSTIC_TEXT
      && diagnostic.severity.length <= MAX_PATCH_DIAGNOSTIC_SEVERITY);
}

/**
 * The part of the runtime context that the loaded page reads once, at startup, and that only a new
 * document can change: which document it shows and the interaction settings. A patch keeps the
 * running page, so it is allowed only when the new render has the same key. The theme, the pairing
 * with a text editor, the theme mode and the edit mode are not in the key: the page follows them
 * with messages or owns them. The settings are the preview settings the settings registry marks as
 * read at startup (`PREVIEW_STARTUP_SETTING_KEYS`).
 */
export type RuntimeContextSettings = {
  documentId: string;
  activeSourceFile: string;
} & Partial<PreviewStartupSettings>;

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-022
/** The key of {@link RuntimeContextSettings}: the document, then the startup settings in table order. */
export function runtimeContextKey(context: RuntimeContextSettings): string {
  return JSON.stringify([
    context.documentId,
    context.activeSourceFile,
    ...PREVIEW_STARTUP_SETTING_KEYS.map((key) => context[key] ?? null),
  ]);
}

/**
 * A page that was patched in place exists only in the webview: VS Code keeps the html of the last
 * assignment. If the webview is created again (for example when the editor moves to another
 * window), it loads that older html and reports ready with the identifiers of the assignment, not
 * with those of the current stage. The host recognizes the report and loads the current html.
 */
export function reportsReloadedDocument(
  report: { documentId: string; requestId: number },
  state: { documentId?: string; stageRequestId?: number; assignedRequestId?: number; reportedReady: boolean },
): boolean {
  return state.reportedReady
    && state.assignedRequestId !== undefined
    && state.stageRequestId !== undefined
    && report.documentId === state.documentId
    && report.requestId === state.assignedRequestId
    && report.requestId !== state.stageRequestId;
}

// @implements_req SwRS-MDOKFSTUDIO-TRUST-022
/**
 * `html` with the nonce of its render replaced by the nonce of the page that is loaded. A patch
 * does not change the loaded page's nonce, and the host's record of the page must match the page.
 * Nonces are random and long, so a plain replacement cannot touch anything else.
 */
export function reuseNonce(html: string, nonce: string, loadedNonce: string): string {
  return nonce === "" || loadedNonce === "" ? html : html.replaceAll(nonce, loadedNonce);
}
