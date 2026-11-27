/**
 * Requirement test of the built-in PlantUML engine's error pictures, with the real engine: a source
 * the engine cannot draw comes back as a picture that says why, and the figure ends in the error
 * state with its source shown, closed, in the preview and the HTML export. A diagram that merely
 * writes the words of such a picture is drawn. Skipped, with a message, when no Chromium can start
 * here.
 */
import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { build } from "esbuild";
import type { Page } from "playwright-core";

import type { ExportSnapshot } from "../../src/core/export/exportSnapshot";
import { buildHtmlExport } from "../../src/core/export/htmlExport";
import { openPreviewPage } from "./chartPage";

const uml = (...lines: string[]): string[] => ["@startuml", ...lines, "@enduml"];

const FAILED: ReadonlyArray<readonly [name: string, source: string[]]> = [
  ["a line that is not PlantUML", uml("Alice -> Bob: hello", "this is not plantuml ((( ###")],
  ["a broken class body", uml("class A {", "  +x : int", "activate ??? !!")],
  ["JSON that does not parse", ["@startjson", "[1, 2,, ]", "@endjson"]],
  ["YAML that does not parse", ["@startyaml", "\t- : : :", "  x", "@endyaml"]],
  ["a diagram kind the engine does not support", ["@startmath", "((((", "@endmath"]],
  ["a diagram with nothing in it", uml()],
];

const DRAWN: ReadonlyArray<readonly [name: string, source: string[]]> = [
  ["a message and a note that say the words", uml(
    "Alice -> Bob: Syntax Error?",
    "rnote over Alice #33FF02 : <color:#000000>[From textarea (line 3) ]",
    "note over Bob",
    "Syntax Error? (Assumed diagram type: sequence)",
    "end note",
  )],
  ["a title that says Syntax Error?", uml("title Syntax Error?", "class A")],
  ["a title that is the JSON message", uml("title Your data does not sound like JSON data", "Alice -> Bob")],
  ["a title that is the unsupported message", uml("title Diagram not supported by this release of PlantUML")],
];

const DOCUMENT = ["# Diagrams", "", ...[...FAILED, ...DRAWN].flatMap(([, source]) => ["```plantuml", ...source, "```", ""])].join("\n");

const figures = (page: Page) => page.evaluate(() => [...document.querySelectorAll(".myst-plantuml-diagram")].map((diagram) => {
  const source = diagram.parentElement!.querySelector<HTMLDetailsElement>(":scope > details.myst-plantuml-source")!;
  return {
    state: diagram.getAttribute("data-render-state"),
    pictures: diagram.querySelectorAll("img.myst-plantuml-image").length,
    source: getComputedStyle(source).display,
    open: source.open,
  };
}));

const EXPECTED = [
  ...FAILED.map(([name]) => ({ name, state: "error", pictures: 1, source: "block", open: false })),
  ...DRAWN.map(([name]) => ({ name, state: "rendered", pictures: 1, source: "none", open: false })),
];

const named = (rows: Awaited<ReturnType<typeof figures>>) => rows.map((row, index) => ({ name: EXPECTED[index]?.name, ...row }));

// @tests_req SwRS-MDOKFSTUDIO-DIAG-032#S8
test("the built-in engine's error picture is a failed render that keeps its source, in the preview and the export", async (t) => {
  const opened = await openPreviewPage(DOCUMENT, {}, "light", "cream", "plantuml");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, browser } = opened;
    await page.waitForFunction((count) => document.querySelectorAll(".myst-plantuml-diagram[data-render-state]").length === count,
      EXPECTED.length, { timeout: 60_000 });
    assert.deepEqual(named(await figures(page)), EXPECTED, "preview");

    const taken = await build({
      stdin: { contents: 'import { takeExportSnapshot } from "./src/page/modules/exportSnapshot"; globalThis.__snapshot = () => takeExportSnapshot(document, window);', resolveDir: path.resolve(__dirname, "../.."), loader: "ts" },
      bundle: true, write: false, platform: "browser", format: "iife", logLevel: "silent",
    });
    const snapshot = await page.evaluate(`${taken.outputFiles[0]!.text}\n__snapshot()`) as ExportSnapshot;
    const { html } = buildHtmlExport(snapshot, { stem: "diagrams", maxContentWidth: 0, imageData: () => undefined });
    assert.doesNotMatch(html, /<script/iu, "the export carries no script");
    const exported = await browser.newPage();
    await exported.setContent(html);
    assert.deepEqual(named(await figures(exported)), EXPECTED, "export");
  } finally {
    await opened.close();
  }
});
