/**
 * Host test of CR-479: a message handed to the preview through the test hook is applied once the
 * show of the render the queue announced has ended. The host drops a page message whose requestId
 * differs from the shown stage's, and that stage is set at the end of the show, after the queue
 * reports `ready`: a test that waits on the queue and sends at once would be refused.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

// The harness first: it installs the fake `vscode` module the production imports below need.
import { REFRESH_COMMAND_ID, startStudio, writeFile } from "./lifeReqHarness";
import { sendPreviewMessageForTests, setCurrentActivation } from "../../src/host-vscode/testHooks";

const SOURCE = "---\ntitle: Old\n---\n\n# Title\n\nBody.\n";
const STALE = "The preview changed while this field was being edited. Reopen the field.";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
test("a page message sent when the queue is ready, while the show is held, is applied after the show", async (t) => {
  const studio = startStudio(t.mock.timers);
  setCurrentActivation(studio.activation);
  t.after(() => {
    setCurrentActivation(undefined);
    studio.close();
  });
  const { panel } = await studio.openSide(writeFile(SOURCE));
  const preview = studio.manager.active!;
  const shownBefore = preview.stage!.requestId;

  // Hold the show of the next render: the queue reports it ready, the page still shows the old stage.
  const rendering = studio.manager.rendering as unknown as { showPreview: (...args: unknown[]) => Promise<void> };
  const realShow = rendering.showPreview.bind(rendering);
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  rendering.showPreview = async (...args) => {
    await gate;
    return realShow(...args);
  };
  void studio.runCommand(REFRESH_COMMAND_ID);
  await studio.until(() => {
    studio.timers.tick(50);
    const state = preview.queue.getState();
    return state.phase === "ready" && state.request !== undefined && state.request.requestId > shownBefore;
  }, "the queue to be ready for a newer render");
  const queued = preview.queue.getState().request!.requestId;
  assert.equal(preview.stage!.requestId, shownBefore, "the page still shows the previous stage");

  const posted = panel.posted.length;
  const sent = sendPreviewMessageForTests({
    type: "previewFrontmatterSave",
    documentId: preview.documentUri,
    revision: preview.stage!.activeDocumentRevision,
    requestId: queued,
    editId: "e-1",
    fieldName: "title",
    fieldValue: "New",
  });
  assert.ok(sent, "the message was handed to the preview");
  release();
  await sent;
  await studio.settle();
  const answers = panel.posted.slice(posted).filter((message) => message.type === "previewFrontmatterResult");
  assert.ok(answers.length > 0, "the save was answered");
  assert.ok(answers.every((answer) => answer.error !== STALE), `the save was not refused as stale: ${JSON.stringify(answers)}`);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
test("a page message sent with no show pending is handled before any await", async (t) => {
  const studio = startStudio(t.mock.timers);
  setCurrentActivation(studio.activation);
  t.after(() => {
    setCurrentActivation(undefined);
    studio.close();
  });
  await studio.openSide(writeFile(SOURCE));
  const preview = studio.manager.active!;
  assert.equal(studio.manager.rendering.hasPendingShow(preview), false, "no show is pending");
  const manager = studio.manager as unknown as { handlePageMessage: (...args: unknown[]) => unknown };
  const real = manager.handlePageMessage.bind(manager);
  let handled = 0;
  manager.handlePageMessage = (...args) => {
    handled += 1;
    return real(...args);
  };
  void sendPreviewMessageForTests({ type: "unknownMessageForTest" });
  assert.equal(handled, 1, "the message was handled synchronously");
});
