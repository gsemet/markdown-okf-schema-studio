import * as assert from "node:assert/strict";
import { test } from "node:test";

import { automationHint } from "../integration/macWindow";

const APP = "the VS Code build at /tmp/code";

test("CR 048: a refused Automation permission (-1743) names the permission and what to allow", () => {
  const refused = Object.assign(new Error("Command failed: osascript -e …"), {
    status: 1,
    stderr: "execution error: Not authorized to send Apple events to System Events. (-1743)\n",
  });
  const hint = automationHint(refused, APP);
  assert.match(hint, /Automation permission/u);
  assert.match(hint, /allow the VS Code build at \/tmp\/code to control "System Events"/u);
  assert.match(hint, /System Settings > Privacy & Security > Automation/u);
});

test("CR 048: an unanswered consent prompt (osascript timed out) gets the same hint", () => {
  const timedOut = Object.assign(new Error("spawnSync osascript ETIMEDOUT"), { code: "ETIMEDOUT" });
  assert.match(automationHint(timedOut, APP), /Automation permission is missing or was not answered/u);
});

test("CR 048: other activation failures carry no permission hint", () => {
  const other = Object.assign(new Error("Command failed"), { status: 1, stderr: "execution error: Can't get process 1. (-1719)" });
  assert.equal(automationHint(other, APP), "");
});
