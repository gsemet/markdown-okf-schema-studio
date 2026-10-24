import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createFigureTools } from "../../../src/page/modules/figureDirective";

const tools = createFigureTools();

function roundTrip(text: string): string {
  const model = tools.parseFigure(text);
  assert.ok(model, "parsed");
  return tools.serializeFigure(model);
}

const book = [
  ":::{figure} images/chip.png",
  ":alt: A chip on a board",
  ":width: 60%",
  ":align: center",
  ":name: fig-chip",
  ":class: with-border",
  "",
  "The chip, seen from above.",
  "",
  "Legend line one.",
  "",
  "Legend line two.",
  ":::",
].join("\n");

test("T32: a book-style figure round-trips byte for byte", () => {
  assert.equal(roundTrip(book), book);
  const model = tools.parseFigure(book)!;
  assert.deepEqual(tools.valuesOf(model), {
    source: "images/chip.png",
    alt: "A chip on a board",
    caption: "The chip, seen from above.",
    legend: "Legend line one.\n\nLegend line two.",
    width: "60%",
    align: "center",
    name: "fig-chip",
  });
});

test("T32: backtick and tilde fences keep their style", () => {
  const ticks = "```{figure} a.png\n:width: 40px\n\nCaption\n```";
  assert.equal(roundTrip(ticks), ticks);
  const tildes = "~~~{figure} a.png\n\nCaption\n~~~";
  assert.equal(roundTrip(tildes), tildes);
});

test("T32: unusual spacing is read and written back unchanged when nothing changes", () => {
  const cases = [
    ":::{figure} a.png\n:width: 50%\nCaption right after the options\n:::",
    ":::{figure}   a.png  \n:alt:   spaced\n\n\n\nCaption\n\n\n\nLegend\n\n:::",
    ":::{figure} a.png\n:::",
    "::::{figure} a.png\n:alt: x\n\nCaption\n\n:::{note}\nInside\n:::\n::::",
    "  :::{figure} a.png\n  :alt: x\n\n  Caption\n  :::",
    ":::{figure} a.png\n\nUnterminated caption",
    ":::{figure} a.png\n:nofigwidth:\n\nCaption\n:::",
  ];
  for (const text of cases) assert.equal(roundTrip(text), text, text);
});

test("T32: changing the width rewrites only that line and keeps unknown options in order", () => {
  const model = tools.parseFigure(book)!;
  const values = tools.valuesOf(model);
  const next = tools.serializeFigure(tools.applyValues(model, { ...values, width: "300px" }));
  assert.equal(next, book.replace(":width: 60%", ":width: 300px"));
});

test("T32: empty known options are dropped and new ones are appended after the unknown ones", () => {
  const model = tools.parseFigure(book)!;
  const values = tools.valuesOf(model);
  const dropped = tools.serializeFigure(tools.applyValues(model, { ...values, align: "", name: "" }));
  assert.equal(dropped, book.replace(":align: center\n", "").replace(":name: fig-chip\n", ""));
  const bare = tools.parseFigure(":::{figure} a.png\n:class: wide\n\nCaption\n:::")!;
  const added = tools.serializeFigure(
    tools.applyValues(bare, { ...tools.valuesOf(bare), width: "50%", alt: "Alt" }),
  );
  assert.equal(added, ":::{figure} a.png\n:class: wide\n:alt: Alt\n:width: 50%\n\nCaption\n:::");
});

test("T32: caption and legend are edited as separate paragraphs", () => {
  const model = tools.parseFigure(book)!;
  const values = tools.valuesOf(model);
  const next = tools.serializeFigure(
    tools.applyValues(model, { ...values, caption: "New caption", legend: "" }),
  );
  assert.equal(next, [
    ":::{figure} images/chip.png",
    ":alt: A chip on a board",
    ":width: 60%",
    ":align: center",
    ":name: fig-chip",
    ":class: with-border",
    "",
    "New caption",
    ":::",
  ].join("\n"));
  const legendOnly = tools.serializeFigure(tools.applyValues(model, { ...values, legend: "Only one" }));
  assert.ok(legendOnly.includes("The chip, seen from above.\n\nOnly one\n:::"), legendOnly);
});

test("T32: adding the first option to a figure without options keeps a blank line before the caption", () => {
  const model = tools.parseFigure(":::{figure} a.png\nCaption\n:::")!;
  const next = tools.serializeFigure(
    tools.applyValues(model, { ...tools.valuesOf(model), width: "10em" }),
  );
  assert.equal(next, ":::{figure} a.png\n:width: 10em\n\nCaption\n:::");
});

test("T32: a fence inside the legend makes the outer fence longer", () => {
  const model = tools.parseFigure(":::{figure} a.png\n\nCaption\n:::")!;
  const next = tools.serializeFigure(
    tools.applyValues(model, { ...tools.valuesOf(model), legend: ":::{note}\nx\n:::" }),
  );
  assert.ok(next.startsWith("::::{figure} a.png"), next);
  assert.ok(next.endsWith("\n::::"), next);
});

test("T32: a YAML option block and other directives are not parsed", () => {
  assert.equal(tools.parseFigure(":::{figure} a.png\n---\nwidth: 50%\n---\nCaption\n:::"), undefined);
  assert.equal(tools.parseFigure(":::{note}\nx\n:::"), undefined);
  assert.equal(tools.parseFigure("plain paragraph"), undefined);
});

test("T32: the width pattern matches the renderer's", () => {
  for (const good of ["50", "50%", "12.5px", "3em", "2rem"]) assert.equal(tools.validWidth(good), true, good);
  for (const bad of ["", "50 %", "-1px", "50pt", "wide", "1.px"]) assert.equal(tools.validWidth(bad), false, bad);
  const base = tools.valuesOf(tools.parseFigure(book)!);
  assert.equal(tools.validate({ ...base, width: "wide" }).width !== undefined, true);
  assert.deepEqual(tools.validate(base), {});
  assert.equal(tools.validate({ ...base, source: " " }).source !== undefined, true);
  assert.equal(tools.validate({ ...base, align: "middle" }).align !== undefined, true);
  assert.equal(tools.validate({ ...base, caption: "a\n\nb" }).caption !== undefined, true);
  assert.equal(tools.validate({ ...base, caption: "", legend: "x" }).legend !== undefined, true);
});

test("T32: locateFigure finds the directive around the caret, or the first one", () => {
  const text = "Intro\n\n" + book + "\n\nOutro";
  const start = text.indexOf(":::{figure}");
  const located = tools.locateFigure(text, start + 30)!;
  assert.equal(located.kind, "figure");
  assert.equal(text.slice(located.start, located.end), book);
  assert.equal(tools.locateFigure(text, 2), undefined, "caret outside");
  assert.equal(tools.locateFigure(text)!.start, start);
  const nested = "::::{figure} a.png\n\nCaption\n\n:::{figure} b.png\n:::\n::::";
  const inner = tools.locateFigure(nested, nested.indexOf("b.png"))!;
  assert.equal(nested.slice(inner.start, inner.end), ":::{figure} b.png\n:::");
});

test("T32: locateFigure sees a Markdown image alone in its paragraph", () => {
  const text = "Before\n\n![Alt text](img/a b.png)\n\nAfter";
  const at = text.indexOf("Alt");
  assert.equal(tools.locateFigure(text, at), undefined, "a path with a space needs <...>");
  const angle = "Before\n\n![Alt text](<img/a b.png>)\n\nAfter";
  const located = tools.locateFigure(angle, angle.indexOf("Alt"))!;
  assert.equal(located.kind, "image");
  assert.equal(located.alt, "Alt text");
  assert.equal(located.source, "img/a b.png");
  assert.equal(angle.slice(located.start, located.end), "![Alt text](<img/a b.png>)");
  assert.equal(tools.locateFigure("see ![x](a.png) inline", 8), undefined, "inline image");
  const converted = tools.serializeFigure(tools.modelFromImage("Alt text", "img/a b.png"));
  assert.equal(converted, ":::{figure} img/a b.png\n:alt: Alt text\n:::");
});
