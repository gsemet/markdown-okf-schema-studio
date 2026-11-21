import * as fs from "node:fs";
import * as path from "node:path";

import { SITE_CSS } from "../siteTheme";
import { SITE_URL, escapeHtml, socialMetaTags, writeCardPictures, type SocialCard } from "../socialCard";
import { viewerCards } from "./cards";
import { homePage } from "./home";
import { REQUIREMENTS_REPORT_PATH, currentCommit, loadRequirementsModel, type ViewerModel } from "./model";
import { renderUseCaseDiagrams, type UseCaseDiagram } from "./useCaseDiagram";
import { areaPage, behaviourPage, useCasePage } from "./pages";
import { searchIndexScript } from "./searchIndex";
import { shareCard, viewerDocument, type PageFooter, type PageSpec } from "./shell";
import { VIEWER_DIR } from "./urls";

export { REQUIREMENTS_REPORT_PATH };

/** Writes the viewer under `<siteRoot>/requirements/`: the pages, the search index, the assets and the old URL's redirect. */

function writePage(siteRoot: string, spec: PageSpec, footer: PageFooter): void {
  const file = path.join(siteRoot, spec.dir, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, viewerDocument(spec, footer));
}

/** Every page of the viewer for a model: the home, then one page per active area, use case and behaviour. */
export function viewerPages(model: ViewerModel | undefined, root: string): PageSpec[] {
  const pages = [homePage(model, root)];
  if (!model) return pages;
  for (const area of model.areas) pages.push(areaPage(model, area));
  for (const requirement of model.active) {
    pages.push(requirement.tier === "StRS" ? useCasePage(model, requirement) : behaviourPage(model, requirement));
  }
  return pages;
}

/** The page that sends the old URL `requirements.html` to the folder of the viewer; it carries the tags of the index, since a crawler does not follow the redirect. */
// @implements_req SwRS-MDOKFSTUDIO-CORE-085
export function redirectDocument(card: SocialCard): string {
  const target = `${VIEWER_DIR}/`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Requirements | Markdown OKF-Schema Studio</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${escapeHtml(SITE_URL + target)}">
${socialMetaTags(card)}
</head>
<body>
<p>The requirements moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
}

/**
 * Writes the pages, the search index, the stylesheet (the shared site stylesheet then viewer.css), the script and the redirect.
 * A missing or broken report writes the home with a notice and the redirect only; it never throws.
 */
export function writeViewerPages(
  siteRoot: string,
  reportPath: string,
  root: string,
  diagrams: ReadonlyMap<string, UseCaseDiagram> = new Map(),
): ViewerModel | undefined {
  const model = loadRequirementsModel(reportPath, currentCommit(root));
  if (model) for (const [id, svg] of diagrams) model.diagrams.set(id, svg);
  const footer: PageFooter = { sha: model?.sha ?? currentCommit(root), generatedAt: model?.generatedAt ?? "" };
  const folder = path.join(siteRoot, VIEWER_DIR);
  fs.mkdirSync(folder, { recursive: true });
  const source = path.join(root, "test", "site", "requirementsViewer");
  // The one stylesheet source: the shared site stylesheet first, then the viewer's own rules.
  fs.writeFileSync(path.join(folder, "viewer.css"), `${SITE_CSS}\n${fs.readFileSync(path.join(source, "viewer.css"), "utf8")}`);
  fs.copyFileSync(path.join(source, "viewer.js"), path.join(folder, "viewer.js"));
  fs.writeFileSync(path.join(folder, "search-index.js"), searchIndexScript(model));
  const pages = viewerPages(model, root);
  for (const spec of pages) writePage(siteRoot, spec, footer);
  fs.writeFileSync(path.join(siteRoot, "requirements.html"), redirectDocument(shareCard(pages[0] as PageSpec)));
  return model;
}

/** The viewer, the index picture and one picture per category in `requirements/og/`; the use case diagrams are drawn first, once. */
export async function writeRequirementsViewer(siteRoot: string, reportPath: string, root: string): Promise<void> {
  const sources = new Map<string, string>();
  const files = new Map<string, string>();
  for (const requirement of loadRequirementsModel(reportPath)?.active ?? []) {
    if (requirement.diagram === undefined) continue;
    sources.set(requirement.id, requirement.diagram);
    files.set(requirement.id, requirement.file);
  }
  const diagrams = await renderUseCaseDiagrams(sources, undefined, files);
  const model = writeViewerPages(siteRoot, reportPath, root, diagrams);
  await writeCardPictures(path.join(siteRoot, VIEWER_DIR), viewerCards(model));
}
