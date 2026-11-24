import * as fs from "node:fs";
import * as path from "node:path";

import { parseFragment, serialize } from "parse5";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  tagName?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
}

const CLIPS_ROOT = "docs/demo-video/clips";
const CLIP_GIF = /^docs\/demo-video\/clips\/([^/]+)\/\1\.gif$/u;

function escapeAttribute(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

/** A clip's own Markdown (storyboard, stage documents) is a production file, not a docs page. */
export function isClipSource(repoRelativePath: string): boolean {
  return repoRelativePath.replaceAll("\\", "/").startsWith(`${CLIPS_ROOT}/`) && repoRelativePath.endsWith(".md");
}

function videoFor(img: HtmlNode, sourcePage: string, fileExists: (repoRelativePath: string) => boolean): string | undefined {
  const src = img.attrs?.find((candidate) => candidate.name === "src")?.value;
  if (!src || !src.endsWith(".gif") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(src)) return undefined;
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePage), src));
  const match = CLIP_GIF.exec(target);
  if (!match) return undefined;
  const folder = `${CLIPS_ROOT}/${match[1]}`;
  if (!fileExists(`${folder}/${match[1]}.webm`)) return undefined;
  const alt = img.attrs?.find((candidate) => candidate.name === "alt")?.value ?? "";
  const webm = src.replace(/\.gif$/u, ".webm");
  const poster = fileExists(`${folder}/poster.png`) ? ` poster="${escapeAttribute(`${path.posix.dirname(src)}/poster.png`)}"` : "";
  return `<video src="${escapeAttribute(webm)}"${poster} autoplay loop muted playsinline controls aria-label="${escapeAttribute(alt)}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"></video>`;
}

/**
 * In a page's rendered HTML, an image of a feature clip's GIF with its WebM beside it becomes a looping video
 * that falls back to the GIF.
 * @implements_req SwRS-MDOKFSTUDIO-CORE-095
 */
export function clipVideos(html: string, sourcePage: string, fileExists: (repoRelativePath: string) => boolean): string {
  const fragment = parseFragment(html);
  const visit = (node: HtmlNode): void => {
    const children = node.childNodes ?? [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (child.tagName === "img") {
        const video = videoFor(child, sourcePage, fileExists);
        if (video) children.splice(index, 1, ...((parseFragment(video) as unknown as HtmlNode).childNodes ?? []));
      } else {
        visit(child);
      }
    }
  };
  visit(fragment as unknown as HtmlNode);
  return serialize(fragment);
}

/**
 * Copies the WebM, GIF and poster of each clip under docs/demo-video/clips/ into the site, and nothing else.
 * @implements_req SwRS-MDOKFSTUDIO-CORE-095
 */
export function copyClipMedia(extensionRoot: string, siteRoot: string): void {
  const clipsRoot = path.join(extensionRoot, ...CLIPS_ROOT.split("/"));
  if (!fs.existsSync(clipsRoot)) return;
  for (const entry of fs.readdirSync(clipsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const name of [`${entry.name}.webm`, `${entry.name}.gif`, "poster.png"]) {
      const source = path.join(clipsRoot, entry.name, name);
      if (!fs.existsSync(source)) continue;
      const target = path.join(siteRoot, ...CLIPS_ROOT.split("/"), entry.name, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
}
