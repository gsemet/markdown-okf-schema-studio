/**
 * The link list hint scenarios (CR 220): a filename-stem link list in a workspace of more than 500
 * Markdown files. Its item is a sibling of the document whose stem sorts past the 500th stem; the
 * writer edits the item (types a letter, then Backspace) and the status line of the list editor
 * shows no "No Markdown file" warning, because the warning checks the full stem index.
 */

import { LINK_HINT_TARGET } from "./generatedFixtures";
import { MAIN, type ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion, PageAction } from "./scenarios";

const ROW = `${MAIN} table.okf-properties tr[data-okf-field='related']`;
const EDITOR = `${ROW} [data-okf-frontmatter-editor]`;
const ITEM = `${EDITOR} [data-okf-list-item-input]`;
const STATUS = `${EDITOR} [role='status']`;

const rowStems = (attribute: string): string =>
  `JSON.parse(document.querySelector("${ROW}").getAttribute("${attribute}") || "[]")`;

const ACTIONS: PageAction[] = [
  { click: `${ROW} td[data-okf-edit-cell='value']`, waitMs: 250 },
  // A click in the middle of the input puts the caret after the short value.
  { click: ITEM, waitMs: 150 },
  { press: "x", waitMs: 100 },
  { press: "Backspace", waitMs: 250 },
];

const ASSERTIONS: ContentAssertion[] = [
  { message: "the row knows every Markdown stem of the workspace, the sibling included, beyond the 500 dropdown entries", selector: ROW,
    expr: `(() => { const known = ${rowStems("data-okf-link-known")}; return known.length > 500 && known.includes("${LINK_HINT_TARGET}"); })()` },
  { message: "the dropdown suggestions are capped at 500 and list the document's folder (the sibling included) before the filler folder", selector: ROW,
    expr: `(() => { const suggestions = ${rowStems("data-okf-link-suggestions")}; const sibling = suggestions.indexOf("${LINK_HINT_TARGET}"); `
      + `const filler = suggestions.findIndex((stem) => stem.startsWith("a-")); return suggestions.length === 500 && sibling >= 0 && filler > sibling; })()` },
  { message: "the edited item keeps the sibling's stem and is not marked invalid", selector: ITEM, count: 1,
    expr: `(() => { const input = document.querySelector("${ITEM}"); return input.value === "${LINK_HINT_TARGET}" && !input.hasAttribute("aria-invalid"); })()` },
  { message: "the status line of the list editor shows no missing-file warning for the sibling", selector: STATUS, count: 1, notText: "No Markdown file" },
  { message: "the floating toolbar does not cover the list editor and its status line", selector: EDITOR,
    expr: "(() => { const editor = document.querySelector(\"" + EDITOR + "\").getBoundingClientRect(); "
      + "const toolbar = document.querySelector('[data-sphinx-preview-toolbar]')?.getBoundingClientRect(); "
      + "return !toolbar || toolbar.bottom <= editor.top || toolbar.top >= editor.bottom || toolbar.right <= editor.left || toolbar.left >= editor.right; })()" },
];

export const LINK_HINT_SCENARIOS: ScenarioDefinition[] = ([["cream", "light"], ["dark", "dark"]] as const).map(([name, theme], index) => ({
  // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
  id: `frontmatter-editing/v${String(7 + index).padStart(2, "0")}-link-hint-known-stem-${name}-900`,
  fixture: "gen-link-hint",
  theme,
  ...(name === "cream" ? { previewThemeMode: "cream" as const } : {}),
  width: 900,
  height: 640,
  scroll: { kind: "top" as const },
  render: { fixturesWorkspace: true as const },
  toolbarState: "collapsed" as const,
  editMode: true,
  pageActions: ACTIONS,
  contentAssertions: ASSERTIONS,
  description: `A filename-stem link list in a workspace of more than 500 Markdown files, ${name} theme: `
    + `its item ${LINK_HINT_TARGET} is a sibling of the document whose stem sorts past the 500th stem. `
    + "The writer edits the item (a letter, then Backspace): the status line under the list shows no missing-file warning, "
    + "the dropdown lists the document's folder first, and the collapsed toolbar leaves the editor clear.",
}));
