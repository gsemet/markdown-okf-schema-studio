/**
 * Requirement test of the GFM scope: unsupported raw HTML is omitted from the rendering
 * (`mystBlockTransforms.ts`). The test asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { findElement, findElements, parseHtml, textContent } from "./dom";
import { isTag } from "./mystFeaturesSupport";

// @tests_req SwRS-MDOKFSTUDIO-GFM-029
test("a div block and an inline marquee element are absent from the HTML, while kbd stays", async () => {
  const unsupported = await renderMyst('<div class="x">Block text</div>\n\nA <marquee>moving</marquee> word.\n');
  const dom = parseHtml(unsupported.html);
  const content = findElement(dom, (element) => element.tagName === "body")!;
  assert.equal(findElements(content, isTag("marquee")).length, 0, "no marquee element");
  assert.doesNotMatch(unsupported.html, /<marquee|<div class="x"/u);

  const mixed = await renderMyst("Press <kbd>Esc</kbd> then <marquee>x</marquee>.\n");
  const mixedDom = parseHtml(mixed.html);
  assert.equal(textContent(findElement(mixedDom, isTag("kbd"))!), "Esc");
  assert.equal(findElements(mixedDom, isTag("marquee")).length, 0);
});
