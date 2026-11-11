/**
 * The style sheets of an exported page: the preview sheet made independent of the VS Code host,
 * the rule that freezes the resolved theme tokens, the sheet of the elements the export changes
 * (tabs, the properties details), and the KaTeX sheet with its fonts inline. Pure module: no host
 * API, no DOM, no Node built-ins.
 */

import { STUDIO_TOKEN_PREFIX, THEME_TOKEN_NAMES, VSCODE_VARIABLE_PREFIX } from "../preview/themeTokens";

/** Makes CSS text safe to put in a `<style>` element: it cannot close the element. */
export function styleText(css: string): string {
  return css.replace(/<\/(style)/giu, "<\\/$1");
}

/**
 * The preview sheet without its dependence on the host. The mapping of the tokens to `--vscode-*`
 * variables goes (the export writes the resolved values instead), and the `body` classes VS Code
 * sets for the theme kind are renamed to the classes the export writes on its own `body`, so the
 * file holds no `vscode-` name at all.
 */
export function exportPreviewStylesheet(css: string): string {
  const mapping = new RegExp(`\\s*${STUDIO_TOKEN_PREFIX}[\\w-]+:\\s*var\\(${VSCODE_VARIABLE_PREFIX}[\\w-]+\\);`, "gu");
  return css
    .replace(mapping, "")
    .replace(/\.vscode-/gu, ".studio-kind-")
    .replace(/vscode-/gu, "studio-");
}

/** The class the export writes on `body` for a VS Code theme kind (1 light, 2 dark, 3 and 4 high contrast). */
export function themeKindClass(kind: string | undefined): string {
  switch (kind) {
    case "2": return "studio-kind-dark";
    case "3": return "studio-kind-high-contrast";
    case "4": return "studio-kind-high-contrast-light";
    default: return "studio-kind-light";
  }
}

/** A token value as one safe CSS value (no rule or element can end inside it). */
function tokenValue(value: string): string {
  return value.replace(/[{}<>;\\]|\/\*/gu, "").replace(/\s+/gu, " ").trim();
}

/** The `:root, body` rule of the resolved tokens, for every token of {@link THEME_TOKEN_NAMES} the page resolved. */
export function tokenRule(tokens: Record<string, string>): string {
  const declarations = THEME_TOKEN_NAMES
    .filter((name) => tokenValue(tokens[name] ?? "") !== "")
    .map((name) => `  ${STUDIO_TOKEN_PREFIX}${name}: ${tokenValue(tokens[name]!)};`);
  return `:root,\nbody {\n${declarations.join("\n")}\n}`;
}

const CONTENT = "#sphinx-myst-preview-content";

/** The rules of the elements the export changes: CSS-only tab sets and the properties `details`. */
export function exportSheet(maxTabs: number, colorScheme: "light" | "dark"): string {
  const set = `${CONTENT} .myst-tab-set`;
  const perTab = Array.from({ length: maxTabs }, (_unused, index) => {
    const tab = index + 1;
    const checked = `${set} > .myst-tab-radio[data-export-tab="${tab}"]:checked`;
    return `${checked} ~ .myst-tab-panel[data-export-tab="${tab}"] {
  display: block;
}

${checked} ~ .myst-tab-list > .myst-tab[data-export-tab="${tab}"] {
  border-color: var(--sphinx-preview-border);
  border-bottom-color: var(--studio-editor-background, Canvas);
  color: var(--studio-editor-foreground, inherit);
  font-weight: 600;
}

${set} > .myst-tab-radio[data-export-tab="${tab}"]:focus-visible ~ .myst-tab-list > .myst-tab[data-export-tab="${tab}"] {
  outline: 2px solid var(--studio-focusBorder, currentColor);
  outline-offset: -2px;
}`;
  }).join("\n\n");
  return `:root {
  color-scheme: ${colorScheme};
}

${set} {
  position: relative;
}

${set} > .myst-tab-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
}

${set} > .myst-tab-panel {
  display: none;
}

${perTab}

${CONTENT} details[data-okf-properties] > summary.okf-properties-title {
  cursor: pointer;
}

${CONTENT} details[data-okf-properties]:not([open]) > summary.okf-properties-title {
  margin-bottom: 0;
}
`;
}

/** The relative URLs of the `woff2` fonts a KaTeX sheet loads. */
export function katexFontUrls(css: string): string[] {
  return [...new Set([...css.matchAll(/url\(([^)]+?\.woff2)\)/gu)].map((match) => match[1]!))];
}

/**
 * The KaTeX sheet with each font as one `woff2` data URI (`fonts` maps the relative URL to it); the
 * `woff` and `ttf` sources are dropped. A font with no data keeps no source.
 */
export function katexExportCss(css: string, fonts: ReadonlyMap<string, string>): string {
  return css.replace(
    /src:url\(([^)]+?\.woff2)\) format\("woff2"\)(?:,url\([^)]+\) format\("[a-z]+"\))*/gu,
    (_match, url: string) => {
      const data = fonts.get(url);
      return data === undefined ? 'src:local("serif")' : `src:url(${data}) format("woff2")`;
    },
  );
}
