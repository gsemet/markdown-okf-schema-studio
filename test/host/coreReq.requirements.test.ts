/**
 * Requirement tests of the rendering core that need the extension host: the error page of a first
 * render that fails, and the find widget of the custom editor. They run the real activation against
 * the fake `vscode` module (`lifeReqHarness.ts`) and assert what the code does today.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

import {
  captured,
  COMMAND_ID,
  fake,
  REFRESH_COMMAND_ID,
  setRenderOverrideForTests,
  startStudio,
  writeFile,
  type Studio,
} from "./lifeReqHarness";

function start(t: TestContext): Studio {
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  return studio;
}

async function openFailingFirstRender(studio: Studio, failure: unknown): Promise<string> {
  setRenderOverrideForTests(() => Promise.reject(failure));
  await fake.controls.showDocument(writeFile("# Never shown\n\nBody text.\n"));
  const before = fake.controls.panels.length;
  void studio.runCommand(COMMAND_ID);
  await studio.until(() => fake.controls.panels.length > before, "the preview panel");
  const panel = fake.controls.panels.at(-1)!;
  await studio.advance(300);
  await studio.until(() => studio.manager.active?.status === "error", "the error status");
  return panel.htmlAssignments.at(-1) ?? "";
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-025
test("a first render that throws shows the error page with its message", async (t) => {
  const studio = start(t);
  const html = await openFailingFirstRender(studio, new Error("engine exploded"));
  assert.match(html, /Preview unavailable/u);
  assert.match(html, /engine exploded/u);
  assert.doesNotMatch(html, /Preview is stale/u, "no earlier page exists to keep");
  assert.doesNotMatch(html, /Body text\./u);
});

for (const [label, failure] of [["undefined", undefined], ["null", null], ["an Error with an empty message", new Error("")]] as const) {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-025
  test(`a first render that throws ${label} shows the fallback 'The render failed.'`, async (t) => {
    const studio = start(t);
    const html = await openFailingFirstRender(studio, failure);
    assert.match(html, /Preview unavailable/u);
    assert.match(html, /data-sphinx-preview-status-message>The render failed\.</u);
    assert.doesNotMatch(html, /undefined|null/u, "the thrown value is not shown as text");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-025
test("a failure with a text but no Error keeps that text", async (t) => {
  const studio = start(t);
  const html = await openFailingFirstRender(studio, "plain text failure");
  assert.match(html, /data-sphinx-preview-status-message>plain text failure</u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-025
test("a later render that fails without a message keeps the old page stale with 'The latest render failed.'", async (t) => {
  const studio = start(t);
  await studio.openSide(writeFile("# Good page\n\nGood body.\n"));
  await studio.advance(100);
  const panel = fake.controls.panels.at(-1)!;
  setRenderOverrideForTests(() => Promise.reject(undefined));
  const done = studio.runCommand(REFRESH_COMMAND_ID);
  await studio.advance(300);
  await done;
  await studio.until(() => studio.manager.active?.status === "stale", "the stale status");
  const html = panel.htmlAssignments.at(-1) ?? "";
  assert.match(html, /Good body\./u, "the earlier page stays");
  assert.match(html, /data-sphinx-preview-status-message>The latest render failed\.</u);
  assert.doesNotMatch(html, /undefined/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-043
test("the custom editor and the preview panel are created with the find widget enabled", async (t) => {
  const studio = start(t);
  const editorOptions = captured.editorOptions as { webviewOptions?: { enableFindWidget?: boolean } } | undefined;
  assert.equal(editorOptions?.webviewOptions?.enableFindWidget, true, "the custom editor registration enables find");

  await studio.openSide(writeFile("# Find me\n"));
  assert.equal(captured.panelOptions.at(-1)?.enableFindWidget, true, "the preview panel enables find");
});
