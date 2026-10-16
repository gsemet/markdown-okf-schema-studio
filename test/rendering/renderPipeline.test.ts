import * as assert from "node:assert/strict";
import { test } from "node:test";

import { invalidateConfCache } from "../../src/myst/confLocator";
import {
  renderPreviewDocument,
  RenderCanceledError,
  RenderError,
  resetRenderHooksForTests,
  setRenderOverrideForTests,
  WorkspaceTrustError,
  type RenderOptions,
} from "../../src/render/renderPipeline";

function options(overrides: Partial<RenderOptions> = {}): RenderOptions {
  return {
    document: {
      uri: { scheme: "file", fsPath: "/workspace/active.md" },
      languageId: "markdown",
      version: 7,
      getText: () => "# Unsaved buffer\n",
    },
    workspaceRoot: "/workspace",
    requestId: 11,
    documentIdentity: "file:///active.md",
    isWorkspaceTrusted: () => true,
    ...overrides,
  };
}

test("the render pipeline retains buffer identity and attaches source diagnostics", async (context) => {
  context.after(resetRenderHooksForTests);
  let observed = "";
  setRenderOverrideForTests(async (source) => {
    observed = source;
    return { html: "<h1>Unsaved buffer</h1>", diagnostics: [{
      code: "renderer-warning", severity: "warning", line: 3, message: "Unknown directive",
    }] };
  });
  const result = await renderPreviewDocument(options());
  assert.equal(observed, "# Unsaved buffer\n");
  assert.equal(result.html, "<h1>Unsaved buffer</h1>");
  assert.equal(result.stage.activeDocumentIdentity, "file:///active.md");
  assert.equal(result.stage.activeDocumentVersion, 7);
  assert.equal(result.stage.requestId, 11);
  assert.equal(result.stage.sourceText, observed);
  assert.deepEqual(result.diagnostics, [{
    code: "myst-diagnostic", severity: "warning", line: 3,
    message: "Unknown directive", file: result.stage.activeDocumentPath,
  }]);
});

test("the trust gate prevents renderer invocation unless reduced mode is allowed", async (context) => {
  context.after(resetRenderHooksForTests);
  let calls = 0;
  setRenderOverrideForTests(async () => { calls += 1; return { html: "<p>Reduced</p>" }; });
  await assert.rejects(renderPreviewDocument(options({ isWorkspaceTrusted: () => false })), WorkspaceTrustError);
  assert.equal(calls, 0);
  const result = await renderPreviewDocument(options({
    isWorkspaceTrusted: () => false, allowUntrusted: true,
  }));
  assert.equal(result.html, "<p>Reduced</p>");
  assert.equal(calls, 1);
});

test("renderer failures preserve the stage and original failure message", async (context) => {
  context.after(resetRenderHooksForTests);
  setRenderOverrideForTests(async () => { throw new Error("Renderer unavailable"); });
  await assert.rejects(renderPreviewDocument(options()), (error: unknown) => {
    assert.ok(error instanceof RenderError);
    assert.equal(error.message, "Renderer unavailable");
    assert.equal(error.stage.sourceText, "# Unsaved buffer\n");
    assert.equal(error.stage.requestId, 11);
    assert.deepEqual(error.diagnostics, []);
    return true;
  });
});

test("cancellation while rendering rejects a late successful result", async (context) => {
  context.after(resetRenderHooksForTests);
  let finish: ((value: { html: string }) => void) | undefined;
  setRenderOverrideForTests(() => new Promise((resolve) => { finish = resolve; }));
  const controller = new AbortController();
  const render = renderPreviewDocument(options({ signal: controller.signal }));
  assert.ok(finish);
  controller.abort();
  finish({ html: "<p>Late result</p>" });
  await assert.rejects(render, RenderCanceledError);
});

test("MyST syntax missing from the nearest conf.py warns once per extension, rendering unchanged", async (context) => {
  context.after(resetRenderHooksForTests);
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "myst-autodetect-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = "# T\n\nIntro\n\n:::{note}\nhi\n:::\n\nTerm\n: Definition\n\nsome ~~gone~~ text\n";
  const render = (): ReturnType<typeof renderPreviewDocument> => renderPreviewDocument({
    ...options(),
    document: {
      uri: { scheme: "file", fsPath: path.join(root, "doc.md") },
      languageId: "markdown",
      getText: () => source,
    },
    workspaceRoot: root,
  });
  const without = await render();
  assert.deepEqual(without.diagnostics.filter((entry) => entry.code === "myst-extension"), []);

  fs.writeFileSync(path.join(root, "conf.py"), [
    "extensions = ['myst_parser']",
    "myst_enable_extensions = ['deflist', 'dollarmath']",
  ].join("\n"));
  invalidateConfCache();
  const warned = await render();
  const warnings = warned.diagnostics.filter((entry) => entry.code === "myst-extension");
  assert.deepEqual(warnings.map((entry) => [entry.severity, entry.line, entry.message]), [
    ["warning", 5, "Warning: `:::` is used but this needs the MyST extension `colon_fence`, which is not enabled in your conf.py. Add \"colon_fence\" to `myst_enable_extensions`."],
    ["warning", 12, "Warning: `~~` is used but this needs the MyST extension `strikethrough`, which is not enabled in your conf.py. Add \"strikethrough\" to `myst_enable_extensions`."],
  ]);
  assert.equal(warned.html, without.html);

  fs.writeFileSync(path.join(root, "conf.py"), "extensions = ['myst_parser']\nmyst_enable_extensions = load()\n");
  invalidateConfCache();
  const uncertain = await render();
  assert.deepEqual(uncertain.diagnostics.filter((entry) => entry.code === "myst-extension"), []);
});
