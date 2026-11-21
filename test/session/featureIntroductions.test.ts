import * as assert from "node:assert/strict";
import { test } from "node:test";

import { FEATURE_INTRODUCTIONS, FeatureIntroductions } from "../../src/session/featureIntroductions";
import { MemoryStore, recordingLogger, recordingUi } from "./memoryPorts";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("an introduction shows once, the key is stored before the message, and a second call shows nothing", async () => {
  const store = new MemoryStore();
  const shown: string[] = [];
  const intros = new FeatureIntroductions(store, recordingUi(shown, store.log), recordingLogger());
  assert.equal(await intros.showOnce("openInStudio"), true);
  assert.deepEqual(shown, [`showInformation: ${FEATURE_INTRODUCTIONS.openInStudio}`]);
  assert.deepEqual(store.log, ["update markdownOkfSchemaStudio.introductions.openInStudio", "show"]);
  assert.equal(await intros.showOnce("openInStudio"), false);
  assert.equal(shown.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("an introduction already stored shows nothing in a later session", async () => {
  const store = new MemoryStore();
  await new FeatureIntroductions(store, recordingUi([]), recordingLogger()).showOnce("openInStudio");
  const later: string[] = [];
  assert.equal(await new FeatureIntroductions(store, recordingUi(later), recordingLogger()).showOnce("openInStudio"), false);
  assert.deepEqual(later, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("resetting forgets every introduction key and nothing else, so each shows once more", async () => {
  const store = new MemoryStore();
  store.values.set("markdownOkfSchemaStudio.view.mode", "dark");
  const shown: string[] = [];
  const intros = new FeatureIntroductions(store, recordingUi(shown), recordingLogger());
  await intros.showOnce("openInStudio");
  await intros.resetAll();
  assert.deepEqual(store.keys(), ["markdownOkfSchemaStudio.view.mode"]);
  assert.equal(await intros.showOnce("openInStudio"), true);
  assert.equal(shown.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("a store that cannot write is logged and the message still shows once in the session", async () => {
  const store = new MemoryStore();
  store.failWrites = true;
  const shown: string[] = [];
  const errors: string[] = [];
  const intros = new FeatureIntroductions(store, recordingUi(shown), recordingLogger(errors));
  assert.equal(await intros.showOnce("openInStudio"), true);
  assert.equal(await intros.showOnce("openInStudio"), false);
  assert.equal(shown.length, 1);
  assert.equal(errors.length, 1);
});
