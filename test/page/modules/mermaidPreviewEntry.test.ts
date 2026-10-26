import assert from "node:assert/strict";
import { before, test } from "node:test";

import { bundleEntry, EntryDocument, type EntryElement, runEntry, type EntryRun } from "./entryHarness";

/**
 * A stand-in for the `mermaid` package: every `render` call is recorded and stays pending until
 * the test settles it, so the tests decide in which order the drawings finish.
 */
const MERMAID_STAND_IN = `
const calls = globalThis.mermaidCalls;
export default {
  mermaidAPI: { getConfig: () => ({ flowchart: { useMaxWidth: true } }) },
  initialize: (config) => { void config; },
  render: (id, source) => new Promise((resolve, reject) => { calls.push({ id, source, resolve, reject }); }),
};
`;

interface MermaidCall {
  readonly id: string;
  readonly source: string;
  resolve(result: { svg: string }): void;
  reject(error: Error): void;
}

let bundle = "";
before(async () => {
  bundle = await bundleEntry("src/page/modules/mermaidPreview.ts", { mermaid: MERMAID_STAND_IN });
});

interface Page {
  readonly document: EntryDocument;
  readonly run: EntryRun;
  readonly calls: MermaidCall[];
  readonly theme: { background: string };
}

function openPage(sources: readonly string[]): { page: Page; diagrams: EntryElement[] } {
  const document = new EntryDocument();
  const diagrams = sources.map((source) => document.diagram("myst-mermaid-diagram", source));
  const theme = { background: "#f0f0f0" };
  const calls: MermaidCall[] = [];
  const run = runEntry(bundle, document, (name) => (name === "--studio-textCodeBlock-background" ? theme.background : ""),
    { mermaidCalls: calls });
  return { page: { document, run, calls, theme }, diagrams };
}

function shown(diagram: EntryElement): string | undefined {
  return (diagram.querySelector("img") as unknown as { src?: string } | null)?.src;
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("Mermaid element ids never repeat, also for the diagrams of replaced content", async () => {
  const { page, diagrams } = openPage(["graph TD; A-->B", "graph TD; C-->D"]);
  await page.run.settle();
  assert.deepEqual(page.calls.map((call) => call.id), ["myst-mermaid-0", "myst-mermaid-1"]);
  page.calls.forEach((call) => call.resolve({ svg: "<svg>first</svg>" }));
  await page.run.settle();
  assert.deepEqual(diagrams.map((diagram) => diagram.dataset.renderState), ["rendered", "rendered"]);

  const added = page.document.diagram("myst-mermaid-diagram", "graph TD; E-->F");
  page.document.fire("studio:content-replaced");
  await page.run.settle();
  assert.deepEqual(page.calls.map((call) => call.id), ["myst-mermaid-0", "myst-mermaid-1", "myst-mermaid-2"],
    "the counter continues, an earlier id is never reused");
  page.calls[2]!.resolve({ svg: "<svg>third</svg>" });
  await page.run.settle();
  assert.equal(added.dataset.renderState, "rendered");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("Mermaid draw passes run one at a time, in the order they were requested", async () => {
  const { page } = openPage(["graph TD; A-->B"]);
  await page.run.settle();
  assert.equal(page.calls.length, 1, "the first pass is drawing");

  // A content patch and a theme change arrive while the first pass is still drawing.
  const added = page.document.diagram("myst-mermaid-diagram", "graph TD; C-->D");
  page.document.fire("studio:content-replaced");
  page.theme.background = "#202020";
  page.run.observers.forEach((notify) => notify());
  await page.run.settle();
  assert.equal(page.calls.length, 1, "no second pass starts before the first one finishes");

  page.calls[0]!.resolve({ svg: "<svg>one</svg>" });
  await page.run.settle();
  assert.deepEqual(page.calls.slice(1).map((call) => call.source), ["graph TD; C-->D"],
    "the content pass draws the new diagram; the theme pass still waits for it");

  page.calls[1]!.resolve({ svg: "<svg>two</svg>" });
  await page.run.settle();
  assert.deepEqual(page.calls.slice(2).map((call) => call.source), ["graph TD; A-->B"],
    "the theme pass then redraws only the diagram not yet drawn with the new colours");
  page.calls[2]!.resolve({ svg: "<svg>three</svg>" });
  await page.run.settle();
  assert.equal(added.dataset.renderState, "rendered");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("a Mermaid drawing finished for an earlier theme never replaces the picture of the current one", async () => {
  const { page, diagrams } = openPage(["graph TD; A-->B"]);
  await page.run.settle();
  page.theme.background = "#202020";
  page.run.observers.forEach((notify) => notify());
  page.calls[0]!.resolve({ svg: "<svg>old theme</svg>" });
  await page.run.settle();
  assert.equal(page.calls.length, 2, "the new theme is drawn after the first pass");
  page.calls[1]!.resolve({ svg: "<svg>new theme</svg>" });
  await page.run.settle();
  assert.match(decodeURIComponent(shown(diagrams[0]!)!), /new theme/u);

  // A drawing of the previous theme coming back later is served from the cache, not drawn again.
  page.theme.background = "#f0f0f0";
  page.run.observers.forEach((notify) => notify());
  await page.run.settle();
  assert.equal(page.calls.length, 2, "an earlier drawing of the same source and colours is reused");
  assert.match(decodeURIComponent(shown(diagrams[0]!)!), /old theme/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("a failed Mermaid drawing shows one error for the current key and sets the error state", async () => {
  const { page, diagrams } = openPage(["graph TD; A-->"]);
  await page.run.settle();
  page.calls[0]!.reject(new Error("Parse error on line 1"));
  await page.run.settle();
  const diagram = diagrams[0]!;
  assert.equal(diagram.dataset.renderState, "error");
  assert.equal(diagram.querySelectorAll(".myst-mermaid-error").length, 1);
  assert.match(diagram.querySelector("details")!.textContent, /Parse error on line 1/u);
  assert.equal(shown(diagram), undefined, "no picture beside the error");
});
