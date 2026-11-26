import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { parseFragment, serialize } from "parse5";

import { renderMyst } from "../../src/core/render/mystRenderer";
import { E2E_SCREENSHOT_ROOT, EXTENSION_ROOT, REPORTS_ROOT } from "../reportPaths";
import { buildGallery, listCaptures } from "./galleryPage";
import { clipVideos, copyClipMedia, isClipSource } from "./siteClips";
import { outputPathForMarkdown, rewriteLinkTarget } from "./siteLinks";
import { headTags } from "./siteHead";
import { REQUIREMENTS_REPORT_PATH, writeRequirementsViewer } from "./requirementsViewer/write";
import { siteHeader } from "./siteHeader";
import { SITE_CSS } from "./siteTheme";
import { cardDocument, escapeHtml, simpleCard, writeCardPictures, type SocialCard } from "./socialCard";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  tagName?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
}

const siteRoot = path.join(EXTENSION_ROOT, "out", "site");
const renderedPages = new Set<string>(["README.md", "CONTRIBUTING.md"]);

function attribute(node: HtmlNode, name: string): HtmlAttribute | undefined {
  return node.attrs?.find((candidate) => candidate.name === name);
}

function rewriteRenderedLinks(html: string, sourcePage: string, outputPage: string): string {
  const fragment = parseFragment(html);
  const visit = (node: HtmlNode): void => {
    for (const attributeName of ["href", "src", "poster"]) {
      const current = attribute(node, attributeName);
      if (current) current.value = rewriteLinkTarget(current.value, sourcePage, outputPage, renderedPages);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(fragment as unknown as HtmlNode);
  return serialize(fragment);
}

function walkMarkdown(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

export function pageDocument(title: string, currentPage: string, body: string, card?: SocialCard): string {
  return `<!doctype html>
<html lang="en">
<head>
${headTags(`${title} | Markdown OKF-Schema Studio`, currentPage, card)}
<style>
${SITE_CSS}
main { max-width: 920px; margin: 0 auto; padding: 3rem 1.25rem 5rem; }
main p, main li, main blockquote { font-family: var(--serif); }
main h1, main h2, main h3 { font-family: var(--serif); font-weight: 400; line-height: 1.2; color: var(--ink); }
main h1 { font-size: clamp(28px, 4vw, 40px); margin: 6px 0 12px; }
main h2 { font-size: 1.6rem; margin-top: 2.5rem; }
main h3 { font-size: 1.25rem; }
img { max-width: 100%; height: auto; }
video { max-width: 100%; height: auto; }
.report-link { display: inline-block; margin: 1rem 0 2rem; padding: .55rem .85rem; border: 1px solid var(--link); border-radius: 6px; text-decoration: none; }
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
.gallery figure { margin: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); }
.gallery figure img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: contain; border-bottom: 1px solid var(--line); }
.gallery figure video { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-bottom: 1px solid var(--line); background: var(--ink); }
.gallery figcaption { padding: 1rem; }
.gallery h2 { margin: 0 0 .35rem; font-size: 1.05rem; }
.gallery p { margin: 0; font-family: var(--sans); color: var(--soft); font-size: .94rem; }
.gallery h2 { overflow-wrap: anywhere; }
a.capture-open { display: block; width: 100%; padding: 0; border: 0; background: var(--code-bg); text-decoration: none; cursor: zoom-in; }
a.capture-open:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }
[data-capture-missing][hidden] { display: none; }
.capture-viewer { width: 96vw; height: 94vh; max-width: none; max-height: 96vh; padding: 1rem; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--ink); font-family: var(--sans); }
.capture-viewer :is(h2, h3, p, li) { font-family: var(--sans); }
.capture-viewer[open] { display: flex; flex-direction: column; }
.capture-viewer::backdrop { background: color-mix(in srgb, var(--ink) 80%, transparent); }
.capture-viewer header { display: flex; align-items: center; gap: .75rem; padding-bottom: .75rem; flex-wrap: wrap; }
.capture-viewer h2 { margin: 0; flex: 1 1 18rem; font-size: 1.1rem; overflow-wrap: anywhere; }
.capture-nav { display: flex; align-items: center; gap: .35rem; }
.capture-nav button { min-height: 2.25rem; padding: .35rem .65rem; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); color: var(--ink); cursor: pointer; }
.capture-nav button:hover:not(:disabled), .capture-nav button:focus-visible { border-color: var(--link); color: var(--link); }
.capture-nav button:disabled { cursor: not-allowed; opacity: .45; }
.capture-position { min-width: 4.5rem; color: var(--soft); font-size: .86rem; text-align: center; font-variant-numeric: tabular-nums; }
.capture-close { width: 2.5rem; height: 2.5rem; font-size: 1.5rem; cursor: pointer; }
.capture-detail { display: grid; grid-template-columns: minmax(320px, 36%) minmax(0, 1fr); gap: 1rem; flex: 1; min-height: 0; }
.capture-meta { min-width: 0; overflow: auto; padding: .2rem .45rem .5rem; }
.capture-summary { margin: 0 0 1rem; font-size: 1.05rem; line-height: 1.5; }
.capture-status { display: inline-flex; margin: 0 0 1rem; padding: .25rem .55rem; border: 1px solid var(--line); border-radius: 999px; color: var(--soft); font-size: .82rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; }
.capture-status[data-status="passed"] { border-color: var(--nom); background: color-mix(in srgb, var(--nom) 12%, var(--paper)); color: var(--nom); }
.capture-status[data-status="failed"] { border-color: var(--ref); background: color-mix(in srgb, var(--ref) 12%, var(--paper)); color: var(--ref); }
.capture-facts { display: grid; grid-template-columns: minmax(5.5rem, auto) minmax(0, 1fr); gap: .4rem .75rem; margin: 0 0 1.1rem; font-size: .9rem; }
.capture-facts dt { color: var(--soft); font-weight: 700; }
.capture-facts dd { margin: 0; overflow-wrap: anywhere; }
.capture-section { margin: 1rem 0 0; padding-top: .85rem; border-top: 1px solid var(--line); }
.capture-section h3 { margin: 0 0 .55rem; font-size: .9rem; letter-spacing: .02em; }
.capture-actions { display: flex; flex-wrap: wrap; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.capture-actions li { padding: .2rem .45rem; border: 1px solid var(--line); border-radius: 4px; background: var(--code-bg); color: var(--soft); font-size: .78rem; overflow-wrap: anywhere; }
.capture-checks { margin: 0; padding-left: 1.15rem; font-size: .86rem; }
.capture-check[data-pass="true"] { color: var(--nom); }
.capture-check[data-pass="false"] { color: var(--ref); }
.capture-technical { margin-top: 1rem; padding-top: .85rem; border-top: 1px solid var(--line); }
.capture-technical summary { color: var(--link); cursor: pointer; font-size: .86rem; font-weight: 700; }
.capture-technical pre { max-height: 14rem; margin: .7rem 0 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .78rem; }
.capture-image { display: flex; align-items: flex-start; justify-content: center; overflow: auto; min-width: 0; padding: .25rem; background: var(--code-bg); }
.capture-image img { display: block; margin: 0 auto; }
@media (max-width: 700px) { .capture-viewer header { align-items: flex-start; } .capture-nav { flex: 1 0 100%; justify-content: space-between; order: 3; } .capture-detail { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(220px, 42%) minmax(0, 1fr); } }
.status { padding: 1rem; border: 1px dashed var(--line); color: var(--soft); }
footer { max-width: 920px; margin: 0 auto; padding: 0 1.25rem 3rem; color: var(--soft); font-size: .85rem; }
</style>
</head>
<body>
${siteHeader(currentPage)}
<main>${body}</main>
<footer>Generated from the repository README and current local reports.</footer>
</body>
</html>
`;
}

async function renderMarkdown(sourcePath: string, outputPath: string): Promise<void> {
  const source = fs.readFileSync(sourcePath, "utf8");
  const result = await renderMyst(source);
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) {
    throw new Error(`MyST rendering failed for ${sourcePath}: ${errors.map((error) => error.message).join("; ")}`);
  }
  const relativeSource = path.relative(EXTENSION_ROOT, sourcePath).split(path.sep).join("/");
  const relativeOutput = path.relative(siteRoot, outputPath).split(path.sep).join("/");
  const withClips = clipVideos(result.html, relativeSource, (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  const body = rewriteRenderedLinks(withClips, relativeSource, relativeOutput);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pageDocument(path.basename(outputPath, ".html"), relativeOutput, body, simpleCardFor(relativeSource)?.card));
}

interface SimpleCardEntry {
  card: SocialCard;
  eyebrow: string;
  headline: string;
  line: string;
}

function simpleEntry(page: string, name: string, eyebrow: string, headline: string, line: string, title: string, description: string): SimpleCardEntry {
  return { card: { title, description, page, image: `og/${name}.png`, imageAlt: `${eyebrow}: ${headline}` }, eyebrow, headline, line };
}

/** The pages written from Markdown that carry a simple social card, keyed by Markdown source path. */
export const SIMPLE_CARDS: Record<string, SimpleCardEntry> = {
  "README.md": simpleEntry("index.html", "home", "VS Code extension", "Markdown OKF-Schema Studio", "Read the rendered page, click a block to edit its source",
    "Markdown OKF-Schema Studio", "A visual Markdown editor for VS Code: read a clean rendered page and click any block to edit its source. CommonMark, GitHub Flavored Markdown, MyST, OKF and OKF-Schema."),
  "CONTRIBUTING.md": simpleEntry("contributing.html", "contributing", "Contributing", "Build, test and change Studio", "Setup, checks and the rules every change follows",
    "Contributing: Markdown OKF-Schema Studio", "How to set up, build, test and change Markdown OKF-Schema Studio."),
  "docs/how-we-ship.md": simpleEntry("docs/how-we-ship.html", "how-we-ship", "How we ship", "One owner, a team of AI agents", "The workflow, followed through one real release",
    "How we ship: Markdown OKF-Schema Studio", "How one owner and a team of AI agents in Claude Code ship Markdown OKF-Schema Studio, followed through one real release."),
  "docs/how-we-test.md": simpleEntry("docs/how-we-test.html", "how-we-test", "How we test", "From a use case to its proof", "Every test level and the requirement it proves",
    "How we test: Markdown OKF-Schema Studio", "How Markdown OKF-Schema Studio is tested, from unit tests to acceptance tests in a real VS Code window, and how each test is tied to a requirement."),
};

function simpleCardFor(relativeSource: string): SimpleCardEntry | undefined {
  return Object.hasOwn(SIMPLE_CARDS, relativeSource) ? SIMPLE_CARDS[relativeSource] : undefined;
}

/** Body of the gallery card: the live count and a mosaic of curated captures (image URLs). */
export function galleryCard(captureCount: number, mosaic: string[]): string {
  const text = `<div class="text"><p class="eyebrow">Screenshot gallery</p><h1 class="headline">${captureCount} screenshots</h1><p class="line">End-to-end captures, each with the test that took it</p></div>`;
  if (mosaic.length === 0) return text;
  const kind = mosaic.length >= 3 ? "" : mosaic.length === 2 ? " pair" : " single";
  const tiles = mosaic.slice(0, 3).map((image) => `<img src="${escapeHtml(image)}" alt="">`).join("");
  return `${text}<div class="mosaic${kind}">${tiles}</div>`;
}

function curatedMosaic(): string[] {
  const file = path.join(EXTENSION_ROOT, "images", "gallery.json");
  if (!fs.existsSync(file)) return [];
  const curated = JSON.parse(fs.readFileSync(file, "utf8")) as { captures?: { image: string }[] };
  return (curated.captures ?? []).slice(0, 3).map((capture) => pathToFileURL(path.join(EXTENSION_ROOT, capture.image)).toString());
}

/** The Markdown files the site renders: the README, Contributing and the docs pages, never a clip's own production files. */
export function renderedMarkdownFiles(): string[] {
  const docs = walkMarkdown(path.join(EXTENSION_ROOT, "docs")).filter((file) => !isClipSource(path.relative(EXTENSION_ROOT, file).split(path.sep).join("/")));
  return [path.join(EXTENSION_ROOT, "README.md"), path.join(EXTENSION_ROOT, "CONTRIBUTING.md"), ...docs];
}

async function main(): Promise<void> {
  fs.rmSync(siteRoot, { recursive: true, force: true });
  fs.mkdirSync(siteRoot, { recursive: true });
  const markdownFiles = renderedMarkdownFiles();
  for (const sourcePath of markdownFiles) {
    const relativeSource = path.relative(EXTENSION_ROOT, sourcePath).split(path.sep).join("/");
    renderedPages.add(relativeSource);
  }
  for (const sourcePath of markdownFiles) {
    const relativeSource = path.relative(EXTENSION_ROOT, sourcePath);
    await renderMarkdown(sourcePath, path.join(siteRoot, outputPathForMarkdown(relativeSource.split(path.sep).join("/"))));
  }
  const imageRoot = path.join(EXTENSION_ROOT, "images");
  if (fs.existsSync(imageRoot)) {
    fs.cpSync(imageRoot, path.join(siteRoot, "images"), { recursive: true, errorOnExist: false, force: true });
  }
  copyClipMedia(EXTENSION_ROOT, siteRoot);
  fs.copyFileSync(path.join(EXTENSION_ROOT, "images", "logo.svg"), path.join(siteRoot, "favicon.svg"));
  if (fs.existsSync(REPORTS_ROOT)) {
    fs.cpSync(REPORTS_ROOT, path.join(siteRoot, "reports"), { recursive: true, errorOnExist: false, force: true });
  }
  fs.mkdirSync(path.join(siteRoot, "reports"), { recursive: true });
  await writeRequirementsViewer(siteRoot, REQUIREMENTS_REPORT_PATH(EXTENSION_ROOT), EXTENSION_ROOT);
  const captureCount = listCaptures().length;
  const mosaic = curatedMosaic();
  const galleryPageCard: SocialCard = {
    title: "Screenshot gallery: Markdown OKF-Schema Studio",
    description: `${captureCount} end-to-end screenshots of Markdown OKF-Schema Studio, a VS Code extension that previews and edits Markdown and MyST, each with the test that took it.`,
    page: "gallery.html",
    image: "og/gallery.png",
    imageAlt: `Markdown OKF-Schema Studio screenshot gallery: ${captureCount} screenshots, with ${mosaic.length} of them shown`,
  };
  fs.writeFileSync(path.join(siteRoot, "gallery.html"), pageDocument("gallery", "gallery.html", buildGallery(), galleryPageCard));
  fs.writeFileSync(path.join(siteRoot, "reports", "index.html"), pageDocument("reports", "reports/index.html", "<h1>Reports</h1><p><a class=\"report-link\" href=\"e2e/REVIEW.md\">Open the E2E review index</a></p>"));
  const pictures = [
    { name: "gallery", html: cardDocument(galleryCard(captureCount, mosaic)) },
    ...Object.values(SIMPLE_CARDS).map((entry) => ({ name: path.posix.basename(entry.card.image, ".png"), html: cardDocument(simpleCard(entry.eyebrow, entry.headline, entry.line)) })),
  ];
  await writeCardPictures(siteRoot, pictures);
  fs.writeFileSync(path.join(siteRoot, "site-manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    pages: markdownFiles.map((sourcePath) => outputPathForMarkdown(path.relative(EXTENSION_ROOT, sourcePath).split(path.sep).join("/"))),
    gallery: fs.existsSync(E2E_SCREENSHOT_ROOT),
    reports: fs.existsSync(REPORTS_ROOT),
    cards: ["og/gallery.png", ...Object.values(SIMPLE_CARDS).map((entry) => entry.card.image)],
  }, null, 2) + "\n");
  console.log(`Built static site at ${siteRoot}`);
}

if (require.main === module) void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
