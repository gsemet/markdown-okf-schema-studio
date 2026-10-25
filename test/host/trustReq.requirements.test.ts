/**
 * Requirement tests of the trust and security scope that need the extension host: what the status
 * area of the preview lists after a render (through the public seams of the host harness).
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { closeHost, identityOfDocument, openPreview } from "./hostHarness";

/** The status area of the last rendered document the host assigned. */
function statusAreaOf(assignments: readonly string[]): string {
  const html = [...assignments].reverse().find((entry) => identityOfDocument(entry) !== undefined);
  assert.ok(html, "a rendered document was assigned");
  const match = /<aside data-sphinx-preview-status="[^"]*"[\s\S]*?<\/aside>/u.exec(html);
  assert.ok(match, "the document has a status area");
  return match[0];
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-042
test("the status area lists render diagnostics and nothing the sanitizer or the policy removed", async (t) => {
  const markdown = [
    "# Title",
    "",
    "![outside](../../../outside-image.png)",
    "",
    "```{include} missing-part.md",
    "```",
    "",
  ].join("\n");
  const host = await openPreview(t.mock.timers, markdown);
  t.after(() => closeHost(t.mock.timers));
  await host.settle();

  const status = statusAreaOf(host.assignments);
  // The render diagnostics of the missing include are listed.
  assert.match(status, /data-sphinx-preview-diagnostic-code="myst-diagnostic"[^>]*>[^<]*\{include\}/u);
  // The removal of the image outside the roots (blocked-resource) leaves no trace there.
  assert.doesNotMatch(status, /outside-image/u);
  assert.doesNotMatch(status, /blocked-resource|Removed a resource outside/u);
  // The page itself shows no image for it.
  const html = host.assignments.at(-1)!;
  // The image stays without its source.
  assert.match(html, /<img alt="outside">/u);
  assert.doesNotMatch(html, /outside-image\.png/u);
});
