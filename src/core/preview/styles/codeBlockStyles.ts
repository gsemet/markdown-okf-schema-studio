import { codeColorRules, DARK_CODE_SURFACE, DARK_LINE_NUMBER_COLOR } from "../../render/codeTheme";

const CONTENT = "#sphinx-myst-preview-content";
// The two page settings reach the page as attributes of the root element (see
// `applyCodeBlockSettings`). An absent attribute means the default, which is on for both.
const DARK_ON = 'html:not([data-okf-code-dark-background="false"])';
const DARK_OFF = 'html[data-okf-code-dark-background="false"]';
const NUMBERS_ON = 'html:not([data-okf-code-line-numbers="false"])';
const BOTH_ON = 'html:not([data-okf-code-dark-background="false"]):not([data-okf-code-line-numbers="false"])';

// Light blocks (dark background off) use the Light+ colours when the page itself is light.
const LIGHT_SCOPES = [
  `${DARK_OFF}[data-sphinx-preview-theme-mode="cream"] ${CONTENT} code.shiki`,
  `${DARK_OFF}[data-sphinx-preview-theme-mode="white"] ${CONTENT} code.shiki`,
  `${DARK_OFF}[data-sphinx-preview-theme-mode="current"] body:is(.vscode-light, .vscode-high-contrast-light) ${CONTENT} code.shiki`,
];

// @implements_req SwRS-MDOKFSTUDIO-CODE-001
// @implements_req SwRS-MDOKFSTUDIO-CODE-005
// @implements_req SwRS-MDOKFSTUDIO-CODE-039
// @implements_req SwRS-MDOKFSTUDIO-CODE-040
/**
 * Code blocks: the VS Code Dark+ token colours, the dark background and the line numbers.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`), joined after the content block rules
 * it refines. A token colour is a class (`sd-…` dark, `sl-…` light), never an inline style.
 */
export const CODE_BLOCK_CSS = `
/* Dark background (preview.codeBlocks.darkBackground, on by default): every code block is a Dark+
   editor surface in every preview theme. Inline code keeps its own look. */
${DARK_ON} ${CONTENT} pre:has(> code) {
  border-color: rgba(255, 255, 255, 0.14);
  background: ${DARK_CODE_SURFACE.background};
  color: ${DARK_CODE_SURFACE.foreground};
}

${DARK_ON} ${CONTENT} pre:has(> code) .myst-code-filename {
  color: ${DARK_LINE_NUMBER_COLOR};
}

${DARK_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) {
  padding: 0.9em 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
}

${DARK_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) .myst-code-filename {
  padding-inline: 1em;
}

${DARK_ON} ${CONTENT} pre:has(> code) .myst-code-line-emphasized {
  background: rgba(255, 255, 255, 0.14);
}

/* Token colours and font styles. */
${CONTENT} code.shiki .shk-italic { font-style: italic; }
${CONTENT} code.shiki .shk-bold { font-weight: 700; }
${CONTENT} code.shiki .shk-underline { text-decoration: underline; }
${CONTENT} code.shiki .shk-strike { text-decoration: line-through; }
${codeColorRules(`${CONTENT} code.shiki`, LIGHT_SCOPES)}

/* Line numbers (preview.codeBlocks.lineNumbers, on by default): a block of two lines or more is
   numbered; the MyST :linenos: option numbers it whatever the setting says. The number is
   generated content, so neither a selection nor the copy button picks it up. */
${CONTENT} code[data-myst-line-numbers="true"] .myst-code-line,
${NUMBERS_ON} ${CONTENT} code[data-myst-auto-numbers="true"] .myst-code-line {
  padding-inline-start: 4ch;
}

${CONTENT} code[data-myst-line-numbers="true"][data-myst-line-digits="4"] .myst-code-line,
${NUMBERS_ON} ${CONTENT} code[data-myst-auto-numbers="true"][data-myst-line-digits="4"] .myst-code-line {
  padding-inline-start: 5ch;
}

${CONTENT} code[data-myst-line-numbers="true"] .myst-code-line::before,
${NUMBERS_ON} ${CONTENT} code[data-myst-auto-numbers="true"] .myst-code-line::before {
  position: absolute;
  inset-inline-start: 0;
  width: 3ch;
  color: var(--studio-descriptionForeground, #808080);
  content: attr(data-line-number);
  text-align: end;
  user-select: none;
  -webkit-user-select: none;
}

${CONTENT} code[data-myst-line-numbers="true"][data-myst-line-digits="4"] .myst-code-line::before,
${NUMBERS_ON} ${CONTENT} code[data-myst-auto-numbers="true"][data-myst-line-digits="4"] .myst-code-line::before {
  width: 4ch;
}

/* A diff block has no padding of its own (its lines run edge to edge); on the dark background the
   lines carry the inset instead. */
${DARK_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) .myst-code-line {
  padding-inline: 1em;
}

${DARK_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) code[data-myst-line-numbers="true"] .myst-code-line,
${BOTH_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) code[data-myst-auto-numbers="true"] .myst-code-line {
  padding-inline-start: calc(1em + 4ch);
}

${DARK_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) code[data-myst-line-numbers="true"] .myst-code-line::before,
${BOTH_ON} ${CONTENT} pre.myst-code-block-diff:has(> code) code[data-myst-auto-numbers="true"] .myst-code-line::before {
  inset-inline-start: 1em;
}

${DARK_ON} ${CONTENT} pre:has(> code) code[data-myst-line-numbers="true"] .myst-code-line::before,
${DARK_ON} ${CONTENT} pre:has(> code) code[data-myst-auto-numbers="true"] .myst-code-line::before {
  color: ${DARK_LINE_NUMBER_COLOR};
}
`;
