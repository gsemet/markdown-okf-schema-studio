import assert from "node:assert/strict";
import test from "node:test";

import { reviewIndexText, visualSummary } from "./reviewIndexText";

const visual = { scenarioCount: 241, screenshotCount: 137, stepPngCount: 30, revision: "abcdef123456", completedAt: "2026-10-22T10:00:00Z" };

test("the counts come from the manifest", () => {
  assert.equal(visualSummary(visual), "241 scenarios, 167 images (137 primary + 30 step), 104 assertion-only");
  assert.equal(visualSummary({}), "0 scenarios, 0 images (0 primary + 0 step), 0 assertion-only");
});

test("the PO gallery is item 0, ahead of the static cases, and no stale count remains", () => {
  const text = reviewIndexText({
    status: "passed",
    campaign: { runId: "r", startedAt: "s", command: "npm run test:e2e" },
    integration: { revision: "abcdef123456", dirty: false },
    visual,
    failures: [],
  });
  assert.ok(text.indexOf("0. [Product-owner gallery by feature](GALLERY.md)") > 0);
  assert.ok(text.indexOf("0. [Product-owner") < text.indexOf("1. [Static document"));
  assert.match(text, /241 scenarios, 167 images/u);
  assert.doesNotMatch(text, /TXT/u);
  assert.match(text, /Visual run revision: `abcdef1`/u);
  assert.doesNotMatch(text, /different revision/u);
});

test("a visual run from another revision than the integration run is flagged", () => {
  const text = reviewIndexText({
    status: "failed",
    campaign: undefined,
    integration: { revision: "1111111222" },
    visual,
    failures: ["visual run identity does not match review start"],
  });
  assert.match(text, /different revision \(`abcdef1`\) than the integration run \(`1111111`\)/u);
  assert.match(text, /Freshness failures:\n- visual run identity/u);
});

test("a campaign without the real VS Code stage says so", () => {
  const text = reviewIndexText({
    status: "passed",
    campaign: { runId: "r", startedAt: "s", command: "just ci-visual" },
    integration: { status: "skipped" },
    visual,
    failures: [],
    integrationSkipped: true,
  });
  assert.match(text, /Real VS Code stage: \*\*not run\*\*/u);
  assert.doesNotMatch(reviewIndexText({ status: "passed", campaign: undefined, integration: {}, visual, failures: [] }), /not run/u);
});
