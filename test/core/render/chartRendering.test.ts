import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, hasClass, parseHtml, textContent } from "./dom";

const SPEC = '{ "data": { "values": [{ "a": "A", "b": 1 }] }, "mark": "bar", "encoding": { "x": { "field": "a", "type": "nominal" } } }';

/** workspace/docs/{page.md, data/rows.csv}, workspace/shared/all.json, outside/secret.csv */
function workspace(): { workspaceRoot: string; docs: string } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "chart-data-")));
  const workspaceRoot = path.join(root, "workspace");
  const docs = path.join(workspaceRoot, "docs");
  fs.mkdirSync(path.join(docs, "data"), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "shared"), { recursive: true });
  fs.mkdirSync(path.join(root, "outside"), { recursive: true });
  fs.writeFileSync(path.join(docs, "data", "rows.csv"), "category,amount\nA,28\nB,55\n");
  fs.writeFileSync(path.join(workspaceRoot, "shared", "all.json"), '[{"k":1}]');
  fs.writeFileSync(path.join(root, "outside", "secret.csv"), "k\n1\n");
  return { workspaceRoot, docs };
}

async function render(text: string, options: { readOnly?: boolean; resourceRoot?: "document" } = {}) {
  const { workspaceRoot, docs } = workspace();
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: path.join(docs, "page.md") }, languageId: "markdown", version: 1, getText: () => text },
    workspaceRoot: options.resourceRoot === "document" ? docs : workspaceRoot,
    ...(options.readOnly ? { readOnly: true } : {}),
    requestId: 1,
    isWorkspaceTrusted: () => true,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
  return { ...result, dom: parseHtml(result.html) };
}

const chartOf = (dom: ReturnType<typeof parseHtml>) => findElement(dom, (element) => hasClass(element, "myst-vega-diagram"));

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("a vega-lite fence becomes a chart figure with its source, a vega fence the same", async () => {
  for (const [lang, kind] of [["vega-lite", "vega-lite"], ["vega", "vega"]] as const) {
    const { dom, html, diagnostics } = await render(`Before.\n\n\`\`\`${lang}\n${SPEC}\n\`\`\`\n\nAfter.\n`);
    const figure = findElement(dom, (element) => hasClass(element, "myst-vega-figure"));
    assert.ok(figure, `${lang}: the fence is a chart figure`);
    assert.match(html, /<figure[^>]*class="myst-vega-figure"[^>]*data-line="3"/u);
    const chart = chartOf(dom)!;
    assert.equal(attribute(chart, "data-myst-chart-kind"), kind);
    assert.equal(attribute(chart, "aria-label"), "Chart diagram");
    assert.equal(textContent(chart), SPEC, "the chart element holds the specification text");
    assert.match(textContent(findElement(dom, (element) => hasClass(element, "myst-vega-source"))!), /Chart source/u);
    assert.equal(diagnostics.length, 0);
    assert.doesNotMatch(html, /language-vega/u, "the fence is no highlighted code block");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("a mermaid fence and other languages are not charts", async () => {
  const { dom } = await render("```mermaid\ngraph TD\n A --> B\n```\n\n```json\n{}\n```\n");
  assert.equal(chartOf(dom), undefined);
  assert.ok(findElement(dom, (element) => hasClass(element, "myst-mermaid-figure")));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("a relative data url is read through the resource policy and handed to the page with the chart", async () => {
  const spec = '{ "data": { "url": "data/rows.csv" }, "mark": "bar" }';
  const { dom, diagnostics } = await render(`\`\`\`vega-lite\n${spec}\n\`\`\`\n`);
  const files = JSON.parse(attribute(chartOf(dom)!, "data-myst-chart-files")!) as Record<string, string>;
  assert.deepEqual(files, { "data/rows.csv": "category,amount\nA,28\nB,55\n" });
  assert.equal(attribute(chartOf(dom)!, "data-myst-chart-errors"), undefined);
  assert.equal(diagnostics.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("a remote data url is never read: the chart carries no file and the page refuses it with a message", async () => {
  const { dom, stage } = await render('```vega-lite\n{ "data": { "url": "https://example.com/a.csv" }, "mark": "bar" }\n```\n');
  const chart = chartOf(dom)!;
  assert.equal(attribute(chart, "data-myst-chart-files"), undefined);
  assert.equal(attribute(chart, "data-myst-chart-errors"), undefined, "the page names the remote url itself");
  assert.deepEqual(stage.dependencies, []);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("a data file outside the folders the preview reads, a missing file and an absolute path are refused with a reason", async () => {
  const cases: Array<[string, RegExp]> = [
    ["../../../outside/secret.csv", /outside the folders the preview reads/u],
    ["data/missing.csv", /Chart data file not found: data\/missing\.csv/u],
    ["/etc/hosts", /(outside the folders|must be a relative path)/u],
  ];
  for (const [url, reason] of cases) {
    const { dom, diagnostics } = await render(`\`\`\`vega-lite\n{ "data": { "url": ${JSON.stringify(url)} }, "mark": "bar" }\n\`\`\`\n`);
    const chart = chartOf(dom)!;
    assert.equal(attribute(chart, "data-myst-chart-files"), undefined, url);
    const errors = JSON.parse(attribute(chart, "data-myst-chart-errors")!) as Record<string, string>;
    assert.match(errors[url]!, reason, url);
    assert.ok(diagnostics.some((diagnostic) => reason.test(diagnostic.message)), `${url}: a diagnostic names the refusal`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("in Restricted Mode only the document folder and below is read", async () => {
  const inside = await render('```vega-lite\n{ "data": { "url": "data/rows.csv" }, "mark": "bar" }\n```\n', { readOnly: true, resourceRoot: "document" });
  assert.ok(attribute(chartOf(inside.dom)!, "data-myst-chart-files"));
  const outside = await render('```vega-lite\n{ "data": { "url": "../shared/all.json" }, "mark": "bar" }\n```\n', { readOnly: true, resourceRoot: "document" });
  assert.equal(attribute(chartOf(outside.dom)!, "data-myst-chart-files"), undefined);
  assert.match(attribute(chartOf(outside.dom)!, "data-myst-chart-errors")!, /outside the folders/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("an invalid specification still renders a chart element: the page shows the error, the source stays", async () => {
  const { dom } = await render("```vega-lite\n{ not a spec\n```\n");
  const chart = chartOf(dom)!;
  assert.equal(textContent(chart), "{ not a spec");
  assert.equal(attribute(chart, "data-myst-chart-files"), undefined);
});
