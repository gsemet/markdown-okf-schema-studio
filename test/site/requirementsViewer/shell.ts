import { headTags } from "../siteHead";
import { REPOSITORY_URL } from "../siteLinks";
import { escapeHtml, type SocialCard } from "../socialCard";
import { VIEWER_DIR, assetLink, dirLink, siteLink } from "./urls";

/** The four levels of the viewer; each has one social picture shared by its pages. */
export type Level = "areas" | "area" | "use-case" | "behaviour";

export const LEVELS: Readonly<Record<Level, { readonly kind: string; readonly line: string; readonly on: number }>> = {
  areas: { kind: "Requirements", line: "Every feature, from use case to test", on: -1 },
  area: { kind: "Area", line: "Use cases of one product area", on: 0 },
  "use-case": { kind: "Use case", line: "What a user does and gets, split into behaviours", on: 0 },
  behaviour: { kind: "Behaviour", line: "One rule, tested on its own, linked to its code", on: 1 },
};

export interface Crumb {
  readonly text: string;
  /** Folder of the page the crumb links to; absent on the current page. */
  readonly dir?: string;
}

export interface PageSpec {
  /** Folder of the page under the site, for example `requirements/diagrams/StRS-MDOKFSTUDIO-DIAG-001`. */
  readonly dir: string;
  readonly level: Level;
  /** Title of the page: the tab title and the social title. */
  readonly title: string;
  readonly description: string;
  readonly crumbs: readonly Crumb[];
  readonly body: string;
  readonly colour?: string;
}

export interface PageFooter {
  readonly sha: string;
  readonly generatedAt: string;
}

export function levelCard(spec: Pick<PageSpec, "dir" | "level" | "title" | "description">): SocialCard {
  const level = LEVELS[spec.level];
  return {
    title: spec.title,
    description: spec.description,
    page: `${spec.dir}/`,
    image: `${VIEWER_DIR}/og/${spec.level}.png`,
    imageAlt: `${level.kind}: ${level.line}`,
  };
}

/** Without JavaScript, the controls that need it are absent: search, Play and the theme switch. */
export const NOSCRIPT_STYLE = "#search-open,#theme,.play{display:none!important}";
const THEME_SCRIPT = 'document.documentElement.dataset.theme = localStorage.getItem("req-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "cream");';
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
${headTags(`${spec.title} | Studio requirements`, page, levelCard(spec))}
<link rel="stylesheet" href="${assetLink(spec.dir, "viewer.css")}">
<script>${THEME_SCRIPT}</script>
<noscript><style>${NOSCRIPT_STYLE}</style></noscript>
</head>
<body${style}>
<input type="checkbox" id="history" class="hist" aria-label="Show retired requirements">
<script>${HISTORY_SCRIPT}</script>
<header class="top"><div class="in">
  <a class="home" href="${dirLink(spec.dir, VIEWER_DIR)}">Studio requirements</a>
  <nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
  <nav class="site" aria-label="Site"><a href="${siteLink(spec.dir, "index.html")}">Home</a><a href="${siteLink(spec.dir, "contributing.html")}">Contributing</a><a href="${siteLink(spec.dir, "docs/how-we-ship.html")}">How we ship</a><a href="${siteLink(spec.dir, "gallery.html")}">Gallery</a></nav>
  <label class="btn hist-label" for="history" title="Show superseded and deprecated requirements">History</label>
  <button class="btn" id="search-open" type="button" aria-label="Search">Search <kbd>/</kbd></button>
  <button class="btn" id="theme" type="button" aria-label="Switch theme">Theme</button>
</div></header>
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
