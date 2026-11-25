/**
 * Host test of CR-479: the Open Preview to Side command completes once the page shows the
 * document. The real activation runs against the fake `vscode` module; the command is not awaited
 * (a plain await deadlocks on the debounce of the mock clock), the page is read when it settles.
 */
import * as assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { COMMAND_ID, fake, REFRESH_COMMAND_ID, startStudio, writeFile } from "./lifeReqHarness";

const SOURCE = "# Title\n\n:::{note}\nThis admonition must be rendered.\n:::\n";

/** Runs `command`, moves the clock until it settles and returns the page HTML read on settling. */
async function pageWhenSettled(t: TestContext, command: () => Promise<unknown>, studio: ReturnType<typeof startStudio>): Promise<string> {
  let html: string | undefined;
  void command().then(() => {
    html = fake.controls.panels.at(-1)!.htmlAssignments.at(-1)!;
  });
  for (let step = 0; step < 100 && html === undefined; step += 1) {
    studio.timers.tick(50);
    let turns = 0;
    await studio.until(() => html !== undefined || (turns += 1) > 50, "the command to settle");
  }
  assert.ok(html !== undefined, "the command settled");
  t.diagnostic(`page of ${html.length} characters`);
  return html;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S8
// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S15
test("Open Preview to Side completes once the page shows the rendered document, not the pending status page", async (t) => {
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  await fake.controls.showDocument(writeFile(SOURCE));
  const html = await pageWhenSettled(t, () => studio.runCommand(COMMAND_ID), studio);
  assert.doesNotMatch(html, /data-sphinx-preview-status-page/u, "the page is not the status page");
  assert.match(html, /admonition/u, "the page shows the admonition of the source");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S4
test("Open Preview to Side on the shown document again, and Refresh Preview, complete once the page shows the document", async (t) => {
  const studio = startStudio(t.mock.timers);
  t.after(() => studio.close());
  await studio.openSide(writeFile(SOURCE));
  const again = await pageWhenSettled(t, () => studio.runCommand(COMMAND_ID), studio);
  assert.match(again, /admonition/u, "the same document again: the page shows the admonition");
  const refreshed = await pageWhenSettled(t, () => studio.runCommand(REFRESH_COMMAND_ID), studio);
  assert.match(refreshed, /admonition/u, "Refresh Preview: the page shows the admonition");
});
