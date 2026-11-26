import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

/**
 * Colours of the frontmatter rows that carry an error or a warning (FMSCHEMA scope): the rules are
 * read from the stylesheet as it ships, because a real browser is needed to compute them (the visual
 * scenarios do that).
 */

const ERROR_COLOR = "var(--studio-errorForeground,";
const ERROR_BACKGROUND = "var(--studio-inputValidation-errorBackground,";
const WARNING_COLOR = "var(--studio-editorWarning-foreground,";

interface Rule {
  selectors: string[];
  declarations: Array<[string, string]>;
}

/** The flat rules of the stylesheet: comments dropped, one entry per `{}` block, repeats kept. */
function rules(): Rule[] {
  const css = PREVIEW_THEME_CSS.replace(/\/\*[\s\S]*?\*\//gu, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((match) => ({
    selectors: match[1]!.split(",").map((selector) => selector.trim().replace(/\s+/gu, " ")),
    declarations: match[2]!.split(";").filter((declaration) => declaration.includes(":")).map((declaration) => {
      const colon = declaration.indexOf(":");
      return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
    }),
  }));
}

/** What the rules whose selector ends with `subject` give `property`, in stylesheet order. */
function valuesOf(subject: string, property: string): string[] {
  return rules()
    .filter((rule) => rule.selectors.some((selector) => selector.endsWith(subject)))
    .flatMap((rule) => rule.declarations)
    .filter(([name]) => name === property)
    .map(([, value]) => value);
}

/** The one value of `property` for `subject`, which must read each of its theme tokens with a fallback. */
function themed(subject: string, property: string, token: string): string {
  const values = valuesOf(subject, property);
  assert.equal(values.length, 1, `${subject} sets ${property} once`);
  assert.ok(values[0]!.includes(token), `${subject} ${property} reads ${token} with a fallback: ${values[0]!}`);
  assert.doesNotMatch(values[0]!, /var\(\s*--[\w-]+\s*\)/u, `${subject} ${property} has no var() without fallback`);
  return values[0]!;
}

/** The light warning background: a plain rgba() first, then the color-mix() of the theme colour. */
function assertWarningBackground(subject: string): void {
  const values = valuesOf(subject, "background");
  assert.equal(values.length, 2, `${subject} sets a fallback background and the mixed one`);
  assert.match(values[0]!, /^rgba\(/u);
  assert.match(values[1]!, /^color-mix\(/u);
  assert.ok(values[1]!.includes(WARNING_COLOR), `${subject} mixes the warning colour: ${values[1]!}`);
  assert.doesNotMatch(values[1]!, /var\(\s*--[\w-]+\s*\)/u);
}

function styles(subject: string): boolean {
  return rules().some((rule) => rule.selectors.some((selector) => selector.includes(subject)));
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S1
test("a field row with an error has a red name cell and a red wavy underline under its value", () => {
  const name = "tr[data-okf-field].okf-error > th";
  themed(name, "color", ERROR_COLOR);
  themed(name, "background", ERROR_BACKGROUND);
  const underline = themed("tr[data-okf-field] > td.okf-error", "text-decoration", ERROR_COLOR);
  assert.match(underline, /^underline wavy /u);
  assert.equal(styles("tr[data-okf-field].okf-info"), false, "an info field row keeps the plain look");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S6
test("a field row with a warning has the same marks in the warning colour", () => {
  const name = "tr[data-okf-field].okf-warning > th";
  themed(name, "color", WARNING_COLOR);
  assertWarningBackground(name);
  const underline = themed("tr[data-okf-field] > td.okf-warning", "text-decoration", WARNING_COLOR);
  assert.match(underline, /^underline wavy /u);
});

// A text decoration of the cell is drawn on everything inside it, the open editor and its menu too.
test("a value cell that is being edited drops the issue underline", () => {
  const editing = "tr[data-okf-field] > td[data-okf-editing=\"true\"]";
  assert.deepEqual(valuesOf(editing, "text-decoration"), ["none"]);
  // The three selectors have the same specificity, so the rule that comes last wins.
  const position = (subject: string): number =>
    rules().findIndex((rule) => rule.selectors.some((selector) => selector.endsWith(subject)));
  assert.ok(position(editing) > position("tr[data-okf-field] > td.okf-error"), "after the error underline");
  assert.ok(position(editing) > position("tr[data-okf-field] > td.okf-warning"), "after the warning underline");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023#S5
test("a warning row about the whole document takes the warning colour and wraps its message", () => {
  const row = ".okf-info-row.okf-warning th";
  themed(row, "color", WARNING_COLOR);
  assertWarningBackground(row);
  assert.deepEqual(valuesOf(row, "white-space"), ["normal"]);
  assert.deepEqual(valuesOf(row, "overflow-wrap"), ["anywhere"]);
  assert.equal(styles(".okf-info-row.okf-info"), false, "an info row about the whole document keeps the plain look");
});
