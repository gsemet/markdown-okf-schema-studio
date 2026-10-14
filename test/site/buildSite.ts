import * as fs from "node:fs";
import * as path from "node:path";

import { parseFragment, serialize } from "parse5";

import { renderMyst } from "../../src/render/mystRenderer";
import { E2E_SCREENSHOT_ROOT, EXTENSION_ROOT, REPORTS_ROOT } from "../reportPaths";
import {
  outputPathForMarkdown,
  relativeSitePath,
  rewriteLinkTarget,
} from "./siteLinks";

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

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

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

function pageDocument(title: string, currentPage: string, body: string): string {
  const rootLink = relativeSitePath(currentPage, "index.html");
  const contributingLink = relativeSitePath(currentPage, "contributing.html");
  const galleryLink = relativeSitePath(currentPage, "gallery.html");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="${relativeSitePath(currentPage, "favicon.svg")}" type="image/svg+xml">
<title>${escapeHtml(title)} | Markdown OKF-Schema Studio</title>
<style>
:root { color-scheme: light; --ink: #16242c; --muted: #53636c; --line: #d7e0e3; --paper: #f7faf9; --panel: #ffffff; --accent: #0e6974; --accent-strong: #084b55; --warm: #e8b05d; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.65 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
header { border-bottom: 1px solid var(--line); background: var(--panel); }
nav { display: flex; flex-wrap: wrap; gap: 1.2rem; max-width: 1120px; margin: 0 auto; padding: 1rem 1.25rem; align-items: center; }
nav strong { margin-right: auto; letter-spacing: .02em; }
a { color: var(--accent-strong); }
nav a { text-decoration: none; font-size: .94rem; }
main { max-width: 920px; margin: 0 auto; padding: 3rem 1.25rem 5rem; }
h1, h2, h3 { line-height: 1.2; color: var(--accent-strong); }
h1 { font-size: clamp(2rem, 5vw, 3.4rem); letter-spacing: -.025em; }
h2 { margin-top: 2.5rem; }
pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
pre { overflow-x: auto; padding: 1rem; border: 1px solid var(--line); border-radius: 8px; background: #eef3f2; }
code { padding: .12rem .28rem; border-radius: 4px; background: #e8efed; }
pre code { padding: 0; background: transparent; }
blockquote { margin-left: 0; padding: .6rem 1rem; border-left: 4px solid var(--warm); background: #fff9ef; }
img { max-width: 100%; height: auto; }
.report-link { display: inline-block; margin: 1rem 0 2rem; padding: .55rem .85rem; border: 1px solid var(--accent); border-radius: 6px; text-decoration: none; }
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
.gallery figure { margin: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
.gallery figure img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: contain; border-bottom: 1px solid var(--line); }
.gallery figure video { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-bottom: 1px solid var(--line); background: #10191d; }
.gallery figcaption { padding: 1rem; }
.gallery h2 { margin: 0 0 .35rem; font-size: 1.05rem; }
.gallery p { margin: 0; color: var(--muted); font-size: .94rem; }
.gallery h2 { overflow-wrap: anywhere; }
.capture-open { display: block; width: 100%; padding: 0; border: 0; background: #eef3f2; cursor: zoom-in; }
.capture-open:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
.capture-viewer { width: 96vw; height: 94vh; max-width: none; max-height: 96vh; padding: 1rem; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: var(--ink); }
.capture-viewer::backdrop { background: #16242ccc; }
.capture-viewer header { display: flex; align-items: center; gap: 1rem; padding-bottom: .75rem; }
.capture-viewer h2 { margin: 0; flex: 1; font-size: 1.1rem; overflow-wrap: anywhere; }
.capture-close { width: 2.5rem; height: 2.5rem; font-size: 1.5rem; cursor: pointer; }
.capture-detail { display: grid; grid-template-columns: minmax(280px, 35%) minmax(0, 1fr); gap: 1rem; height: calc(100% - 3.5rem); }
.capture-detail pre { margin: 0; min-width: 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .85rem; }
.capture-image { overflow: auto; min-width: 0; }
.capture-image img { display: block; margin: 0 auto; }
@media (max-width: 700px) { .capture-detail { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(180px, 40%) minmax(0, 1fr); } }
.status { padding: 1rem; border: 1px dashed var(--line); color: var(--muted); }
footer { max-width: 920px; margin: 0 auto; padding: 0 1.25rem 3rem; color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<header><nav><strong>Markdown OKF-Schema Studio</strong><a href="${rootLink}">Home</a><a href="${contributingLink}">Contributing</a><a href="${galleryLink}">Gallery</a></nav></header>
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
  const body = rewriteRenderedLinks(result.html, relativeSource, relativeOutput);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pageDocument(path.basename(outputPath, ".html"), relativeOutput, body));
}

export function buildGallery(screenshotRoot = E2E_SCREENSHOT_ROOT): string {
  const captures: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && /\.(png|jpe?g|webp)$/iu.test(entry.name)) captures.push(filename);
    }
  };
  if (fs.existsSync(screenshotRoot)) visit(screenshotRoot);
  const cards = captures.map((filename) => {
    const relative = path.relative(screenshotRoot, filename).split(path.sep).join("/");
    const stem = filename.replace(/\.[^.]+$/u, "");
    const notePath = [".json", ".md", ".txt"].map((extension) => stem + extension).find((candidate) => fs.existsSync(candidate));
    const raw = notePath ? fs.readFileSync(notePath, "utf8") : "No sidecar metadata was recorded for this capture.";
    const metadata = notePath?.endsWith(".json") ? JSON.parse(raw) as { summary?: string } : undefined;
    const summary = metadata?.summary ?? (notePath ? "Legacy capture: see the full sidecar for expected content and checks." : raw);
    const asset = "reports/e2e/screenshots/" + relative.split("/").map(encodeURIComponent).join("/");
    return `<figure><button type="button" class="capture-open" aria-label="Inspect ${escapeHtml(relative)}"><img loading="lazy" src="${escapeHtml(asset)}" alt="${escapeHtml(relative)}"></button><figcaption><h2>${escapeHtml(relative)}</h2><p>${escapeHtml(summary)}</p></figcaption><template class="capture-sidecar">${escapeHtml(raw)}</template></figure>`;
  }).join("\n");
  return `<h1>Screenshot gallery</h1><p>${captures.length} E2E screenshots. Run status and provenance are recorded in the sidecars and E2E review.</p><section class="gallery">${cards}</section>
<dialog class="capture-viewer" aria-labelledby="capture-title"><header><h2 id="capture-title"></h2><button type="button" class="capture-close" aria-label="Close screenshot" title="Close screenshot">&#215;</button></header><div class="capture-detail"><pre tabindex="0" aria-label="Complete screenshot sidecar"></pre><div class="capture-image"><img alt=""></div></div></dialog>
<script>
const viewer = document.querySelector('.capture-viewer');
document.querySelectorAll('.capture-open').forEach(button => button.addEventListener('click', () => {
  const figure = button.closest('figure');
  const image = button.querySelector('img');
  viewer.querySelector('h2').textContent = image.alt;
  viewer.querySelector('pre').textContent = figure.querySelector('template').content.textContent;
  viewer.querySelector('img').src = image.src;
  viewer.querySelector('img').alt = image.alt;
  viewer.showModal();
}));
viewer.querySelector('.capture-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
</script>`;
}

async function main(): Promise<void> {
  fs.rmSync(siteRoot, { recursive: true, force: true });
  fs.mkdirSync(siteRoot, { recursive: true });
  const markdownFiles = [path.join(EXTENSION_ROOT, "README.md"), path.join(EXTENSION_ROOT, "CONTRIBUTING.md"), ...walkMarkdown(path.join(EXTENSION_ROOT, "docs"))];
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
  fs.copyFileSync(path.join(EXTENSION_ROOT, "sphinx", "_static", "favicon.svg"), path.join(siteRoot, "favicon.svg"));
  if (fs.existsSync(REPORTS_ROOT)) {
    fs.cpSync(REPORTS_ROOT, path.join(siteRoot, "reports"), { recursive: true, errorOnExist: false, force: true });
  }
  fs.mkdirSync(path.join(siteRoot, "reports"), { recursive: true });
  fs.writeFileSync(path.join(siteRoot, "gallery.html"), pageDocument("gallery", "gallery.html", buildGallery()));
  fs.writeFileSync(path.join(siteRoot, "reports", "index.html"), pageDocument("reports", "reports/index.html", "<h1>Reports</h1><p><a class=\"report-link\" href=\"e2e/REVIEW.md\">Open the E2E review index</a></p>"));
  fs.writeFileSync(path.join(siteRoot, "site-manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    pages: markdownFiles.map((sourcePath) => outputPathForMarkdown(path.relative(EXTENSION_ROOT, sourcePath).split(path.sep).join("/"))),
    gallery: fs.existsSync(E2E_SCREENSHOT_ROOT),
    reports: fs.existsSync(REPORTS_ROOT),
  }, null, 2) + "\n");
  console.log(`Built static site at ${siteRoot}`);
}

if (require.main === module) void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
