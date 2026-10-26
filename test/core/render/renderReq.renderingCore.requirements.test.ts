/**
 * Requirement tests of the rendering core: the stylesheet rules of the content layout, the engine
 * warm-up, the size limit of included files, the palette mode, alerts in included files and context
 * tags, unsupported include forms and unsupported raw HTML. Each test asserts the behaviour of the
 * current code.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { createEngineLoader, loadEngine, preloadMystEngine } from "../../../src/core/render/mystEngine";
import { renderMyst, type MystRenderContext } from "../../../src/core/render/mystRenderer";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { MAX_INCLUDED_FILE_BYTES } from "../../../src/core/security/resource-policy";
import { findElement, findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, isTag, workspaceRoot } from "./mystFeaturesSupport";

const root = "/virtual";

function virtualContext(files: Record<string, string>): MystRenderContext {
  return {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = path.posix.resolve(path.posix.dirname(from), request);
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
  };
}

async function renderOnDisk(markdown: string, folder: string, requestId = 1) {
  const file = path.join(folder, "main.md");
  fs.writeFileSync(file, markdown);
  return renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: file }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: folder,
    requestId,
    isWorkspaceTrusted: () => true,
  });
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-034
test("the content stylesheet lets paragraphs, including CJK text, wrap inside the pane", () => {
  const rule = /#sphinx-myst-preview-content :is\(([^)]*)\)\s*\{([^}]*)\}/u.exec(PREVIEW_THEME_CSS);
  assert.ok(rule, "a wrapping rule for the content blocks exists");
  assert.match(rule[1], /\bp\b/u);
  assert.match(rule[1], /\bli\b/u);
  assert.match(rule[2], /overflow-wrap:\s*anywhere/u);
  assert.doesNotMatch(rule[2], /white-space:\s*nowrap/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-028
test("the content stylesheet tightens list paragraphs and indents every list level by 2em", () => {
  assert.match(PREVIEW_THEME_CSS, /#sphinx-myst-preview-content :where\(ul, ol\)\s*\{\s*padding-inline-start:\s*2em;/u);
  assert.match(PREVIEW_THEME_CSS, /#sphinx-myst-preview-content li > p\s*\{\s*margin-bottom:\s*0\.3em;/u);
  assert.match(PREVIEW_THEME_CSS, /#sphinx-myst-preview-content li > p:last-child\s*\{\s*margin-bottom:\s*0;/u);
});

test("the warm-up loads the engine once, shares it with the render and a warm-up call never throws", async () => {
  assert.doesNotThrow(() => preloadMystEngine());
  assert.doesNotThrow(() => preloadMystEngine());
  const first = loadEngine();
  assert.equal(await loadEngine(), await first, "every caller shares the one loaded engine");
  const engine = await first;
  assert.equal(typeof engine.mystParse, "function");
  assert.equal(typeof engine.mystToHtml, "function");
});

test("a failed engine load is not cached: the next render retries it", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-001
  const engine = { mystParse: () => ({}), mystToHtml: () => "" } as unknown as Awaited<ReturnType<typeof loadEngine>>;
  let calls = 0;
  const load = createEngineLoader(async () => {
    calls += 1;
    if (calls === 1) throw new Error("warm-up failed");
    return engine;
  });
  await assert.rejects(load(), /warm-up failed/u);
  assert.equal(await load(), engine, "the call after a failed warm-up loads the engine again");
  assert.equal(await load(), engine);
  assert.equal(calls, 2, "a loaded engine is shared, not imported again");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-013
test("an included file over 5 MiB stays a placeholder and a file of exactly 5 MiB is expanded", async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "okf-include-limit-"));
  try {
    const body = "Included-marker-text. ";
    const fill = (size: number): string => body + "x".repeat(size - body.length);
    fs.writeFileSync(path.join(folder, "big.md"), fill(MAX_INCLUDED_FILE_BYTES + 1));
    fs.writeFileSync(path.join(folder, "exact.md"), fill(MAX_INCLUDED_FILE_BYTES));
    assert.equal(fs.statSync(path.join(folder, "big.md")).size, MAX_INCLUDED_FILE_BYTES + 1);

    const over = await renderOnDisk("```{include} big.md\n```\n", folder, 1);
    assert.doesNotMatch(over.html, /Included-marker-text/u, "the oversize file is not expanded");
    assert.match(over.html, /include/u, "the directive stays as a placeholder");

    const exact = await renderOnDisk("```{include} exact.md\n```\n", folder, 2);
    assert.match(exact.html, /Included-marker-text/u, "a file of exactly 5 MiB is expanded");
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-001
test("the rendered HTML is the same whatever the palette mode: the render takes no mode", async () => {
  const markdown = "# Title\n\n> [!NOTE]\n> Alert.\n\n- [ ] task\n\n$x^2$ and ~~gone~~ and :::{note}\n";
  const outputs: string[] = [];
  for (let mode = 0; mode < 3; mode += 1) { // strict, gfm, myst: the mode is not an input of the render
    const result = await renderPreviewDocument({
      document: inlineDocument(markdown),
      workspaceRoot,
      requestId: 5,
      isWorkspaceTrusted: () => true,
    });
    outputs.push(result.html);
  }
  assert.equal(outputs[0], outputs[1]);
  assert.equal(outputs[1], outputs[2]);
  assert.doesNotMatch(outputs[0], /palette-mode|paletteMode/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-012
test("a GitHub alert in an included file or in a grouped context tag renders as a note panel", async () => {
  const included = await renderMyst("```{include} part.md\n```\n", virtualContext({
    [`${root}/part.md`]: "> [!NOTE]\n> Included alert.\n",
  }));
  const includedNote = findElement(parseHtml(included.html), (element) =>
    hasClass(element, "admonition") && hasClass(element, "note"));
  assert.ok(includedNote, "the alert of the included file is a note panel");
  assert.match(textContent(includedNote), /Included alert\./u);

  const grouped = await renderMyst("<example-ctx>\n\n> [!NOTE]\n> Grouped alert.\n\n</example-ctx>\n");
  const context = findElement(parseHtml(grouped.html), (element) => hasClass(element, "myst-context-admonition"));
  assert.ok(context, "the context tag is grouped into an admonition");
  const note = findElement(context, (element) => hasClass(element, "admonition") && hasClass(element, "note"));
  assert.ok(note, "the alert inside the context tag is a note panel");
  assert.match(textContent(note), /Grouped alert\./u);
});

test("an include with :literal:, an empty argument or an other option stays a placeholder; :class: expands", async () => {
  const files = { [`${root}/part.md`]: "Included-text.\n" };
  const expanded = async (directive: string): Promise<boolean> =>
    (await renderMyst(`\`\`\`{include} ${directive}\n\`\`\`\n`, virtualContext(files))).html.includes("Included-text");

  assert.equal(await expanded("part.md\n:literal:"), false, ":literal:");
  assert.equal(await expanded("part.md\n:start-line: 0"), false, "an option other than :class: and :label:");
  assert.equal(await expanded(""), false, "an empty argument");
  assert.equal(await expanded("part.md\n:class: wide"), true, ":class: only");
  assert.equal(await expanded("part.md\n:label: part-label"), true, ":label: only");
  assert.equal(await expanded("part.md"), true, "a plain include");

  const empty = await renderMyst("Before.\n\n```{include}\n```\n\nAfter.\n", virtualContext(files));
  assert.match(empty.html, /myst-unresolved/u, "the empty include leaves the placeholder");
  assert.match(empty.html, /Before\./u);
  assert.match(empty.html, /After\./u, "the rest of the document renders");
  assert.ok(empty.diagnostics.some((entry) => entry.severity === "warning" && entry.line === 3), "a warning on the directive line");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-029
test("raw HTML outside the supported subset is dropped and a kbd element is kept", async () => {
  const dropped = await renderMyst('<iframe src="https://example.com/x"></iframe>\n\nAfter.\n');
  assert.doesNotMatch(dropped.html, /iframe/u);
  assert.match(dropped.html, /After\./u);

  const kept = await renderMyst("Press <kbd>Ctrl</kbd> and <marquee>moving</marquee> now.\n");
  const dom = parseHtml(kept.html);
  assert.equal(textContent(findElement(dom, isTag("kbd"))!), "Ctrl");
  assert.equal(findElements(dom, isTag("marquee")).length, 0);
});
