import * as fs from "node:fs";
import * as path from "node:path";

import { SITE_URL, escapeHtml, writeCardPictures } from "../socialCard";
import { levelCards } from "./cards";
import { homePage } from "./home";
import { REQUIREMENTS_REPORT_PATH, currentCommit, loadRequirementsModel, type ViewerModel } from "./model";
import { areaPage, behaviourPage, useCasePage } from "./pages";
import { searchIndexScript } from "./searchIndex";
import { viewerDocument, type PageFooter, type PageSpec } from "./shell";
import { VIEWER_DIR } from "./urls";

export { REQUIREMENTS_REPORT_PATH };

/** Writes the viewer under `<siteRoot>/requirements/`: the pages, the search index, the assets and the old URL's redirect. */

const ASSETS = ["viewer.css", "viewer.js"] as const;

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

/** The page that sends the old URL `requirements.html` to the folder of the viewer. */
export function redirectDocument(): string {
  const target = `${VIEWER_DIR}/`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Requirements | Markdown OKF-Schema Studio</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${escapeHtml(SITE_URL + target)}">
</head>
<body>
<p>The requirements moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
}

/**
 * Writes the pages, the search index, the stylesheet, the script and the redirect.
 * A missing or broken report writes the home with a notice and the redirect only; it never throws.
 */
export function writeViewerPages(siteRoot: string, reportPath: string, root: string): ViewerModel | undefined {
  const model = loadRequirementsModel(reportPath, currentCommit(root));
  const footer: PageFooter = { sha: model?.sha ?? currentCommit(root), generatedAt: model?.generatedAt ?? "" };
  const folder = path.join(siteRoot, VIEWER_DIR);
  fs.mkdirSync(folder, { recursive: true });
  for (const asset of ASSETS) fs.copyFileSync(path.join(root, "test", "site", "requirementsViewer", asset), path.join(folder, asset));
  fs.writeFileSync(path.join(folder, "search-index.js"), searchIndexScript(model));
  for (const spec of viewerPages(model, root)) writePage(siteRoot, spec, footer);
  fs.writeFileSync(path.join(siteRoot, "requirements.html"), redirectDocument());
  return model;
}

/** The viewer and its four level pictures `requirements/og/<level>.png`. */
export async function writeRequirementsViewer(siteRoot: string, reportPath: string, root: string): Promise<void> {
  writeViewerPages(siteRoot, reportPath, root);
  await writeCardPictures(path.join(siteRoot, VIEWER_DIR), levelCards());
}
