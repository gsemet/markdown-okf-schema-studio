import assert from "node:assert/strict";
import { test } from "node:test";

import { exportSheet } from "../../../src/core/export/exportStyles";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { showChartError } from "../../../src/page/modules/chartError";
import { FakeDocument, FakeElement } from "./fakeDom";

function chartWithSource(doc: FakeDocument): FakeElement {
  const chart = doc.add("div", { class: "myst-vega-diagram" });
  chart.textContent = '{ "mark": "nonsense" }';
  return chart;
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S3
test("an invalid chart shown several times has exactly one error with one details and the reason", () => {
  const doc = new FakeDocument();
  const chart = chartWithSource(doc);
  for (const message of ["Unknown mark", "Unknown mark", "Data file not found"]) {
    showChartError(chart as unknown as HTMLElement, message);
  }
  assert.equal(chart.querySelectorAll(".myst-vega-error").length, 1);
  assert.equal(chart.querySelectorAll("details").length, 1);
  // Tightened for CR-502: the Chart source section is hidden in the preview, so the message no longer points to it.
  assert.equal(chart.querySelector("p")!.textContent, "Unable to render the chart.");
  assert.match(chart.querySelector("details")!.textContent, /Data file not found/u);
  assert.doesNotMatch(chart.querySelector("details")!.textContent, /Unknown mark/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S1
test("the reason is plain text, never HTML", () => {
  const doc = new FakeDocument();
  const chart = chartWithSource(doc);
  showChartError(chart as unknown as HTMLElement, "<img src=x onerror=alert(1)>");
  assert.equal(chart.querySelectorAll("img").length, 0);
  assert.ok(chart.querySelector("details")!.textContent.includes("<img src=x"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S2
test("the error styles use the theme error colour and keep long reasons inside the column", () => {
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-error\s*\{[^}]*color: var\(--studio-errorForeground, #f14c4c\)/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-error-details pre\s*\{[^}]*(overflow-x: auto|white-space: pre-wrap)/u);
  // Changed for CR-503: the chart image no longer exists, the live SVG inside the view takes its rule.
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-view > svg\s*\{[^}]*max-width: 100%;[^}]*height: auto;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("the hover detail is fixed, lets the pointer through and has a stronger border on both dark pages", () => {
  assert.match(PREVIEW_THEME_CSS, /[/}]\s*\.myst-vega-tooltip\s*\{[^}]*position: fixed;/u);
  assert.match(PREVIEW_THEME_CSS, /[/}]\s*\.myst-vega-tooltip\s*\{[^}]*pointer-events: none;/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-tooltip\[hidden\]\s*\{\s*display: none;/u);
  assert.match(PREVIEW_THEME_CSS, /html\[data-sphinx-preview-theme-mode="dark"\] \.myst-vega-tooltip,\s*html\[data-sphinx-preview-theme-mode="current"\] body:is\(\.vscode-dark, \.vscode-high-contrast\) \.myst-vega-tooltip\s*\{[^}]*border-color: var\(--studio-descriptionForeground\);/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-tooltip-key\s*\{[^}]*var\(--studio-descriptionForeground\)/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-tooltip-value\s*\{[^}]*font-weight: bold;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("the preview sheet hides the Chart source section and the export sheet shows it again", () => {
  assert.match(PREVIEW_THEME_CSS, /#sphinx-myst-preview-content details\.myst-vega-source\s*\{[^}]*display: none;/u);
  assert.match(exportSheet(0, "light"), /#sphinx-myst-preview-content details\.myst-vega-source\s*\{\s*display: block;\s*\}/u);
});
