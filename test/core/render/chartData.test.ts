import * as assert from "node:assert/strict";
import { test } from "node:test";

import { chartDataUrls, chartKindOf, isRemoteDataUrl, parseChartSource } from "../../../src/core/render/chartData";
import { inlineChartFiles, parseDelimited } from "../../../src/core/render/chartInline";

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("chartKindOf names the chart of a vega-lite or vega fence and nothing else", () => {
  assert.equal(chartKindOf({ type: "code", lang: "vega-lite" }), "vega-lite");
  assert.equal(chartKindOf({ type: "code", lang: "Vega" }), "vega");
  assert.equal(chartKindOf({ type: "code", lang: "json" }), undefined);
  assert.equal(chartKindOf({ type: "code" }), undefined);
  assert.equal(chartKindOf({ type: "mystDirective", name: "vega-lite" }), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("parseChartSource reads a JSON or YAML object and gives the reason for anything else", () => {
  const json = parseChartSource('{ "mark": "bar", "data": { "values": [{ "a": 1 }] } }');
  assert.ok(json.ok && json.spec.mark === "bar");
  const yaml = parseChartSource("mark: bar\ndata:\n  values:\n    - a: 1\n");
  assert.ok(yaml.ok);
  assert.deepEqual(yaml.spec.data, { values: [{ a: 1 }] });
  for (const bad of ["", "   \n", "[1, 2]", "just text", "{ \"mark\": ", "a: [unclosed"]) {
    const result = parseChartSource(bad);
    assert.equal(result.ok, false, JSON.stringify(bad));
    assert.ok((result as { error: string }).error.length > 0);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("chartDataUrls lists the url of every data source, nested views and lookups included", () => {
  const spec = {
    data: { url: "data/main.csv" },
    layer: [{ data: { url: "data/layer.json" }, mark: "line" }, { mark: "point" }],
    transform: [{ lookup: "id", from: { data: { url: "data/lookup.csv" }, key: "id" } }],
    datasets: { inline: [{ url: "not-a-source" }] },
  };
  assert.deepEqual(chartDataUrls(spec), ["data/main.csv", "data/layer.json", "data/lookup.csv"]);
  assert.deepEqual(chartDataUrls({ data: [{ name: "a", url: "a.csv" }, { name: "b", values: [] }, { name: "c", url: "a.csv" }] }), ["a.csv"]);
  assert.deepEqual(chartDataUrls({ data: { values: [{ x: 1 }] } }), []);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("isRemoteDataUrl is true for a scheme or a protocol-relative url and false for a path", () => {
  for (const url of ["https://example.com/a.csv", "http://x/y", "file:///etc/passwd", "//cdn/x.json", "data:text/csv,a", "HTTPS://X"]) {
    assert.equal(isRemoteDataUrl(url), true, url);
  }
  for (const url of ["a.csv", "data/a.csv", "./a.csv", "../a.csv", "/abs/a.csv"]) {
    assert.equal(isRemoteDataUrl(url), false, url);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("parseDelimited reads quoted fields, CRLF and a byte order mark, and types numbers and booleans", () => {
  const rows = parseDelimited('﻿name,count,flag,note\r\n"Smith, J",3,true,"say ""hi"""\r\nLee,4.5e1,false,\r\n\r\n', ",");
  assert.deepEqual(rows, [
    { name: "Smith, J", count: 3, flag: true, note: 'say "hi"' },
    { name: "Lee", count: 45, flag: false, note: null },
  ]);
  assert.deepEqual(parseDelimited("a\tb\n1\t2", "\t"), [{ a: 1, b: 2 }]);
  assert.deepEqual(parseDelimited("", ","), []);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("inlineChartFiles puts the rows of each read file into values and leaves no url", () => {
  const spec = { data: { url: "d.csv" }, layer: [{ data: { url: "j.json", format: { type: "json", property: "rows" } } }] };
  const out = inlineChartFiles(spec, { files: { "d.csv": "x,y\n1,2\n", "j.json": '{"rows":[{"k":1}]}' } }) as typeof spec & Record<string, never>;
  assert.deepEqual(out.data, { values: [{ x: 1, y: 2 }] });
  assert.deepEqual(out.layer[0]!.data, { values: { rows: [{ k: 1 }] }, format: { type: "json", property: "rows" } });
  assert.equal(JSON.stringify(out).includes("url"), false);
  assert.equal(spec.data.url, "d.csv", "the parsed spec is not changed");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
test("inlineChartFiles refuses a remote url, a refused file, an unread file and a format it does not read", () => {
  assert.throws(() => inlineChartFiles({ data: { url: "https://example.com/a.csv" } }, {}), /Remote chart data is not loaded: https:\/\/example\.com\/a\.csv/u);
  assert.throws(() => inlineChartFiles({ data: { url: "//cdn/a.json" } }, { files: { "//cdn/a.json": "[]" } }), /Remote chart data is not loaded/u);
  assert.throws(() => inlineChartFiles({ data: { url: "../x.csv" } }, { errors: { "../x.csv": "Chart data file ../x.csv is outside the folders the preview reads." } }), /outside the folders/u);
  assert.throws(() => inlineChartFiles({ data: { url: "a.csv" } }, {}), /was not read by the preview/u);
  assert.throws(() => inlineChartFiles({ data: { url: "a.dat", format: { type: "topojson" } } }, { files: { "a.dat": "{}" } }), /format topojson, which the preview does not read/u);
  assert.throws(() => inlineChartFiles({ data: { url: "a.json" } }, { files: { "a.json": "{oops" } }), /is not valid JSON/u);
});
