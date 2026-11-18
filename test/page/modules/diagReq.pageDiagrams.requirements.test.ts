/**
 * Requirement tests of page diagram rows no other test checked: the Mermaid border, secondary and
 * tertiary colours with their fallbacks, a theme change that leaves the colours as they were, and a
 * late PlantUML error for an element that a newer render already took over. Each test asserts the
 * behaviour of the current code.
 */
import assert from "node:assert/strict";
import { before, test } from "node:test";

import {
  createPlantUmlDiagramRenderer,
  type PlantUmlRenderToString,
} from "../../../src/page/modules/plantumlDiagram";
import { bundleEntry, EntryDocument, type EntryElement, runEntry, type EntryRun } from "./entryHarness";
import { FakeDocument } from "./fakeDom";

/** A `mermaid` stand-in that records each `initialize` options and keeps each `render` pending. */
const MERMAID_STAND_IN = `
const calls = globalThis.mermaidCalls;
const inits = globalThis.mermaidInits;
export default {
  mermaidAPI: { getConfig: () => ({ flowchart: { useMaxWidth: true } }) },
  initialize: (options) => { inits.push(options); },
  render: (id, source) => new Promise((resolve, reject) => { calls.push({ id, source, resolve, reject }); }),
};
`;

interface MermaidCall {
  readonly source: string;
  resolve(result: { svg: string }): void;
}

let bundle = "";
before(async () => {
  bundle = await bundleEntry("src/page/modules/mermaidPreview.ts", { mermaid: MERMAID_STAND_IN });
});

function openPage(variables: Record<string, string>): {
  run: EntryRun; diagram: EntryElement; calls: MermaidCall[]; inits: Array<{ themeVariables: Record<string, string> }>;
} {
  const document = new EntryDocument();
  const diagram = document.diagram("myst-mermaid-diagram", "graph TD; A-->B");
  const calls: MermaidCall[] = [];
  const inits: Array<{ themeVariables: Record<string, string> }> = [];
  const run = runEntry(bundle, document, (name) => variables[name] ?? "", { mermaidCalls: calls, mermaidInits: inits });
  return { run, diagram, calls, inits };
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-005
test("the Mermaid border, secondary and tertiary colours come from their theme variables, with fixed fallbacks", async () => {
  const themed = openPage({
    "--studio-textCodeBlock-background": "#101820",
    "--studio-editor-foreground": "#e0e0e0",
    "--sphinx-preview-border": "#445566",
    "--studio-textBlockQuote-background": "#223344",
    "--studio-editor-background": "#0a0b0c",
  });
  await themed.run.settle();
  assert.equal(themed.inits.length, 1);
  const variables = themed.inits[0]!.themeVariables;
  assert.equal(variables.background, "transparent");
  assert.equal(variables.primaryColor, "#101820");
  assert.equal(variables.primaryTextColor, "#e0e0e0");
  assert.equal(variables.lineColor, "#e0e0e0");
  assert.equal(variables.primaryBorderColor, "#445566", "the border follows --sphinx-preview-border");
  assert.equal(variables.secondaryColor, "#223344", "the secondary colour follows the block quote background");
  assert.equal(variables.tertiaryColor, "#0a0b0c", "the tertiary colour follows the editor background");

  const bare = openPage({ "--studio-textCodeBlock-background": "CANVAS" });
  await bare.run.settle();
  const fallbacks = bare.inits[0]!.themeVariables;
  assert.equal(fallbacks.primaryColor, "#f0f0f0", "a system colour keyword falls back");
  assert.equal(fallbacks.primaryTextColor, "#1f1f1f");
  assert.equal(fallbacks.primaryBorderColor, "#808080");
  assert.equal(fallbacks.secondaryColor, "#f0f0f0");
  assert.equal(fallbacks.tertiaryColor, "#ffffff");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-005
// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("a theme attribute change that leaves the Mermaid colours as they were draws nothing", async () => {
  const page = openPage({ "--studio-textCodeBlock-background": "#f0f0f0" });
  await page.run.settle();
  page.calls[0]!.resolve({ svg: "<svg>drawn</svg>" });
  await page.run.settle();
  const picture = page.diagram.querySelector("img");
  assert.ok(picture);

  page.run.observers.forEach((notify) => notify());
  await page.run.settle();
  assert.equal(page.calls.length, 1, "Mermaid is not run again");
  assert.equal(page.inits.length, 1, "Mermaid is not initialised again");
  assert.equal(page.diagram.querySelector("img"), picture, "the same picture stays in place");
  assert.equal(page.diagram.dataset.renderState, "rendered");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("a PlantUML drawing that fails after a newer render took the element shows no error", async () => {
  const doc = new FakeDocument();
  const element = doc.add("div", { class: "myst-plantuml-diagram" });
  element.textContent = "@startuml\nAlice -> Bob\n@enduml";
  const runs: Array<{ dark: boolean; ok(svg: string): void; fail(error: string): void }> = [];
  const engine: PlantUmlRenderToString = (_lines, onSuccess, onError, options) => {
    runs.push({ dark: options.dark, ok: onSuccess, fail: onError });
  };
  const renderer = createPlantUmlDiagramRenderer(engine);
  const settle = async (): Promise<void> => {
    for (let turn = 0; turn < 5; turn += 1) await new Promise<void>((resolve) => setImmediate(resolve));
  };

  const light = renderer.render(element as unknown as HTMLElement, false);
  await settle();
  const dark = renderer.render(element as unknown as HTMLElement, true);
  assert.equal(runs.length, 1, "the light render is running");
  runs[0]!.fail("Syntax error in the light run");
  await light;
  await settle();
  assert.equal(element.querySelectorAll(".myst-plantuml-error").length, 0, "no error for the replaced key");
  assert.notEqual(element.getAttribute("data-render-state"), "error");

  assert.equal(runs.length, 2, "the dark render runs next");
  assert.equal(runs[1]!.dark, true);
  runs[1]!.ok("<svg>dark</svg>");
  await dark;
  assert.equal(element.getAttribute("data-render-state"), "rendered");
  assert.equal(element.querySelectorAll(".myst-plantuml-error").length, 0);
});
