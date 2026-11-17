import * as assert from "node:assert/strict";
import { test } from "node:test";

import { chromium } from "playwright-core";

import { DIAGRAM_SOURCE } from "./fixture";
import { CREAM_DIAGRAM_THEME, parseUseCaseDiagram, renderUseCaseDiagrams } from "./useCaseDiagram";

const FENCE = (source: string): string => `\`\`\`mermaid\n${source}\n\`\`\``;

test("the diagram source is the first Mermaid fence of the Use case diagram section", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-087
  const withCaption = `## T\n\n### Use case diagram\n\nThe writer and the preview.\n\n${FENCE(DIAGRAM_SOURCE)}\n\n### Main paths\n\n1. A\n`;
  assert.equal(parseUseCaseDiagram(withCaption), DIAGRAM_SOURCE);
  assert.equal(parseUseCaseDiagram(`### Use case diagram\n${FENCE(`  ${DIAGRAM_SOURCE}  `)}\n<!-- okf:links:start -->\n`), DIAGRAM_SOURCE, "the source is trimmed");
});

test("no section, or a section without a Mermaid fence, has no diagram", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-087
  assert.equal(parseUseCaseDiagram("## T\n\n### Main paths\n\n1. A\n"), undefined);
  assert.equal(parseUseCaseDiagram("### Use case diagram\n\nJust words.\n\n```text\nnot mermaid\n```\n"), undefined);
  assert.equal(parseUseCaseDiagram(`### Use case diagram\n\n### Rationale\n\n${FENCE(DIAGRAM_SOURCE)}\n`), undefined, "a fence after the next heading is not in the section");
  assert.equal(parseUseCaseDiagram(`### Use case diagram\n\n${FENCE("  ")}\n`), undefined, "an empty fence is no diagram");
});

test("with two fences the first is taken, and a section in the links block is ignored", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-087
  assert.equal(parseUseCaseDiagram(`### Use case diagram\n\n${FENCE("flowchart LR\n  A --> B")}\n\n${FENCE(DIAGRAM_SOURCE)}\n`), "flowchart LR\n  A --> B");
  assert.equal(parseUseCaseDiagram(`## T\n\n<!-- okf:links:start -->\n### Use case diagram\n\n${FENCE(DIAGRAM_SOURCE)}\n`), undefined);
});

async function chromiumStarts(): Promise<boolean> {
  try {
    await (await chromium.launch()).close();
    return true;
  } catch {
    return false;
  }
}

test("a sequence diagram is drawn as an inline SVG in the cream ink colour, with no script", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-087
  if (!await chromiumStarts()) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  const drawn = await renderUseCaseDiagrams(new Map([["StRS-MDOKFSTUDIO-TABLE-002", DIAGRAM_SOURCE]]));
  const svg = drawn.get("StRS-MDOKFSTUDIO-TABLE-002") ?? "";
  assert.ok(svg.startsWith("<svg"), svg.slice(0, 80));
  assert.ok(svg.includes('id="ucd-table-002"'));
  assert.ok(svg.toLowerCase().includes(CREAM_DIAGRAM_THEME.primaryTextColor?.toLowerCase() ?? "missing"), "the cream ink colour is used");
  assert.ok(!svg.includes("<script"));
  assert.equal((await renderUseCaseDiagrams(new Map())).size, 0, "no source starts no browser and draws nothing");
});

test("a fence Mermaid cannot draw rejects with the StRS id, its file and Mermaid's message", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-087
  if (!await chromiumStarts()) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  await assert.rejects(
    renderUseCaseDiagrams(new Map([["StRS-X-009", "this is not a diagram ->>"]]), undefined, new Map([["StRS-X-009", "requirements/x.md"]])),
    (error: Error) => /^Cannot draw the use case diagram of StRS-X-009 \(requirements\/x\.md\): \S/u.test(error.message),
  );
});
