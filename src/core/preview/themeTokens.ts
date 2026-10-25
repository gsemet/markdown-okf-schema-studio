/**
 * The neutral theme tokens of a preview page. The page stylesheet and the page scripts read only
 * `--studio-*` custom properties; this module is the one place that maps them to the variables of
 * the VS Code host (`--vscode-*`, which VS Code sets on the page's root element). Another host maps
 * the same tokens to its own palette instead. The page's own theme modes (dark, white, cream) set
 * the tokens directly (see `previewStyles.ts`). Pure module: no host API, no DOM, no Node built-ins.
 *
 * A token carries the host variable's name after the prefix (`--studio-editor-background` is
 * `--vscode-editor-background`), so the mapping is mechanical and a rule reads the same as before.
 */

/** The prefix of the page's neutral theme tokens. */
export const STUDIO_TOKEN_PREFIX = "--studio-";

/** The prefix of the VS Code host's theme variables. */
export const VSCODE_VARIABLE_PREFIX = "--vscode-";

/** The theme tokens the page uses, by the name they share with the VS Code theme variables. */
export const THEME_TOKEN_NAMES = [
  "button-background",
  "button-border",
  "button-foreground",
  "button-hoverBackground",
  "button-secondaryBackground",
  "button-secondaryForeground",
  "charts-blue",
  "charts-green",
  "charts-orange",
  "charts-purple",
  "charts-red",
  "charts-yellow",
  "checkbox-background",
  "descriptionForeground",
  "dropdown-background",
  "dropdown-border",
  "dropdown-foreground",
  "editor-background",
  "editor-findMatchHighlightBackground",
  "editor-font-family",
  "editor-font-size",
  "editor-foreground",
  "editorGutter-addedBackground",
  "editorHoverWidget-background",
  "editorHoverWidget-border",
  "editorHoverWidget-foreground",
  "editorWarning-foreground",
  "editorWidget-background",
  "editorWidget-border",
  "editorWidget-foreground",
  "errorForeground",
  "focusBorder",
  "font-family",
  "foreground",
  "icon-foreground",
  "input-background",
  "input-border",
  "input-foreground",
  "inputValidation-errorBackground",
  "inputValidation-errorBorder",
  "inputValidation-errorForeground",
  "list-activeSelectionBackground",
  "list-activeSelectionForeground",
  "list-hoverBackground",
  "markdown-font-family",
  "markdown-font-size",
  "markdown-line-height",
  "panel-border",
  "scrollbarSlider-background",
  "scrollbarSlider-hoverBackground",
  "textBlockQuote-background",
  "textCodeBlock-background",
  "textLink-foreground",
  "toolbar-activeBackground",
  "toolbar-hoverBackground",
  "widget-border",
  "widget-shadow",
] as const;

/** One theme token name (without prefix). */
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

/** The custom property of a theme token, e.g. `--studio-editor-background`. */
export function studioToken(name: ThemeTokenName): string {
  return STUDIO_TOKEN_PREFIX + name;
}

// @implements_req SwRS-MDOKFSTUDIO-THEME-016
// @implements_req SwRS-MDOKFSTUDIO-THEME-034
/**
 * The VS Code mapping of the theme tokens: each token takes the value of its `--vscode-*` variable.
 * It is declared on the root element, where VS Code sets its variables, and again on `body`, so a
 * host (or a test page) that sets the variables on `body` maps the same way. A variable the host
 * does not set leaves its token unset, so the fallback of every `var(--studio-…, fallback)` applies
 * exactly as it did for the variable. The theme modes override the tokens with more specific
 * selectors.
 */
export const VSCODE_THEME_TOKEN_CSS = `
:root,
body {
${THEME_TOKEN_NAMES.map((name) => `  ${STUDIO_TOKEN_PREFIX}${name}: var(${VSCODE_VARIABLE_PREFIX}${name});`).join("\n")}
}
`;
