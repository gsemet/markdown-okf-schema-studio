import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import {
  canPatch,
  diagnosticsFitPatch,
  extractMainContent,
  parsedPageCount,
  planContentPatch,
  reportsReloadedDocument,
  reuseNonce,
  runtimeContextKey,
  shellKey,
} from "../../../src/core/preview/contentPatch";
import { injectPlantUmlDiagrams } from "../../../src/core/render/plantUmlRenderer";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml, setPreviewStatus } from "../../../src/session/webview";
import { fakeAssetResolver } from "../../shared/fakeAssets";


const extensionRoot = path.resolve(__dirname, "../../../..");
const workspaceRoot = extensionRoot;
const fixtureDirectory = path.join(workspaceRoot, "tests", "fixtures", "sphinx-features");
const assets = fakeAssetResolver({
  cspSource: "vscode-webview://csp",
  url: (filePath) => "file://vscode-webview://resource" + filePath,
  extensionRoot,
});

let nextRequestId = 1;

async function page(markdown: string, options: { requestId?: number; version?: number; zoom?: number; incoming?: boolean } = {}): Promise<string> {
  const requestId = options.requestId ?? nextRequestId++;
  const version = options.version ?? requestId;
  const sourcePath = path.join(fixtureDirectory, "inline.md");
  const result = await renderPreviewDocument({
    document: {
      uri: { scheme: "file", fsPath: sourcePath },
      languageId: "markdown",
      version,
      getText: () => markdown,
    },
    workspaceRoot,
    requestId,
    isWorkspaceTrusted: () => true,
  });
  const built = buildPreviewWebviewHtml(
    result.html,
    result.stage.outputDirectory,
    assets,
    {
      documentId: result.stage.activeDocumentIdentity,
      revision: version,
      requestId,
      activeSourceFile: result.stage.activeDocumentPath,
      ...(requestId % 2 === 0 ? { initialAnchor: 3 } : {}),
      ...(options.zoom !== undefined || options.incoming !== undefined
        ? { initialViewPreferences: { zoom: options.zoom ?? 100, widthMode: "margin", toc: false, incomingChanges: options.incoming ?? true, comments: true, toolbarCollapsed: false } }
        : {}),
    },
    workspaceRoot,
    undefined,
    960,
  );
  return setPreviewStatus(built.html, "success", undefined, []);
}

const MERMAID = "```{mermaid}\ngraph TD\n  A --> B\n```\n";

test("T34: extractMainContent returns the inner HTML of the content container of a real page", async () => {
  const html = await page("# Title\n\nFirst paragraph.\n");
  const content = extractMainContent(html);
  assert.ok(content, "the page has a content container");
  assert.equal(html.slice(content.start, content.end), content.inner);
  assert.match(content.inner, /First paragraph\./u);
  assert.match(html.slice(0, content.start), /<main id="sphinx-myst-preview-content"[^>]*>$/u);
  assert.match(html.slice(content.end), /^<\/main>/u);
  assert.doesNotMatch(content.inner, /<script/iu);
  assert.equal(extractMainContent("<html><body><p>no container</p></body></html>"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("T34: two renders of one document type have equal shell keys despite other text, nonces and identifiers", async () => {
  const first = await page("# Title\n\nFirst paragraph.\n", { requestId: 1, version: 1 });
  const second = await page("# Another title\n\nA different paragraph with **bold** text.\n\n- item\n", {
    requestId: 2,
    version: 2,
  });
  assert.notEqual(first, second);
  const nonceOf = (html: string): string | undefined => /<script nonce="([^"]+)"/u.exec(html)?.[1];
  assert.ok(nonceOf(first) && nonceOf(second));
  assert.notEqual(nonceOf(first), nonceOf(second), "each render uses its own nonce");
  const key = shellKey(first);
  assert.ok(key, "a rendered page has a shell key");
  assert.equal(shellKey(second), key);
  assert.equal(canPatch(first, second), true);
  assert.equal(planContentPatch(first, second)?.contentHtml, extractMainContent(second)?.inner);
});

test("T17: the shell key is equal whatever the incoming-changes preference, and the Diff button is in both", async () => {
  const on = await page("# Title\n\nText.\n", { requestId: 1, version: 1, incoming: true });
  const off = await page("# Title\n\nText.\n", { requestId: 2, version: 2, incoming: false });
  for (const html of [on, off]) assert.match(html, /data-sphinx-preview-diff-toggle/u);
  assert.ok(shellKey(on));
  assert.equal(shellKey(off), shellKey(on));
  assert.equal(canPatch(on, off), true);
});

test("T34: the shell key ignores the status region and the runtime script, and nothing else", async () => {
  const html = await page("Some text.\n");
  const failed = setPreviewStatus(html, "stale", "The render failed.", [
    { message: "Bad directive", file: "inline.md", line: 3, severity: "error" },
  ]);
  assert.notEqual(failed, html);
  assert.equal(shellKey(failed), shellKey(html));
  const withoutToolbar = html.replace(/<div[^>]*data-sphinx-preview-toolbar[\s\S]*?<\/div>/u, "");
  assert.notEqual(withoutToolbar, html);
  assert.notEqual(shellKey(withoutToolbar), shellKey(html), "a changed toolbar is a changed shell");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001
// @tests_req SwRS-MDOKFSTUDIO-LIFE-071
test("T34: shell keys differ when Mermaid appears or disappears, and when math appears", async () => {
  const plain = await page("Text only.\n");
  const diagram = await page("Text only.\n\n" + MERMAID);
  assert.match(diagram, /myst-mermaid-figure/u, "the Mermaid fixture renders a Mermaid figure");
  assert.match(diagram, /data-sphinx-preview-mermaid/u, "the Mermaid renderer script is part of the page");
  assert.notEqual(shellKey(plain), shellKey(diagram));
  assert.equal(canPatch(plain, diagram), false);
  assert.equal(canPatch(diagram, plain), false);
  const secondDiagram = await page("Another text.\n\n" + MERMAID);
  assert.equal(canPatch(diagram, secondDiagram), true, "two pages with diagrams share their shell");
  const math = await page("Text with $x^2$ inline math.\n");
  assert.notEqual(shellKey(plain), shellKey(math), "the math stylesheet is part of the shell");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-124
test("CR 149: shell keys differ when a chart appears or disappears, and charts of two pages share a shell", async () => {
  const chart = '```vega-lite\n{"mark":"bar","data":{"values":[{"a":1}]}}\n```\n';
  const plain = await page("Text only.\n");
  const withChart = await page("Text only.\n\n" + chart);
  assert.match(withChart, /myst-vega-figure/u);
  assert.match(withChart, /data-sphinx-preview-vega/u, "the chart runtime script is part of the page");
  assert.notEqual(shellKey(plain), shellKey(withChart));
  assert.equal(canPatch(plain, withChart), false);
  assert.equal(canPatch(withChart, plain), false);
  assert.equal(canPatch(withChart, await page("Other text.\n\n" + chart.replace('"a":1', '"a":2'))), true);
});

test("T34: canPatch refuses next content that carries a script or a nonce", async () => {
  const previous = await page("Text.\n");
  const next = await page("Other text.\n");
  assert.equal(canPatch(previous, next), true);
  const opening = /<main id="sphinx-myst-preview-content"[^>]*>/u;
  const withScript = next.replace(opening, (tag) => tag + "<script>alert(1)</script>");
  assert.match(withScript, /<script>alert/u);
  assert.equal(canPatch(previous, withScript), false);
  assert.equal(canPatch(previous, next.replace(opening, (tag) => tag + "<SCRIPT src=x></SCRIPT>")), false);
  assert.equal(canPatch(previous, next.replace(opening, (tag) => tag + '<style nonce="abc">p{}</style>')), false);
  assert.equal(planContentPatch(previous, withScript), undefined);
});

test("T34: canPatch refuses pages without a content container", async () => {
  const rendered = await page("Text.\n");
  const statusPage = "<!doctype html><html><head></head><body><aside data-sphinx-preview-status=\"pending\">"
    + "<strong>Preview pending</strong></aside></body></html>";
  assert.equal(shellKey(statusPage), undefined);
  assert.equal(canPatch(statusPage, rendered), false);
  assert.equal(canPatch(rendered, statusPage), false);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-105
test("T34: injecting PlantUML diagrams into a page keeps its shell key, so the diagrams can be patched in", async () => {
  const html = await page("```plantuml\n@startuml\nAlice -> Bob: hello\n@enduml\n```\n");
  assert.match(html, /myst-plantuml-diagram/u);
  const injected = injectPlantUmlDiagrams(html, [{
    status: "rendered",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\"></svg>",
  } as never]);
  assert.notEqual(injected, html);
  assert.match(injected, /myst-plantuml-image/u);
  assert.equal(shellKey(injected), shellKey(html));
  assert.equal(canPatch(html, injected), true);
  assert.match(planContentPatch(html, injected)?.contentHtml ?? "", /myst-plantuml-image/u);
});

test("T34: content that mentions a container inside the content does not change the extracted content", async () => {
  const html = await page("Text.\n");
  const nested = html.replace(
    /(<main id="sphinx-myst-preview-content"[^>]*>)/u,
    '$1<main id="sphinx-myst-preview-content"><p>x</p></main>',
  );
  assert.match(extractMainContent(nested)?.inner ?? "", /^<main id="sphinx-myst-preview-content"><p>x<\/p><\/main>/u);
  assert.equal(shellKey(nested), shellKey(html));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-022
test("T34: the runtime context key covers the startup settings and nothing the page follows itself", () => {
  const base = {
    documentId: "file:///a.md",
    activeSourceFile: "/a.md",
    scrollPreviewWithEditor: true,
    scrollEditorWithPreview: true,
    markEditorSelection: false,
    stickyHeadingDepth: 3,
  };
  const key = runtimeContextKey(base);
  assert.equal(runtimeContextKey({ ...base }), key);
  // Undefined and absent settings are the same setting.
  assert.equal(runtimeContextKey({ documentId: base.documentId, activeSourceFile: base.activeSourceFile }),
    runtimeContextKey({ ...base, scrollPreviewWithEditor: undefined, scrollEditorWithPreview: undefined,
      markEditorSelection: undefined, stickyHeadingDepth: undefined }));
  for (const change of [
    { documentId: "file:///b.md" },
    { activeSourceFile: "/b.md" },
    { scrollPreviewWithEditor: false },
    { scrollEditorWithPreview: false },
    { markEditorSelection: true },
    { stickyHeadingDepth: 2 },
  ]) {
    assert.notEqual(runtimeContextKey({ ...base, ...change }), key, JSON.stringify(change));
  }
  // Fields outside the key (identifiers, theme, pairing, anchor) are not even inputs.
  assert.equal(runtimeContextKey({ ...base, revision: 9, requestId: 4, themeKind: 2, initialAnchor: 7 } as never), key);
});

test("T34: status lines that the runtime would reject keep the patch from being sent", () => {
  const line = { severity: "error", text: "a.md:1: message" };
  assert.equal(diagnosticsFitPatch([]), true);
  assert.equal(diagnosticsFitPatch([line]), true);
  assert.equal(diagnosticsFitPatch(Array.from({ length: 500 }, () => line)), true);
  assert.equal(diagnosticsFitPatch(Array.from({ length: 501 }, () => line)), false);
  assert.equal(diagnosticsFitPatch([{ ...line, text: "x".repeat(20_001) }]), false);
  assert.equal(diagnosticsFitPatch([{ ...line, severity: "x".repeat(51) }]), false);
});

test("T34: a ready report with the identifiers of the last assignment is a webview that was created again", () => {
  const state = {
    documentId: "file:///a.md",
    stageRequestId: 9,
    assignedRequestId: 4,
    reportedReady: true,
  };
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 4 }, state), true);
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 9 }, state), false, "the current stage");
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 7 }, state), false, "another stage");
  assert.equal(reportsReloadedDocument({ documentId: "file:///b.md", requestId: 4 }, state), false, "another document");
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 4 }, { ...state, reportedReady: false }),
    false, "the first report of a document is normal");
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 4 }, { ...state, stageRequestId: 4 }),
    false, "no patch happened since the assignment");
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 4 }, { ...state, assignedRequestId: undefined }),
    false);
  assert.equal(reportsReloadedDocument({ documentId: "file:///a.md", requestId: 4 }, { ...state, stageRequestId: undefined }),
    false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-022
test("T34: the record of a patched page carries the nonce of the loaded page and keeps its shell", async () => {
  const loaded = await page("# Loaded\n\nText.\n", { requestId: 1, version: 1 });
  const next = await page("# Next\n\nOther text.\n", { requestId: 2, version: 2 });
  const nonceOf = (html: string): string => /<script nonce="([^"]+)"/u.exec(html)![1]!;
  const recorded = reuseNonce(next, nonceOf(next), nonceOf(loaded));
  assert.equal(nonceOf(recorded), nonceOf(loaded));
  assert.equal(recorded.includes(nonceOf(next)), false, "no trace of the render's own nonce");
  assert.match(recorded, new RegExp("'nonce-" + nonceOf(loaded) + "'", "u"), "the policy names the loaded nonce");
  assert.equal(shellKey(recorded), shellKey(next));
  assert.equal(canPatch(recorded, next), true, "the next patch compares against the record");
  assert.equal(reuseNonce(next, "", nonceOf(loaded)), next);
  assert.equal(reuseNonce(next, nonceOf(next), ""), next);
});

test("T34: reuseNonce swaps every occurrence, in the policy tokens and in the attributes", () => {
  const html = "<meta http-equiv=\"Content-Security-Policy\" content=\"style-src x 'nonce-OLD123'; script-src x 'nonce-OLD123'\">"
    + "<style nonce=\"OLD123\"></style><script nonce=\"OLD123\" src=\"a.js\"></script><script nonce=\"OLD123\"></script>";
  const swapped = reuseNonce(html, "OLD123", "NEW456");
  assert.equal(swapped.includes("OLD123"), false);
  assert.equal(swapped.match(/'nonce-NEW456'/gu)?.length, 2);
  assert.equal(swapped.match(/nonce="NEW456"/gu)?.length, 3);
  assert.equal(swapped.replaceAll("NEW456", "OLD123"), html);
});

// @tests_req SwRS-MDOKFSTUDIO-THEME-043
test("T08: two renders with different zoom have the same shell key and the same context key", async () => {
  const first = await page("# Title\n\nText.\n", { requestId: 21, version: 21, zoom: 100 });
  const second = await page("# Title\n\nText.\n", { requestId: 23, version: 23, zoom: 130 });
  assert.match(first, /data-sphinx-preview-zoom-out/u);
  assert.match(first, /data-sphinx-preview-toolbar-row="appearance"/u);
  assert.equal(shellKey(first), shellKey(second));
  assert.equal(canPatch(first, second), true);
  const base = { documentId: "file:///a.md", activeSourceFile: "/a.md" };
  assert.equal(
    runtimeContextKey({ ...base, initialViewPreferences: { zoom: 100 } } as never),
    runtimeContextKey({ ...base, initialViewPreferences: { zoom: 130 } } as never),
  );
});

test("the page script is injected verbatim even when it contains replacement patterns", () => {
  // A minified script uses `$` as an identifier, so `$&`, "$'" and "$$" occur in real pages.
  const tricky = "/tmp/a$&b$'c$$d$`e.md";
  const built = buildPreviewWebviewHtml(
    "<html><head></head><body><main>x</main></body></html>",
    "/tmp/out",
    assets,
    { documentId: "file:///a.md", revision: 1, requestId: 1, activeSourceFile: tricky },
    undefined,
    undefined,
    960,
  );
  assert.ok(built.html.includes(JSON.stringify(tricky)), "the source path reaches the page script unchanged");
  assert.equal(built.html.split("</body>").length, 2, "the closing tag is not duplicated by a replacement pattern");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-069
test("P-03: a plan parses the new page only, because the loaded page was analyzed as the previous new page", async () => {
  const first = await page("# Title\n\nFirst.\n", { requestId: 1001 });
  const second = await page("# Title\n\nSecond.\n", { requestId: 1003 });
  const third = await page("# Title\n\nThird.\n", { requestId: 1005 });
  const nonce = /nonce="([^"]+)"/u.exec(second)?.[1] ?? "";
  const loadedNonce = /nonce="([^"]+)"/u.exec(first)?.[1] ?? "";
  assert.notEqual(nonce, "");

  assert.ok(planContentPatch(first, second));
  // The host records the patched page with the nonce of the page that is loaded.
  const recorded = reuseNonce(second, nonce, loadedNonce);
  const before = parsedPageCount();
  const plan = planContentPatch(recorded, third);

  assert.ok(plan);
  assert.match(plan.contentHtml, /Third\./u);
  assert.equal(parsedPageCount() - before, 1);
});
