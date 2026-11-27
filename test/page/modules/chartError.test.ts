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
  // Tightened for CR-502: the exact message, which does not point to the Chart source section.
  assert.equal(chart.querySelector("p")!.textContent, "Unable to render the chart.");
  assert.match(chart.querySelector("details")!.textContent, /Data file not found/u);
  assert.doesNotMatch(chart.querySelector("details")!.textContent, /Unknown mark/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S3
test("the reason is plain text, never HTML", () => {
  const doc = new FakeDocument();
  const chart = chartWithSource(doc);
  showChartError(chart as unknown as HTMLElement, "<img src=x onerror=alert(1)>");
  assert.equal(chart.querySelectorAll("img").length, 0);
  assert.ok(chart.querySelector("details")!.textContent.includes("<img src=x"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S1
test("the error styles use the theme error colour and keep long reasons inside the column", () => {
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-error\s*\{[^}]*color: var\(--studio-errorForeground, #f14c4c\)/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-error-details pre\s*\{[^}]*(overflow-x: auto|white-space: pre-wrap)/u);
  // Changed for CR-503: the chart image no longer exists, the live SVG inside the view takes its rule.
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-view > svg\s*\{[^}]*max-width: 100%;[^}]*height: auto;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S4
test("the hover detail is fixed, lets the pointer through and has a stronger border on both dark pages", () => {
  assert.match(PREVIEW_THEME_CSS, /[/}]\s*\.myst-vega-tooltip\s*\{[^}]*position: fixed;/u);
  assert.match(PREVIEW_THEME_CSS, /[/}]\s*\.myst-vega-tooltip\s*\{[^}]*pointer-events: none;/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-tooltip\[hidden\]\s*\{\s*display: none;/u);
  assert.match(PREVIEW_THEME_CSS, /html\[data-sphinx-preview-theme-mode="dark"\] \.myst-vega-tooltip,\s*html\[data-sphinx-preview-theme-mode="current"\] body:is\(\.vscode-dark, \.vscode-high-contrast\) \.myst-vega-tooltip\s*\{[^}]*border-color: var\(--studio-descriptionForeground\);/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-tooltip-key\s*\{[^}]*var\(--studio-descriptionForeground\)/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-vega-tooltip-value\s*\{[^}]*font-weight: bold;/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-023#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-121#S4
test("the preview sheet hides the three source panels and shows them for a failed figure; the export sheet adds no rule", () => {
  const kinds = ["mermaid", "plantuml", "vega"];
  const shown = kinds.map((kind) => `#sphinx-myst-preview-content .myst-${kind}-diagram:is([data-render-state="error"], [data-render-state="unavailable"]) ~ details.myst-${kind}-source`);
  assert.ok(PREVIEW_THEME_CSS.includes(`${shown.join(",\n")} {\n  display: block;\n}`), "one rule shows the panel of a figure in error or unavailable");
  for (const kind of kinds) {
    // The panel's own rule starts its line; in the rule above, the panel follows its diagram on one line.
    assert.match(PREVIEW_THEME_CSS, new RegExp(`^#sphinx-myst-preview-content details\\.myst-${kind}-source\\s*\\{[^}]*display: none;`, "mu"), `${kind}: hidden otherwise`);
  }
  assert.doesNotMatch(exportSheet(0, "light"), /myst-(?:mermaid|plantuml|vega)-source/u);
});
