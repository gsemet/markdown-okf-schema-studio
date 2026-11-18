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

// @tests_req SwRS-MDOKFSTUDIO-CORE-025
test("a first render that throws a value without a message shows the error page with that value as text", async (t) => {
  const studio = start(t);
  const html = await openFailingFirstRender(studio, undefined);
  assert.match(html, /Preview unavailable/u);
  // Known issue: the render pipeline wraps every failure in an Error whose message is the thrown
  // value as text, so the page reads "undefined" and never the fallback "The render failed.".
  assert.match(html, /data-sphinx-preview-status-message>undefined</u);
  assert.doesNotMatch(html, /The render failed\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-043
test("the custom editor and the preview panel are created with the find widget enabled", async (t) => {
  const studio = start(t);
  const editorOptions = captured.editorOptions as { webviewOptions?: { enableFindWidget?: boolean } } | undefined;
  assert.equal(editorOptions?.webviewOptions?.enableFindWidget, true, "the custom editor registration enables find");

  await studio.openSide(writeFile("# Find me\n"));
  assert.equal(captured.panelOptions.at(-1)?.enableFindWidget, true, "the preview panel enables find");
});
