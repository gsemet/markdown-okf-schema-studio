import * as assert from "node:assert/strict";
import { test } from "node:test";

import { FEATURE_INTRODUCTIONS, FeatureIntroductions } from "../../src/session/featureIntroductions";
import { MemoryStore, recordingLogger, recordingUi } from "./memoryPorts";

/** The test's own list: the extension ships none today. */
const OWN = { ownFeature: "A feature of the test." } as const;
const OWN_KEY = "markdownOkfSchemaStudio.introductions.ownFeature";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("an introduction shows once, the key is stored before the message, and a second call shows nothing", async () => {
  const store = new MemoryStore();
  const shown: string[] = [];
  const intros = new FeatureIntroductions(OWN, store, recordingUi(shown, store.log), recordingLogger());
  assert.equal(await intros.showOnce("ownFeature"), true);
  assert.deepEqual(shown, [`showInformation: ${OWN.ownFeature}`]);
  assert.deepEqual(store.log, [`update ${OWN_KEY}`, "show"]);
  assert.equal(await intros.showOnce("ownFeature"), false);
  assert.equal(shown.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("an introduction already stored shows nothing in a later session", async () => {
  const store = new MemoryStore();
  await new FeatureIntroductions(OWN, store, recordingUi([]), recordingLogger()).showOnce("ownFeature");
  const later: string[] = [];
  assert.equal(await new FeatureIntroductions(OWN, store, recordingUi(later), recordingLogger()).showOnce("ownFeature"), false);
  assert.deepEqual(later, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("resetting forgets every introduction key and nothing else, so each shows once more", async () => {
  const store = new MemoryStore();
  store.values.set("markdownOkfSchemaStudio.view.mode", "dark");
  const shown: string[] = [];
  const intros = new FeatureIntroductions(OWN, store, recordingUi(shown), recordingLogger());
  await intros.showOnce("ownFeature");
  await intros.resetAll();
  assert.deepEqual(store.keys(), ["markdownOkfSchemaStudio.view.mode"]);
  assert.equal(await intros.showOnce("ownFeature"), true);
  assert.equal(shown.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("a store that cannot write is logged and the message still shows once in the session", async () => {
  const store = new MemoryStore();
  store.failWrites = true;
  const shown: string[] = [];
  const errors: string[] = [];
  const intros = new FeatureIntroductions(OWN, store, recordingUi(shown), recordingLogger(errors));
  assert.equal(await intros.showOnce("ownFeature"), true);
  assert.equal(await intros.showOnce("ownFeature"), false);
  assert.equal(shown.length, 1);
  assert.equal(errors.length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176
test("the extension ships no introduction today: the shipped list is empty and resetting it shows and writes nothing", async () => {
  assert.deepEqual(Object.keys(FEATURE_INTRODUCTIONS), []);
  const store = new MemoryStore();
  const shown: string[] = [];
  const intros = new FeatureIntroductions(FEATURE_INTRODUCTIONS, store, recordingUi(shown), recordingLogger());
  await intros.resetAll();
  assert.deepEqual([shown, store.log], [[], []], "an empty list shows nothing and writes nothing");
});
