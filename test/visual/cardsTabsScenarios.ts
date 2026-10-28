/**
 * The MyST cards, tabs and version notes scenarios (CR 148): the version titles, a standalone card
 * with its header and footer and a tab set, in the cream and dark previews (the README images), and
 * the keyboard on the tabs of the real page bundle.
 */

import { MAIN } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

const TABS = `${MAIN} > .myst-tab-set`;
const shownPanels = "[...document.querySelectorAll('#sphinx-myst-preview-content > .myst-tab-set > .myst-tab-panel')].filter((panel) => panel.getBoundingClientRect().height > 0)";
const selectedTabs = "[...document.querySelectorAll('#sphinx-myst-preview-content > .myst-tab-set > .myst-tab-list > .myst-tab')].filter((tab) => tab.getAttribute('aria-selected') === 'true')";

const READ_ASSERTIONS: ContentAssertion[] = [
  { message: "the three version notes are titled with their version and no trailing colon", selector: `${MAIN} .admonition-title`, count: 3, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content .admonition-title')].map((title) => title.textContent.trim()).join('|') === 'Added in version 0.47|Changed in version 0.50|Deprecated since version 1.0'" },
  { message: "the card shows its header above the title, then the body and the footer", selector: `${MAIN} > .myst-card`, count: 1, expr: "[...document.querySelector('#sphinx-myst-preview-content > .myst-card').children].map((part) => part.className.replace('myst-grid-card-', '')).join(' ') === 'header title body footer'" },
  { message: "the card header carries the :header: line and the footer the :footer: line", selector: `${MAIN} > .myst-card .myst-grid-card-header`, count: 1, text: "Since v2.1.154, published 2026-05-28" },
  { message: "the card footer text is shown", selector: `${MAIN} > .myst-card .myst-grid-card-footer`, count: 1, text: "Documented in the workflows guide" },
  { message: "the card is inside the pane", selector: `${MAIN} > .myst-card`, insidePane: true },
  { message: "the tab bar holds three tabs with the tab roles", selector: `${TABS} > .myst-tab-list[role='tablist'] > .myst-tab[role='tab']`, count: 3 },
  { message: "the :selected: tab is Node and only its panel is shown", selector: TABS, expr: `${selectedTabs}.map((tab) => tab.textContent).join() === 'Node' && ${shownPanels}.map((panel) => panel.textContent.trim()).join() === 'Install it with npm install studio.'` },
  { message: "every tab points to a panel that points back to it", selector: TABS, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content > .myst-tab-set > .myst-tab-list > .myst-tab')].every((tab) => { const panel = document.getElementById(tab.getAttribute('aria-controls')); return panel !== null && panel.getAttribute('aria-labelledby') === tab.id; })" },
  { message: "the selected tab is drawn apart from the others and the tab set stays inside the pane", selector: TABS, insidePane: true, expr: `getComputedStyle(${selectedTabs}[0]).fontWeight === '600'` },
  { message: "the text after the tabs renders", selector: `${MAIN} p`, text: "Text after the tabs renders normally." },
];

const KEYBOARD_ASSERTIONS: ContentAssertion[] = [
  { message: "after a click on Shell, Home, ArrowRight and End the Shell tab is selected, focused and alone shows its panel", selector: TABS, expr: `${selectedTabs}.map((tab) => tab.textContent).join() === 'Shell' && document.activeElement.textContent === 'Shell' && ${shownPanels}.map((panel) => panel.textContent.trim()).join() === 'Install it with brew install studio.'` },
  { message: "the tabs that are not selected leave the tab order", selector: TABS, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content > .myst-tab-set > .myst-tab-list > .myst-tab')].map((tab) => tab.getAttribute('tabindex')).join() === '-1,-1,0'" },
];

export const CARDS_TABS_SCENARIOS: ScenarioDefinition[] = [
  ...([
    { name: "cream", theme: "light", mode: "cream" },
    { name: "dark", theme: "dark", mode: undefined },
  ] as const).map((variant, index) => ({
    // @tests_req SwRS-MDOKFSTUDIO-MYST-001
    // @tests_req SwRS-MDOKFSTUDIO-MYST-100
    // @tests_req SwRS-MDOKFSTUDIO-MYST-098
    id: `myst/v${41 + index}-cards-tabs-version-${variant.name}-900`,
    fixture: "68-cards-tabs-version",
    theme: variant.theme,
    ...(variant.mode ? { previewThemeMode: variant.mode } : {}),
    width: 900,
    height: 1000,
    scroll: { kind: "selector" as const, value: "main h1", offset: -24 },
    contentAssertions: READ_ASSERTIONS,
    description: `Version notes, a standalone card and a tab set, ${variant.name} preview, 900 px pane.`,
  })),
  {
    // @tests_req SwRS-MDOKFSTUDIO-MYST-099
    id: "myst/v43-tabs-keyboard-light-900",
    fixture: "68-cards-tabs-version",
    theme: "light",
    width: 900,
    height: 1000,
    scroll: { kind: "selector" as const, value: "main .myst-tab-set", offset: 120 },
    pageActions: [
      { click: `${TABS} > .myst-tab-list > .myst-tab:nth-child(3)` },
      { press: "Home" },
      { press: "ArrowRight" },
      { press: "End" },
    ],
    contentAssertions: KEYBOARD_ASSERTIONS,
    description: "A click on the third tab, then Home, ArrowRight and End on the focused tab, light theme, 900 px pane.",
  },
];
