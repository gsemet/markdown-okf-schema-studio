import * as assert from "node:assert/strict";
import { test } from "node:test";

import { ADMONITION_TITLES } from "../../../src/core/directives/admonition";
import { OKF_WIDTH } from "../../../src/core/directives/figure";
import {
  directiveAttributeAllowed,
  directiveAttributeRule,
  directiveNamed,
  directiveStyle,
  MYST_DIRECTIVES,
} from "../../../src/core/directives/registry";
import { PALETTE_ACTIONS } from "../../../src/core/palette/paletteActions";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import type { MystNode } from "../../../src/core/render/mystNode";

// @tests_req SwRS-MDOKFSTUDIO-MYST-001
test("each directive name has one plug-in, found by its exact name", () => {
  const names = MYST_DIRECTIVES.flatMap((directive) => directive.names);
  assert.equal(new Set(names).size, names.length);
  assert.equal(directiveNamed("note")?.id, "admonition");
  assert.equal(directiveNamed("admonition")?.id, "admonition");
  assert.equal(directiveNamed("figure")?.id, "figure");
  assert.equal(directiveNamed("list-table")?.id, "tables");
  assert.equal(directiveNamed("csv-table")?.id, "tables");
  assert.equal(directiveNamed("Figure"), undefined, "names are case sensitive, as MyST writes them");
  assert.equal(directiveNamed("toString"), undefined);
  assert.equal(directiveNamed(undefined), undefined);
  assert.deepEqual(directiveNamed("warning")?.names, ["admonition", ...Object.keys(ADMONITION_TITLES)]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-031
// @tests_req SwRS-MDOKFSTUDIO-MYST-063
test("every plug-in renders, styles the preview and names MyST palette actions that exist", () => {
  for (const directive of MYST_DIRECTIVES) {
    assert.equal(typeof directive.render, "function", directive.id);
    assert.ok(directive.style && PREVIEW_THEME_CSS.includes(directive.style), `${directive.id} style is in the stylesheet`);
    assert.equal(directiveStyle(directive.id), directive.style);
    for (const id of directive.paletteActions ?? []) {
      assert.ok(Object.hasOwn(PALETTE_ACTIONS, id), `${directive.id}: ${id}`);
      assert.ok((PALETTE_ACTIONS[id].modes as readonly string[]).includes("myst"), `${directive.id}: ${id} is a MyST action`);
    }
  }
  assert.equal(directiveStyle("unknown"), "");
});

test("the admonition pass gives the directive's position to its admonition and infers the title", () => {
  const admonition: MystNode = {
    type: "admonition",
    children: [{ type: "paragraph", children: [{ type: "strong", children: [{ type: "text", value: "Heads up" }] }] },
      { type: "paragraph", children: [{ type: "text", value: "Body" }] }],
  };
  const node: MystNode = { type: "mystDirective", name: "note", position: { start: { line: 3 }, end: { line: 6 } }, children: [admonition] };
  directiveNamed("note")?.render?.(node, 3);
  assert.deepEqual(admonition.position, { start: { line: 3 }, end: { line: 6 } });
  assert.equal(admonition.children?.[0].type, "admonitionTitle");
  assert.equal(admonition.children?.length, 2);
});

test("the figure pass puts the source lines on the figure; the table pass marks a list-table", () => {
  const figure: MystNode = { type: "container", kind: "figure" };
  directiveNamed("figure")?.render?.({ type: "mystDirective", name: "figure", position: { end: { line: 9 } }, children: [figure] }, 7);
  assert.deepEqual(figure.data?.hProperties, { "data-line": 7, "data-end-line": 9 });

  const header = { type: "tableRow", children: [{ type: "tableCell", header: true }] };
  const table: MystNode = { type: "table", children: [header, { type: "tableRow", children: [{ type: "tableCell" }] }] };
  const directive: MystNode = {
    type: "mystDirective", name: "list-table", position: { start: { line: 1 } }, options: { widths: "1 3", align: "CENTER" }, children: [table],
  };
  directiveNamed("list-table")?.render?.(directive, 1);
  assert.deepEqual(table.data, { listTable: true, widths: [25, 75], headerRows: 1 });
  assert.equal(table.align, "center");
  assert.deepEqual(table.position, { start: { line: 1 } });
});

test("the figure rule accepts a plain width only (the sanitizer applies it, see html-policy tests)", () => {
  const rule = directiveAttributeRule("data-okf-width");
  assert.ok(rule);
  for (const width of ["50%", "200px", "12.5em", "3rem", "640"]) assert.ok(OKF_WIDTH.test(width) && rule.valid(` ${width} `, "img"), width);
  for (const width of ["calc(1px)", "50vw", "-3px", ""]) assert.equal(rule.valid(width, "img"), false, width);
  assert.equal(directiveAttributeRule("data-line"), undefined);
  assert.deepEqual(rule.diagnostic, { code: "blocked-okf-width", message: "Removed an unsupported figure width." });
});

test("plug-in attribute rules are for data-* attributes the sanitizer does not handle itself", () => {
  for (const directive of MYST_DIRECTIVES) {
    for (const attribute of Object.keys(directive.attributes ?? {})) assert.ok(directiveAttributeAllowed(attribute), attribute);
  }
  assert.equal(directiveAttributeAllowed("data-okf-width"), true);
  for (const attribute of ["style", "onclick", "href", "src", "srcset", "srcdoc", "class", "data-okf-color", "data-okf-background", "data-myst-table-style"]) {
    assert.equal(directiveAttributeAllowed(attribute), false, attribute);
  }
});
