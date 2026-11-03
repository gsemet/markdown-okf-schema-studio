/**
 * The admonition type picker (CR 244): with the caret on the type of a GFM alert head or of a MyST
 * admonition head, a list of the types of that syntax, with their icons, opens at the caret.
 */

import { MAIN, WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const EDITOR = "document.querySelector('.sphinx-preview-block-editor textarea[aria-label=\"Raw Markdown block\"]')";
const EDITOR_TEXT = `${EDITOR}?.value ?? ''`;
const PICKER = ".sphinx-preview-edit-palette-menu[data-edit-popover-at='caret']";
const OPTIONS = `${PICKER} [role='menuitem']`;
/** The whole list is inside the viewport: nothing of it is clipped. */
const IN_VIEWPORT = `(() => { const list = document.querySelector("${PICKER}"); if (!list) return false; const box = list.getBoundingClientRect(); `
  + "return box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth; })()";

// The click lands mid-way along the body line, so ArrowUp puts the caret at the end of the head line
// (`> [!NOTE]` or `:::{note}`, nine characters) and one ArrowLeft puts it on the last letter of the type.
const OPEN_ON_TYPE = (target: string) => [
  { click: target, waitMs: 400 },
  { press: "ArrowUp" },
  { press: "ArrowLeft", waitMs: 400 },
];

function assertions(headLine: string, types: string[] | undefined): ContentAssertion[] {
  const list: ContentAssertion[] = [
    { message: "the editor holds the head line with its type, unchanged", selector: MAIN, expr: `(${EDITOR_TEXT}).startsWith(${JSON.stringify(headLine)})` },
    { message: "the type list is open at the caret", selector: PICKER, count: 1, visible: true },
    { message: "the whole list is inside the viewport", selector: MAIN, expr: IN_VIEWPORT },
  ];
  if (types) {
    list.push({
      message: `the list holds the types ${types.join(", ")}`,
      selector: MAIN,
      expr: `[...document.querySelectorAll("${OPTIONS}")].map((item) => item.getAttribute('data-edit-option')).join(',') === ${JSON.stringify(types.join(","))}`,
    });
  } else {
    list.push({
      message: "the list holds the MyST admonition types, including note and no custom entry",
      selector: MAIN,
      expr: `(() => { const values = [...document.querySelectorAll("${OPTIONS}")].map((item) => item.getAttribute('data-edit-option')); return values.length > 5 && values.includes('note') && !values.includes('custom'); })()`,
    });
  }
  return list;
}

const VARIANTS = [
  { name: "light", theme: "light" },
  { name: "dark", theme: "dark" },
] as const;

export const ADMONITION_TYPE_PICKER_SCENARIOS: ScenarioDefinition[] = [
  ...VARIANTS.map((variant, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-269
    id: `palette-slash/v${36 + index}-alert-type-picker-${variant.name}-900`,
    fixture: "78-gfm-alert-type-picker",
    theme: variant.theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: OPEN_ON_TYPE(`${MAIN} aside.admonition.note > p:last-child`),
    contentAssertions: assertions("> [!NOTE]", ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]),
    description: `Edit mode, ${variant.name} theme, 900 px: with the caret on the type of the opened note alert, the five GFM types are listed with their icons at the caret.`,
  })),
  ...VARIANTS.map((variant, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-269
    id: `palette-slash/v${38 + index}-admonition-type-picker-${variant.name}-900`,
    fixture: "79-myst-admonition-type-picker",
    theme: variant.theme,
    ...WIDE,
    scroll: { kind: "top" as const },
    editMode: true,
    pageActions: OPEN_ON_TYPE(`${MAIN} aside.admonition.note > p:last-child`),
    contentAssertions: assertions(":::{note}", undefined),
    description: `Edit mode, ${variant.name} theme, 900 px: with the caret on the type of the opened note directive, the admonition types are listed with their icons at the caret.`,
  })),
];
