import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";

const FIXTURE = [
  "> [!NOTE]",
  "> Remember this.",
  "",
  "```md",
  "> [!WARNING]",
  "> not an alert inside a fence",
  "```",
  "",
  "> [!TIP] Custom title",
  "> Body with `code`.",
  "",
  "~~~",
  "> [!NOTE]",
  "~~~",
  "",
  "Text",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("GitHub alerts and fences render identically for LF and CRLF documents", async () => {
  const lf = await renderMyst(FIXTURE);
  const crlf = await renderMyst(FIXTURE.replaceAll("\n", "\r\n"));
  assert.match(lf.html, /admonition/u);
  assert.equal(crlf.html, lf.html);
  // The fence text is highlighted as Markdown, so the marker is split across token spans.
  assert.match(lf.html.replace(/<[^>]*>/gu, ""), /\[!WARNING\]/u);
});

test("a CRLF alert marker becomes an admonition", async () => {
  const { html } = await renderMyst("> [!NOTE]\r\n> Remember this.\r\n\r\nText\r\n");
  assert.match(html, /admonition/u);
});
