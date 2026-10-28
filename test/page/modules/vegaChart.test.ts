import * as assert from "node:assert/strict";
import { test } from "node:test";

import { chartThemeFrom } from "../../../src/page/modules/chartTheme";
import { loadVegaChart } from "./vegaBundle";

const { chartConfig, createChartLoader, drawChart } = loadVegaChart();

const LIGHT = chartThemeFrom((name) => ({ "--studio-editor-foreground": "#112233", "--studio-textLink-foreground": "#aa5500" })[name] ?? "", "rgb(255, 255, 255)");
const DARK = chartThemeFrom((name) => ({ "--studio-editor-foreground": "#ddeeff", "--studio-textLink-foreground": "#55aaff" })[name] ?? "", "rgb(30, 30, 30)");

const CONTEXT = { context: "dataflow" } as never;

const BARS = {
  data: { values: [{ category: "A", amount: 28 }, { category: "B", amount: 55 }] },
  mark: "bar",
  encoding: { x: { field: "category", type: "nominal" }, y: { field: "amount", type: "quantitative" } },
};

/** Runs `action` with `eval` and `new Function` refused, as the page's Content Security Policy does. */
async function withoutEval<T>(action: () => Promise<T>): Promise<T> {
  const original = globalThis.Function;
  const refuse = (): never => { throw new EvalError("Code generation from strings disallowed for this context"); };
  globalThis.Function = new Proxy(original, { construct: refuse, apply: refuse }) as FunctionConstructor;
  try {
    return await action();
  } finally {
    globalThis.Function = original;
  }
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a Vega-Lite spec draws an SVG whose text, bars and axes use the colours of the page", async () => {
  const light = await drawChart("vega-lite", JSON.stringify(BARS), LIGHT);
  assert.match(light, /^<svg[^>]*>/u);
  assert.match(light, /#112233/u, "the axis text follows the page foreground");
  assert.match(light, /#aa5500/u, "the bars follow the page accent");
  const dark = await drawChart("vega-lite", JSON.stringify(BARS), DARK);
  assert.match(dark, /#ddeeff/u);
  assert.notEqual(light, dark);
  assert.doesNotMatch(light, /<script|onload=|javascript:/iu);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a YAML spec draws like its JSON twin", async () => {
  const yaml = "data:\n  values:\n    - {category: A, amount: 28}\n    - {category: B, amount: 55}\nmark: bar\nencoding:\n  x: {field: category, type: nominal}\n  y: {field: amount, type: quantitative}\n";
  assert.equal(await drawChart("vega-lite", yaml, LIGHT), await drawChart("vega-lite", JSON.stringify(BARS), LIGHT));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a Vega spec draws an SVG too", async () => {
  const spec = {
    width: 120, height: 80,
    data: [{ name: "t", values: [{ k: "a", v: 3 }, { k: "b", v: 7 }] }],
    scales: [
      { name: "x", type: "band", domain: { data: "t", field: "k" }, range: "width", padding: 0.1 },
      { name: "y", domain: { data: "t", field: "v" }, nice: true, range: "height" },
    ],
    axes: [{ orient: "bottom", scale: "x" }, { orient: "left", scale: "y" }],
    marks: [{ type: "rect", from: { data: "t" }, encode: { enter: { x: { scale: "x", field: "k" }, width: { scale: "x", band: 1 }, y: { scale: "y", field: "v" }, y2: { scale: "y", value: 0 } } } }],
  };
  const svg = await drawChart("vega", JSON.stringify(spec), DARK);
  assert.match(svg, /^<svg/u);
  assert.match(svg, /#ddeeff/u, "the axis labels follow the page foreground");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-124
test("charts with expressions draw with eval and new Function refused (the interpreter evaluates them)", async () => {
  const withExpressions = {
    data: { values: [{ a: 1 }, { a: 2 }, { a: 3 }] },
    transform: [{ calculate: "datum.a * 10 + length(toString(datum.a))", as: "b" }, { filter: "datum.b > 10" }],
    mark: "point",
    encoding: { x: { field: "a", type: "quantitative" }, y: { field: "b", type: "quantitative" }, size: { condition: { test: "datum.b > 20", value: 200 }, value: 50 } },
  };
  const vegaWithSignal = {
    width: 100, height: 60,
    signals: [{ name: "w", update: "width / 2" }],
    data: [{ name: "t", values: [{ v: 1 }, { v: 2 }], transform: [{ type: "formula", as: "d", expr: "datum.v * w" }] }],
    scales: [{ name: "y", domain: { data: "t", field: "d" }, range: "height" }],
    marks: [{ type: "symbol", from: { data: "t" }, encode: { enter: { y: { scale: "y", field: "d" }, size: { signal: "w + 10" } } } }],
  };
  await withoutEval(async () => {
    assert.throws(() => new Function("return 1"), EvalError, "the guard refuses new Function");
    assert.match(await drawChart("vega-lite", JSON.stringify(withExpressions), LIGHT), /^<svg/u);
    assert.match(await drawChart("vega", JSON.stringify(vegaWithSignal), LIGHT), /^<svg/u);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("an invalid spec rejects with the reason, and the draw of the next chart is not affected", async () => {
  await assert.rejects(drawChart("vega-lite", "{ not a spec", LIGHT), /neither valid JSON nor valid YAML/u);
  await assert.rejects(drawChart("vega-lite", "", LIGHT), /no specification/u);
  await assert.rejects(drawChart("vega-lite", JSON.stringify({ mark: "nonsense", data: { values: [] } }), LIGHT));
  await assert.rejects(drawChart("vega", JSON.stringify({ marks: [{ type: "rect", from: { data: "missing" } }] }), LIGHT));
  assert.match(await drawChart("vega-lite", JSON.stringify(BARS), LIGHT), /^<svg/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("a chart draws the rows of a file the host read, even a CSV, with new Function refused", async () => {
  const spec = { data: { url: "data/rows.csv" }, mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "amount", type: "quantitative" } } };
  const files = { files: { "data/rows.csv": "category,amount\nAlpha,28\nBeta,55\n" } };
  const svg = await withoutEval(() => drawChart("vega-lite", JSON.stringify(spec), LIGHT, files));
  assert.match(svg, /Alpha/u);
  assert.match(svg, /Beta/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("a remote url, a refused file and a file the host did not read each fail with a message", async () => {
  const draw = (url: string, chart = {}) => drawChart("vega-lite", JSON.stringify({ data: { url }, mark: "bar" }), LIGHT, chart);
  await assert.rejects(draw("https://example.com/a.csv"), /Remote chart data is not loaded: https:\/\/example\.com\/a\.csv/u);
  await assert.rejects(draw("../x.csv", { errors: { "../x.csv": "Chart data file ../x.csv is outside the folders the preview reads." } }), /outside the folders/u);
  await assert.rejects(draw("rows.csv"), /was not read by the preview/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("the loader serves only the files it was given and only data images", async () => {
  const loader = createChartLoader({ files: { "a.csv": "x\n1" }, errors: { "b.csv": "refused" } });
  assert.equal(await loader.load("a.csv"), "x\n1");
  await assert.rejects(loader.load("b.csv"), /refused/u);
  await assert.rejects(loader.load("https://example.com/c.csv"), /Remote chart data is not loaded/u);
  await assert.rejects(loader.load("c.csv"), /was not read/u);
  assert.deepEqual(await loader.sanitize("data:image/png;base64,AAAA", CONTEXT), { href: "data:image/png;base64,AAAA" });
  await assert.rejects(loader.sanitize("https://example.com/i.png", CONTEXT), /Remote chart images are not loaded/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("the chart config follows the theme: dark and light palettes, page font and accent first", () => {
  const light = chartConfig(LIGHT) as { range: { category: string[] }; mark: { color: string }; font: string };
  const dark = chartConfig(DARK) as { range: { category: string[] } };
  assert.equal(light.range.category[0], "#aa5500");
  assert.equal(light.mark.color, "#aa5500");
  assert.equal(light.font, "sans-serif");
  assert.notDeepEqual(light.range.category.slice(1), dark.range.category.slice(1));
  assert.equal(chartThemeFrom(() => "", "rgb(0, 0, 0)").dark, true);
  assert.equal(chartThemeFrom(() => "", "rgba(0, 0, 0, 0)").dark, false);
});
