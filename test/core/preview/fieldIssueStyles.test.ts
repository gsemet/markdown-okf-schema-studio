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
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S8
test("a value cell that is being edited drops the issue underline", () => {
  const editing = "tr[data-okf-field] > td[data-okf-editing=\"true\"]";
  assert.deepEqual(valuesOf(editing, "text-decoration"), ["none"]);
  // The three selectors have the same specificity, so the rule that comes last wins.
  const position = (subject: string): number =>
    rules().findIndex((rule) => rule.selectors.some((selector) => selector.endsWith(subject)));
  assert.ok(position(editing) > position("tr[data-okf-field] > td.okf-error"), "after the error underline");
  assert.ok(position(editing) > position("tr[data-okf-field] > td.okf-warning"), "after the warning underline");
});

// The severity background is set under an id, so it outranks the hover rule of the edit cells.
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S9
test("in edit mode the name cell of an error or warning row highlights under the pointer", () => {
  const editMode = "html[data-sphinx-preview-edit-mode=\"on\"]";
  const otherCells = valuesOf(`${editMode} [data-okf-edit-cell]:hover`, "background");
  assert.equal(otherCells.length, 1, "the edit cells have one hover background");
  for (const severity of ["okf-error", "okf-warning"]) {
    // Everything the severity rule selects by, plus the edit mode, the edit cell and the pointer.
    const hover = `${editMode} #sphinx-myst-preview-content [data-okf-properties] `
      + `tr[data-okf-field].${severity} > th[data-okf-edit-cell]:hover`;
    assert.deepEqual(valuesOf(hover, "background"), otherCells, `${severity} highlights like the other edit cells`);
    assert.deepEqual(valuesOf(hover, "color"), [], `${severity} keeps the severity colour of its text`);
  }
});

/** The tokens the marked rows can read, as the default dark and light VS Code themes set them. */
const HOSTS = {
  dark: {
    "editor-background": "#1f1f1f",
    "errorForeground": "#f85149",
    "inputValidation-errorBackground": "#5a1d1d",
    "editorWarning-foreground": "#cca700",
    "list-hoverBackground": "#2a2d2e",
  },
  light: {
    "editor-background": "#ffffff",
    "errorForeground": "#f85149",
    "inputValidation-errorBackground": "#f2dede",
    "editorWarning-foreground": "#bf8803",
    "list-hoverBackground": "#f2f2f2",
  },
};

type Colour = [number, number, number, number];

/** What the page defines: the host's tokens, then the palette of the forced mode over them. */
function pageVariables(host: keyof typeof HOSTS, mode?: string): Map<string, string> {
  const variables = new Map(Object.entries(HOSTS[host]).map(([name, value]) => [`--studio-${name}`, value]));
  if (mode === undefined) return variables;
  const palette = rules().find((rule) => rule.selectors.includes(`html[data-sphinx-preview-theme-mode="${mode}"] body`));
  assert.ok(palette, `the stylesheet has the ${mode} palette`);
  for (const [name, value] of palette.declarations) {
    if (name.startsWith("--")) variables.set(name, value);
  }
  return variables;
}

/** The value with every var() replaced by the page's variable, or by its fallback. */
function resolve(value: string, variables: Map<string, string>): string {
  const start = value.indexOf("var(");
  if (start < 0) return value;
  let depth = 0;
  let comma = -1;
  let end = start + 3;
  for (; end < value.length; end += 1) {
    if (value[end] === "(") depth += 1;
    else if (value[end] === ")") {
      depth -= 1;
      if (depth === 0) break;
    } else if (value[end] === "," && depth === 1 && comma < 0) comma = end;
  }
  const name = value.slice(start + 4, comma < 0 ? end : comma).trim();
  const replacement = variables.get(name) ?? (comma < 0 ? "" : value.slice(comma + 1, end).trim());
  return resolve(value.slice(0, start) + replacement + value.slice(end + 1), variables);
}

/** A resolved colour in one of the forms these rules and palettes write. */
function colour(value: string): Colour {
  const mix = /^color-mix\(in srgb, (.+) (\d+)%, transparent\)$/u.exec(value);
  if (mix) {
    const [red, green, blue, alpha] = colour(mix[1]!);
    return [red, green, blue, alpha * Number(mix[2]) / 100];
  }
  const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/u.exec(value);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])];
  assert.match(value, /^#[0-9a-f]{6}$/iu, `a colour this test can read: ${value}`);
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return [red!, green!, blue!, 1];
}

/** What a translucent colour looks like over an opaque one. */
function over(top: Colour, under: Colour): Colour {
  const channel = (index: 0 | 1 | 2): number => top[index] * top[3] + under[index] * (1 - top[3]);
  return [channel(0), channel(1), channel(2), 1];
}

function luminance([red, green, blue]: Colour): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(first: Colour, second: Colour): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

/** The colours the shipped rules give a marked row; the last declaration of a rule set wins. */
function rowColours(name: string, value: string | undefined, variables: Map<string, string>): Record<string, string> {
  const last = (subject: string, property: string): string => resolve(valuesOf(subject, property).at(-1)!, variables);
  return {
    text: last(name, "color"),
    background: last(name, "background"),
    ...(value ? { underline: last(value, "text-decoration").replace(/^underline wavy /u, "") } : {}),
  };
}

/** In Dark, White and Cream a row reads nothing from the VS Code theme and stays readable. */
function assertForcedModeRow(name: string, value?: string): void {
  const editHover = "html[data-sphinx-preview-edit-mode=\"on\"] [data-okf-edit-cell]:hover";
  for (const mode of ["dark", "white", "cream"]) {
    const variables = pageVariables("dark", mode);
    const shown = rowColours(name, value, variables);
    assert.deepEqual(rowColours(name, value, pageVariables("light", mode)), shown, `${mode}: ${name} looks the same on both hosts`);
    const page = colour(variables.get("--studio-editor-background")!);
    const painted = over(colour(shown.background!), page);
    assert.equal(luminance(painted) > 0.5, luminance(page) > 0.5, `${mode}: ${name} has a background as light as the page`);
    // A field name cell that can be edited takes the edit hover background under the pointer.
    const hovered = over(colour(resolve(valuesOf(editHover, "background")[0]!, variables)), page);
    for (const [state, behind] of value ? [["rest", painted], ["hover", hovered]] as const : [["rest", painted]] as const) {
      const ratio = contrast(colour(shown.text!), behind);
      assert.ok(ratio >= 3, `${mode}, ${state}: the text of ${name} has a contrast of ${ratio.toFixed(2)}:1`);
    }
    if (value) assert.equal(shown.underline, shown.text, `${mode}: ${value} is underlined in the colour of the name`);
  }
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S10
test("in a forced preview mode the marked field rows take every colour from the mode's palette", () => {
  assertForcedModeRow("tr[data-okf-field].okf-error > th", "tr[data-okf-field] > td.okf-error");
  assertForcedModeRow("tr[data-okf-field].okf-warning > th", "tr[data-okf-field] > td.okf-warning");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023#S10
test("in a forced preview mode the whole-document warning row takes its colours from the mode's palette", () => {
  assertForcedModeRow(".okf-info-row.okf-warning th");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S1
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S6
test("the mode that follows the VS Code theme keeps the theme tokens, and the palette colours stay on these rows", () => {
  for (const host of ["dark", "light"] as const) {
    const tokens = HOSTS[host];
    const variables = pageVariables(host);
    const error = rowColours("tr[data-okf-field].okf-error > th", "tr[data-okf-field] > td.okf-error", variables);
    assert.deepEqual(error, {
      text: tokens.errorForeground,
      background: tokens["inputValidation-errorBackground"],
      underline: tokens.errorForeground,
    });
    const warning = rowColours("tr[data-okf-field].okf-warning > th", "tr[data-okf-field] > td.okf-warning", variables);
    assert.deepEqual(warning, {
      text: tokens["editorWarning-foreground"],
      background: `color-mix(in srgb, ${tokens["editorWarning-foreground"]} 14%, transparent)`,
      underline: tokens["editorWarning-foreground"],
    });
  }
  const palettes = rules().filter((rule) => rule.declarations.some(([name]) => name.startsWith("--sphinx-preview-issue-")));
  assert.equal(palettes.length, 3, "only the three forced palettes set the row colours");
  for (const selector of palettes.flatMap((rule) => rule.selectors)) {
    assert.match(selector, /^html\[data-sphinx-preview-theme-mode="(?:dark|white|cream)"\](?: body)?$/u);
  }
  const wholeDocumentError = [...valuesOf(".okf-info-row.okf-error th", "color"), ...valuesOf(".okf-info-row.okf-error th", "background")];
  assert.equal(wholeDocumentError.length, 2);
  assert.doesNotMatch(wholeDocumentError.join(" "), /--sphinx-preview-/u, "the whole-document error row keeps its look");
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
