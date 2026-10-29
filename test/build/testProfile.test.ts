import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  TEST_PROFILE_FLAGS,
  TEST_PROFILE_SETTINGS,
  testProfileLaunchArgs,
  testProfileUserSettings,
  writeTestProfileSettings,
} from "../shared/testProfile";

test("the test profile switches off the focus thieves of the real VS Code windows", () => {
  assert.deepEqual(testProfileUserSettings(), {
    "chat.disableAIFeatures": true,
    "workbench.secondarySideBar.defaultVisibility": "hidden",
    "github.copilot.enable": { "*": false },
    "github.copilot.nextEditSuggestions.enabled": false,
    "editor.inlineSuggest.enabled": false,
    "workbench.startupEditor": "none",
    "workbench.welcomePage.walkthroughs.openOnInstall": false,
    "workbench.tips.enabled": false,
    "update.mode": "none",
    "update.showReleaseNotes": false,
    "extensions.ignoreRecommendations": true,
    "extensions.autoCheckUpdates": false,
    "extensions.autoUpdate": "off",
    "telemetry.telemetryLevel": "off",
    "workbench.enableExperiments": false,
    "git.openRepositoryInParentFolders": "never",
    "security.workspace.trust.startupPrompt": "never",
  });
  assert.deepEqual(testProfileLaunchArgs(), ["--disable-extension=GitHub.copilot-chat"]);
});

test("every entry of the test profile has a reason, and nothing touches the trust state", () => {
  for (const entry of [...TEST_PROFILE_SETTINGS, ...TEST_PROFILE_FLAGS]) {
    assert.ok(entry.reason.length > 10, entry.name);
  }
  const names = [...TEST_PROFILE_SETTINGS, ...TEST_PROFILE_FLAGS].map((entry) => entry.name);
  assert.equal(new Set(names).size, names.length, "no duplicate entry");
  // The Restricted Mode window must stay untrusted, and the Git extension must open repositories.
  for (const forbidden of ["security.workspace.trust.enabled", "--disable-workspace-trust", "git.autoRepositoryDetection"]) {
    assert.ok(!names.some((name) => name.startsWith(forbidden)), forbidden);
  }
});

test("the test profile lands in the user settings of a fresh user-data directory", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-profile-"));
  try {
    writeTestProfileSettings(directory);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, "User", "settings.json"), "utf8")),
      testProfileUserSettings());
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
