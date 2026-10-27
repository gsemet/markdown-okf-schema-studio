/**
 * The reading comfort scenarios of code blocks (CR 131): the Dark+ background, the Dark+ token
 * colours and the line numbers, in the cream, white and dark preview themes, with the two settings
 * on (the defaults) and off.
 */

import { MAIN } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";
import type { ContentAssertion } from "./scenarios";

/** The content of the `pre` blocks of the fixture, by position: Python, YAML, shell, shell (one line), plain, MyST. */
const PRE = `${MAIN} pre`;
const lineNumber = (preIndex: number, lineIndex: number): string =>
  `(getComputedStyle(document.querySelectorAll('${PRE}')[${preIndex}].querySelectorAll('.myst-code-line')[${lineIndex}], '::before').content)`;

const BLOCKS: ContentAssertion[] = [
  { message: "the six code blocks of the fixture are rendered", selector: PRE, count: 6 },
  { message: "the blocks of the highlighted languages carry the Shiki class", selector: `${MAIN} code.shiki`, count: 5 },
  { message: "the unknown language stays plain text: no token span in it", selector: PRE, expr: `document.querySelectorAll('${PRE}')[4].querySelector('[class*="sd-"]') === null && document.querySelectorAll('${PRE}')[4].textContent === 'depot :: promote\\ndepot :: drain\\n'` },
  { message: "the text of a numbered block is its source text, line numbers excluded", selector: PRE, expr: `document.querySelectorAll('${PRE}')[0].textContent.startsWith('downloaded = self._download_file_in_cache(\\n    expected_sha256=expected_sha256,') && !/^\\s*[0-9]+\\s/m.test(document.querySelectorAll('${PRE}')[0].textContent)` },
  { message: "selecting a numbered block selects its source text only, no line number", selector: PRE, expr: `(() => { const pre = document.querySelectorAll('${PRE}')[0]; const selection = getSelection(); selection.selectAllChildren(pre); const text = selection.toString(); selection.removeAllRanges(); return text.trimEnd() === pre.textContent.trimEnd() && text.startsWith('downloaded = self._download_file_in_cache(\\n') && !/^\\s*[0-9]+\\s/m.test(text); })()` },
  { message: "a code block never overflows the page horizontally", selector: MAIN, expr: "document.documentElement.scrollWidth <= window.innerWidth" },
];

/** Dark background on (the default). */
export const DARK_BACKGROUND_ASSERTIONS: ContentAssertion[] = [
  ...BLOCKS,
  { message: "every code block is drawn on the Dark+ background with its default text colour", selector: PRE, count: 6, expr: `[...document.querySelectorAll('${PRE}')].every((pre) => getComputedStyle(pre).backgroundColor === 'rgb(30, 30, 30)' && getComputedStyle(pre).color === 'rgb(212, 212, 212)')` },
  { message: "Python control keywords and comments take their Dark+ colours", selector: `${PRE} code.language-python`, expr: `(() => { const code = document.querySelector('${PRE} code.language-python'); const color = (cls) => getComputedStyle(code.querySelector('.' + cls)).color; return color('sd-c586c0') === 'rgb(197, 134, 192)' && color('sd-6a9955') === 'rgb(106, 153, 85)'; })()` },
  { message: "YAML keys and the shell string take their Dark+ colours", selector: PRE, expr: `(() => { const color = (pre, cls) => getComputedStyle(document.querySelectorAll('${PRE}')[pre].querySelector('.' + cls)).color; return color(1, 'sd-569cd6') === 'rgb(86, 156, 214)' && color(2, 'sd-ce9178') === 'rgb(206, 145, 120)'; })()` },
  { message: "inline code keeps its own look: no dark background", selector: `${MAIN} :not(pre) > code`, min: 3, expr: `[...document.querySelectorAll('${MAIN} :not(pre) > code')].every((code) => getComputedStyle(code).backgroundColor !== 'rgb(30, 30, 30)')` },
];

/** Line numbers on (the default) and the MyST options. */
export const LINE_NUMBER_ASSERTIONS: ContentAssertion[] = [
  { message: "the Python block shows numbers from 1 as generated content", selector: PRE, expr: `${lineNumber(0, 0)} === '"1"' && ${lineNumber(0, 6)} === '"7"'` },
  { message: "the YAML and shell blocks are numbered", selector: PRE, expr: `${lineNumber(1, 2)} === '"3"' && ${lineNumber(2, 1)} === '"2"'` },
  { message: "a one-line block has no line element and no number", selector: PRE, expr: `document.querySelectorAll('${PRE}')[3].querySelector('.myst-code-line') === null` },
  { message: "the unknown-language block of two lines is numbered too", selector: PRE, expr: `${lineNumber(4, 1)} === '"2"'` },
  { message: "the MyST block is numbered from 10 and its second line is emphasized", selector: PRE, expr: `${lineNumber(5, 0)} === '"10"' && document.querySelectorAll('${PRE}')[5].querySelectorAll('.myst-code-line')[1].classList.contains('myst-code-line-emphasized')` },
  { message: "the line number is dim but readable (AA, 4.5:1) on the dark background", selector: PRE, expr: `(() => { const parse = (value) => value.match(/[\\d.]+/g).slice(0, 3).map(Number); const lum = ([r, g, b]) => { const f = (v) => { const u = v / 255; return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }; const number = parse(getComputedStyle(document.querySelector('${PRE} .myst-code-line'), '::before').color); const background = parse(getComputedStyle(document.querySelector('${PRE}')).backgroundColor); const [a, b] = [lum(number), lum(background)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05) >= 4.5; })()` },
];

/** Line numbers off: the automatic numbers go, the MyST option stays. */
export const NO_AUTOMATIC_NUMBER_ASSERTIONS: ContentAssertion[] = [
  { message: "the Python block shows no line number", selector: PRE, expr: `${lineNumber(0, 0)} === 'none' || ${lineNumber(0, 0)} === 'normal'` },
  { message: "the MyST block with :linenos: is still numbered from 10", selector: PRE, expr: `${lineNumber(5, 0)} === '"10"'` },
];

/** Dark background off: the theme background and the Light+ colours. */
export const LIGHT_BLOCK_ASSERTIONS: ContentAssertion[] = [
  ...BLOCKS,
  { message: "the code blocks keep the soft background of the theme, not the Dark+ one", selector: PRE, count: 6, expr: `[...document.querySelectorAll('${PRE}')].every((pre) => getComputedStyle(pre).backgroundColor !== 'rgb(30, 30, 30)')` },
  { message: "the Python tokens use the Light+ colours, not the Dark+ ones", selector: `${PRE} code.language-python`, expr: `(() => { const code = document.querySelector('${PRE} code.language-python'); const color = (cls) => getComputedStyle(code.querySelector('.' + cls)).color; return color('sd-c586c0') !== 'rgb(197, 134, 192)' && color('sd-6a9955') !== 'rgb(106, 153, 85)'; })()` },
];

const COMMON = {
  fixture: "67-code-block-comfort",
  width: 900,
  height: 1100,
  scroll: { kind: "top" as const },
  fullPage: true,
};

export const CODE_BLOCK_COMFORT_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-039
    // @tests_req SwRS-MDOKFSTUDIO-CODE-040
    id: "code-blocks/v19-comfort-cream-900",
    ...COMMON,
    theme: "dark",
    previewThemeMode: "cream",
    contentAssertions: [...DARK_BACKGROUND_ASSERTIONS, ...LINE_NUMBER_ASSERTIONS],
    description: "Code blocks in the cream theme with the defaults: Dark+ background and colours, line numbers on blocks of two lines or more, a one-line block without a number, an unknown language as plain text and a MyST block numbered from 10 with its second line emphasized.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-040
    id: "code-blocks/v20-comfort-white-900",
    ...COMMON,
    theme: "dark",
    previewThemeMode: "white",
    contentAssertions: [...DARK_BACKGROUND_ASSERTIONS, ...LINE_NUMBER_ASSERTIONS],
    description: "The same code blocks in the white theme: the Dark+ background and colours and the line numbers are the same as in cream.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-040
    id: "code-blocks/v21-comfort-dark-900",
    ...COMMON,
    theme: "dark",
    contentAssertions: [...DARK_BACKGROUND_ASSERTIONS, ...LINE_NUMBER_ASSERTIONS],
    description: "The same code blocks in the dark theme: Dark+ background and colours, line numbers, and inline code that keeps its own look.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-039
    id: "code-blocks/v22-comfort-no-numbers-cream-900",
    ...COMMON,
    theme: "dark",
    previewThemeMode: "cream",
    render: { codeBlocksLineNumbers: false },
    contentAssertions: [...DARK_BACKGROUND_ASSERTIONS, ...NO_AUTOMATIC_NUMBER_ASSERTIONS],
    description: "Cream theme with the line numbers setting off: no automatic number, the MyST block with :linenos: is still numbered from 10.",
  },
  {
    // @tests_req SwRS-MDOKFSTUDIO-CODE-040
    id: "code-blocks/v23-comfort-light-blocks-cream-900",
    ...COMMON,
    theme: "dark",
    previewThemeMode: "cream",
    render: { codeBlocksDarkBackground: false },
    contentAssertions: [...LIGHT_BLOCK_ASSERTIONS, ...LINE_NUMBER_ASSERTIONS.slice(0, 5)],
    description: "Cream theme with the dark background setting off: the code blocks keep the theme background and use the Light+ colours; the numbers stay.",
  },
];
