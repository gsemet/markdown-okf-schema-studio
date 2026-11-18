/**
 * Requirement tests of rendering-core scenario rows no other test checked: the absolute source line
 * after frontmatter with CRLF and CR line breaks, the places where a wikilink is not converted, and
 * the 10 Mi characters include budget. Each test asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { INCLUDE_BUDGET_MAX_CHARS, renderMyst, type MystRenderContext } from "../../../src/core/render/mystRenderer";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, findElements, parseHtml, textContent } from "./dom";
import { inlineDocument, isTag, workspaceRoot } from "./mystFeaturesSupport";

async function render(markdown: string) {
  return renderPreviewDocument({
    document: inlineDocument(markdown),
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-003
test("body source lines stay absolute after a four-line frontmatter with LF, CRLF and CR breaks", async () => {
  const lines = ["---", "type: finding", "status: draft", "---", "Body paragraph.", "", "Second paragraph."];
  for (const [label, eol] of [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const) {
    const result = await render(lines.join(eol) + eol);
    const paragraphs = findElements(parseHtml(result.html), isTag("p"));
    const lineOf = (text: string): string | undefined =>
      attribute(paragraphs.find((element) => textContent(element).includes(text))!, "data-line");
    assert.equal(lineOf("Body paragraph."), "5", `${label}: the first body paragraph is on file line 5`);
    assert.equal(lineOf("Second paragraph."), "7", `${label}: the second body paragraph is on file line 7`);
    assert.doesNotMatch(result.html, /type: finding/u, `${label}: the frontmatter is not in the body`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-010
test("wikilink syntax inside a link, an image, math, raw HTML or an embed is not converted", async () => {
  const result = await render([
    "[see [[InLink]]](target.md)",
    "",
    "![picture [[InImage]]](picture.png)",
    "",
    "$[[InMath]]$",
    "",
    "<div>[[InRawBlock]]</div>",
    "",
    "![[Embedded]]",
    "",
    "[[Plain]]",
    "",
  ].join("\n"));
  const hrefs = findElements(parseHtml(result.html), isTag("a")).map((link) => attribute(link, "href"));
  assert.deepEqual(hrefs.filter((href) => href?.startsWith("wiki:")), ["wiki:Plain"], "only plain text is converted");
  assert.ok(hrefs.includes("target.md"), "the existing link keeps its own target");
  assert.doesNotMatch(result.html, /wiki:(InLink|InImage|InMath|InRawBlock|Embedded)/u);

  // Known issue: the text between two inline HTML tags is plain text to the parser, so it is converted.
  const inline = await render("Before <span>[[InRawInline]]</span> after.\n");
  assert.match(inline.html, /href="wiki:InRawInline"/u);
});

const root = "/virtual";

function virtualContext(files: Record<string, string>): MystRenderContext {
  return {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = path.posix.resolve(path.posix.dirname(from), request);
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-013
test("10 Mi characters of included text expand; the next include is a placeholder with one budget warning", async () => {
  const half = INCLUDE_BUDGET_MAX_CHARS / 2;
  const files = {
    [`${root}/first.md`]: "First-half.\n" + "a".repeat(half - "First-half.\n".length),
    [`${root}/second.md`]: "Second-half.\n" + "b".repeat(half - "Second-half.\n".length),
    [`${root}/tail.md`]: "Tail-text.\n",
    [`${root}/after.md`]: "After-text.\n",
  };
  const include = (name: string): string => `\`\`\`{include} ${name}\n\`\`\`\n`;

  const within = await renderMyst(include("first.md") + "\n" + include("second.md"), virtualContext(files));
  assert.match(within.html, /First-half\./u);
  assert.match(within.html, /Second-half\./u, "exactly 10 Mi characters are within the budget");
  assert.equal(within.diagnostics.length, 0, "no budget warning within the limit");

  const over = await renderMyst(
    [include("first.md"), include("second.md"), include("tail.md"), include("after.md")].join("\n"),
    virtualContext(files),
  );
  assert.doesNotMatch(over.html, /Tail-text/u, "the include past the budget is not expanded");
  assert.doesNotMatch(over.html, /After-text/u, "the remaining includes stay placeholders");
  const budget = over.diagnostics.filter((entry) => /^Include budget exhausted/u.test(entry.message));
  assert.equal(budget.length, 1, "one budget warning");
  assert.equal(over.diagnostics.length, 1);
  assert.ok(findElement(parseHtml(over.html), (element) => element.tagName === "p"), "the expanded text is shown");
});
