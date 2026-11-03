/**
 * The release showcase scenarios: one long, full-page capture of a polished page for the release
 * notes and the README (CR 166: Cream, Auto width, collapsed toolbar, chart and diagram drawn), and
 * the 1.3 hero (a plan in edit mode with its card grid and code block rendered and the admonition
 * type list open on its note).
 */

import { MAIN } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const TYPE_LIST = ".sphinx-preview-edit-palette-menu[data-edit-popover-at='caret']";

export const RELEASE_SHOWCASE_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req StRS-MDOKFSTUDIO-CORE-001
    id: "rendering-core/v26-release-showcase-cream-1200",
    fixture: "70-release-showcase",
    theme: "light",
    previewThemeMode: "cream",
    width: 1200,
    height: 1000,
    scroll: { kind: "top" as const },
    fullPage: true,
    widthModeSwitch: "auto" as const,
    toolbarState: "collapsed" as const,
    description: "Release showcase capture, cream theme, Auto width, 1200 px, full page: a long engineering page with a captioned figure, a small table, a wide table that breaks out of the reading column, a Vega-Lite chart and a Mermaid diagram, all drawn.",
    contentAssertions: [
      { message: "the page has its two tables", selector: `${MAIN} > table`, count: 2 },
      { message: "the figure and its caption are rendered", selector: `${MAIN} > figure figcaption`, text: "Charging dominates" },
      {
        message: "the small table stays inside the reading column and the wide table leaves it",
        selector: MAIN,
        expr: "(() => { const content = document.getElementById('sphinx-myst-preview-content'); const style = getComputedStyle(content);"
          + " const column = content.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);"
          + " const [small, wide] = [...content.querySelectorAll(':scope > table')].map(table => table.getBoundingClientRect());"
          + " return small.width <= column + 1 && wide.width > column + 120 && wide.left >= 0 && wide.right <= document.documentElement.clientWidth; })()",
      },
      { message: "the wide table has twelve columns", selector: `${MAIN} > table:nth-of-type(2) thead th`, count: 12 },
      { message: "the chart is drawn as an image", selector: `${MAIN} .myst-vega-diagram[data-render-state="rendered"] img.myst-vega-image`, count: 1, visible: true },
      { message: "the Mermaid diagram is drawn as an image", selector: `${MAIN} .myst-mermaid-diagram[data-render-state="rendered"] img.myst-mermaid-image`, count: 1, visible: true },
      { message: "no chart or diagram is in an error state", selector: `${MAIN} [data-render-state="error"]`, count: 0 },
      { message: "the toolbar is collapsed", selector: "html", attr: { name: "data-sphinx-preview-toolbar-state", value: "collapsed" } },
      { message: "Auto width mode is on", selector: "html", attr: { name: "data-sphinx-preview-width", value: "auto" } },
    ],
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-PALETTE-269
    id: "rendering-core/v27-release-1-3-showcase-cream-1200",
    fixture: "80-release-1-3-showcase",
    theme: "light",
    previewThemeMode: "cream",
    width: 1200,
    height: 1000,
    scroll: { kind: "top" as const },
    editMode: true,
    toolbarState: "collapsed" as const,
    // The click lands mid-way along the note body, so ArrowUp puts the caret at the end of `:::{note}`
    // and one ArrowLeft puts it on the type.
    pageActions: [{ click: `${MAIN} aside.admonition.note > p:last-child`, waitMs: 400 }, { press: "ArrowUp" }, { press: "ArrowLeft", waitMs: 400 }],
    description: "Release 1.3 hero, cream theme, edit mode, 1200 px: a plan with a three-card grid (headers and footers) and a captioned code block stays rendered while its note is open with the admonition type list at the caret.",
    contentAssertions: [
      { message: "the grid shows three cards with their headers", selector: `${MAIN} .myst-grid .myst-grid-card-header`, count: 3, visible: true },
      { message: "and their footers", selector: `${MAIN} .myst-grid .myst-grid-card-footer`, count: 3, visible: true },
      { message: "the code block keeps its caption", selector: `${MAIN} figure figcaption`, text: "The session lookup during week 2" },
      { message: "the type list is open at the caret", selector: TYPE_LIST, count: 1, visible: true },
      {
        message: "the type list is inside the viewport",
        selector: MAIN,
        expr: `(() => { const box = document.querySelector("${TYPE_LIST}")?.getBoundingClientRect(); return !!box && box.top >= 0 && box.bottom <= window.innerHeight; })()`,
      },
    ],
  },
];
