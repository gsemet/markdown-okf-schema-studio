import * as assert from "node:assert/strict";
import { test } from "node:test";

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
