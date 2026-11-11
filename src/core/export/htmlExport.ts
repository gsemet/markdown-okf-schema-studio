/**
 * Builds the file of the "Export to HTML" command: one self-contained HTML document from the
 * snapshot the preview page sent. No script, no linked file, no `@import`: the style sheets, the
 * images and the math fonts are inline. Pure module: no host API, no DOM, no Node built-ins; the
 * session reads the files and passes their data in.
 */

import { parseFragment, serialize } from "parse5";
import { escapeHtml } from "../syntax/markdownSyntax";
import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS, previewContentWidthCss } from "../preview/previewStyles";
import { EXPORT_ROOT_ATTRIBUTES, type ExportSnapshot } from "./exportSnapshot";
import { applyContentRules, firstHeadingText, imageSourcesOf } from "./exportContent";
import { exportPreviewStylesheet, exportSheet, katexExportCss, styleText, themeKindClass, tokenRule } from "./exportStyles";
import { convertTabSets } from "./exportTabs";

/** What the session supplies to {@link buildHtmlExport}: the data of the files the snapshot refers to. */
export interface HtmlExportInputs {
  /** The file name without its extension: the title of last resort. */
  stem: string;
  /** The content column width in pixels, as the preview setting has it (0 lifts the limit). */
  maxContentWidth: number;
  /** The data URI of a local image, by the `src` the page shows; undefined when it cannot be read. */
  imageData: (src: string) => string | undefined;
  /** The KaTeX sheet and its font data (relative URL to data URI); read only for a page with math. */
  katex?: { css: string; fonts: ReadonlyMap<string, string> };
}

/** The result of {@link buildHtmlExport}. */
export interface HtmlExportResult {
  html: string;
  /** The targets of the links the file does not keep (relative, wiki and blocked), unique, in order. */
  removedLinks: string[];
  /** How many images could not be embedded. */
  missingImages: number;
  hasMath: boolean;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-137
/** True when the page has rendered math: the session then reads the KaTeX sheet and its fonts. */
export function snapshotHasMath(snapshot: ExportSnapshot): boolean {
  return snapshot.contentHtml.includes("data-studio-math-rendered");
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-136
/** The `src` and `srcset` URLs of the images of the snapshot that are not data URIs (the files the session reads), unique. */
export function collectImageSources(snapshot: ExportSnapshot): string[] {
  return imageSourcesOf(parseFragment(snapshot.contentHtml));
}

const isDarkKind = (kind: string | undefined): boolean => kind === "2" || kind === "3";

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-136
/** Builds the self-contained document of a snapshot. */
export function buildHtmlExport(snapshot: ExportSnapshot, inputs: HtmlExportInputs): HtmlExportResult {
  const fragment = parseFragment(snapshot.contentHtml);
  const { maxTabs } = convertTabSets(fragment, snapshot.shownTabs);
  const report = applyContentRules(fragment, inputs.imageData);
  const title = report.frontmatterTitle ?? firstHeadingText(fragment) ?? inputs.stem;
  const body = serialize(fragment);

  const hasMath = snapshotHasMath(snapshot);
  const kind = snapshot.rootAttributes["data-sphinx-preview-theme"];
  const rootAttributes = EXPORT_ROOT_ATTRIBUTES
    .filter((name) => snapshot.rootAttributes[name] !== undefined)
    .map((name) => ` ${name}="${escapeHtml(snapshot.rootAttributes[name]!)}"`)
    .join("");
  const sheets = [
    ["preview", exportPreviewStylesheet(`${PREVIEW_ACCESSIBILITY_CSS}${PREVIEW_THEME_CSS}`)],
    ["width", previewContentWidthCss(inputs.maxContentWidth)],
    ...(hasMath && inputs.katex ? [["math", katexExportCss(inputs.katex.css, inputs.katex.fonts)]] : []),
    ...(hasMath && snapshot.mathStyles !== "" ? [["math-classes", snapshot.mathStyles]] : []),
    ["tokens", tokenRule(snapshot.tokens)],
    ["tabs", exportSheet(maxTabs, isDarkKind(kind) ? "dark" : "light")],
  ] as const;
  const styles = sheets.map(([name, css]) => `<style data-studio-export-${name}>\n${styleText(css)}\n</style>`).join("\n");

  const html = `<!doctype html>
<html lang="en"${rootAttributes}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${styles}
</head>
<body class="${themeKindClass(kind)}">
${body}
</body>
</html>
`;
  return { html, removedLinks: report.removedLinks, missingImages: report.missingImages, hasMath };
}
