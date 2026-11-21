import { headTags } from "../siteHead";
import { siteHeader } from "../siteHeader";
import { REPOSITORY_URL } from "../siteLinks";
import { escapeHtml, type SocialCard } from "../socialCard";
import type { Area } from "./model";
import { VIEWER_DIR, assetLink, dirLink } from "./urls";

/** The four levels of the viewer's pages. */
export type Level = "areas" | "area" | "use-case" | "behaviour";

export interface Crumb {
  readonly text: string;
  /** Folder of the page the crumb links to; absent on the current page. */
  readonly dir?: string;
}

export interface PageSpec {
  /** Folder of the page under the site, for example `requirements/diagrams/StRS-MDOKFSTUDIO-DIAG-001`. */
  readonly dir: string;
  readonly level: Level;
  /** Title of the page: the tab title only. */
  readonly title: string;
  /** Title of the social card: og:title and twitter:title. */
  readonly shareTitle: string;
  /** Description of the page and of its social card. */
  readonly description: string;
  /** The area (feature category) of the page; absent on the index. */
  readonly area?: Area;
  readonly crumbs: readonly Crumb[];
  readonly body: string;
  readonly colour?: string;
}

export interface PageFooter {
  readonly sha: string;
  readonly generatedAt: string;
}

/** The social card of a page: its own share title and text, the picture of its area (the index's own picture on the index). */
// @implements_req SwRS-MDOKFSTUDIO-CORE-085
export function shareCard(spec: Pick<PageSpec, "dir" | "shareTitle" | "description" | "area">): SocialCard {
  const base = { title: spec.shareTitle, description: spec.description, page: `${spec.dir}/` };
  return spec.area
    ? { ...base, image: `${VIEWER_DIR}/og/area-${spec.area.id}.png`, imageAlt: `Feature category: ${spec.area.title}` }
    : { ...base, image: `${VIEWER_DIR}/og/areas-card.png`, imageAlt: "Requirements: Every feature, from use case to test" };
}

/** Without JavaScript, the controls that need it are absent: search and Play. */
export const NOSCRIPT_STYLE = "#search-open,.play{display:none!important}";
const HISTORY_SCRIPT = 'document.getElementById("history").checked = localStorage.getItem("req-history") === "1";';

function footerText(footer: PageFooter): string {
  const commit = footer.sha === "main"
    ? `<a href="${REPOSITORY_URL}/tree/main">main</a>`
    : `<a href="${REPOSITORY_URL}/tree/${escapeHtml(footer.sha)}">${escapeHtml(footer.sha.slice(0, 8))}</a>`;
  return footer.generatedAt ? `okfreq report generated ${escapeHtml(footer.generatedAt)} at commit ${commit}` : `Built at commit ${commit}`;
}

/** A page of the viewer: head with the social card, top bar, main, footer, search sheet and scripts. */
export function viewerDocument(spec: PageSpec, footer: PageFooter): string {
  const crumbs = spec.crumbs.map((crumb, index) =>
    (index > 0 ? '<span class="sep">/</span>' : "")
    + (crumb.dir === undefined ? `<span aria-current="page">${escapeHtml(crumb.text)}</span>` : `<a href="${dirLink(spec.dir, crumb.dir)}">${escapeHtml(crumb.text)}</a>`)).join("");
  const page = `${spec.dir}/index.html`;
  const style = spec.colour ? ` style="--c:${escapeHtml(spec.colour)}"` : "";
  return `<!doctype html>
<html lang="en">
<head>
${headTags(`${spec.title} | Studio requirements`, page, shareCard(spec))}
<link rel="stylesheet" href="${assetLink(spec.dir, "viewer.css")}">
<noscript><style>${NOSCRIPT_STYLE}</style></noscript>
</head>
<body${style}>
${siteHeader(page, {
  lead: `<input type="checkbox" id="history" class="hist" aria-label="Show retired requirements"><script>${HISTORY_SCRIPT}</script>`,
  middle: `<nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>`,
  trail: '<label class="btn hist-label" for="history" title="Show superseded and deprecated requirements">History</label><button class="btn" id="search-open" type="button" aria-label="Search">Search <kbd>/</kbd></button>',
})}
<main>
${spec.body}
</main>
<footer><div class="in">${footerText(footer)}</div></footer>
<div class="search" id="search" hidden role="dialog" aria-label="Search the requirements"><div class="box"><div class="bar"><input id="q" type="search" placeholder="Search use cases, behaviours, files" autocomplete="off" aria-label="Search"><button class="btn" id="search-close" type="button">Close</button></div><div id="results" class="results"></div></div></div>
<script src="${assetLink(spec.dir, "search-index.js")}"></script>
<script src="${assetLink(spec.dir, "viewer.js")}"></script>
</body>
</html>
`;
}
