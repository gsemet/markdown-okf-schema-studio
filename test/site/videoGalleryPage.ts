/**
 * The video gallery page of the site (`videos.html`): the presentation video, then one card per
 * feature clip that has a WebM. Nothing is hard-coded: the clips are the folders found when the site
 * is built. `buildSite.ts` owns the document and the gallery styles.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { CLIPS_ROOT } from "./siteClips";
import { escapeHtml } from "./socialCard";

/** Repository path of the presentation video; its poster, `poster.png`, sits beside it. */
export const PRESENTATION_VIDEO = "docs/demo-video/short-demo-01/output/short-demo-01.mp4";

export interface GalleryVideo {
  /** Anchor id of the card: the clip name. */
  id: string;
  title: string;
  /** Second line of the card. */
  note: string;
  /** Path of the video file, from the repository root and from the site root, with forward slashes. */
  source: string;
  /** Path of the poster, when the file exists. */
  poster?: string;
  /** A feature clip is silent and made to loop; the presentation video is neither. */
  clip: boolean;
}

/** The title written on screen at the start of a clip: the first `Text 1` row of its storyboard. */
function onScreenTitle(storyboard: string): string | undefined {
  if (!fs.existsSync(storyboard)) return undefined;
  const row = /^\|\s*Text 1 \*\(on screen\)\*\s*\|(.*?)\|\s*$/mu.exec(fs.readFileSync(storyboard, "utf8"));
  return row?.[1].replaceAll("**", "").trim() || undefined;
}

/**
 * The videos of the gallery: the presentation video when it exists, then each folder of
 * docs/demo-video/clips/ that holds `<clip>.webm`, in name order.
 * @implements_req SwRS-MDOKFSTUDIO-CORE-098
 */
export function listVideos(extensionRoot: string): GalleryVideo[] {
  const exists = (repoPath: string): boolean => fs.existsSync(path.join(extensionRoot, repoPath));
  const entry = (id: string, title: string, source: string, clip: boolean): GalleryVideo => {
    const poster = `${path.posix.dirname(source)}/poster.png`;
    return { id, title, note: id, source, poster: exists(poster) ? poster : undefined, clip };
  };
  const videos: GalleryVideo[] = [];
  if (exists(PRESENTATION_VIDEO)) {
    videos.push(entry(path.posix.basename(PRESENTATION_VIDEO, ".mp4"), "One-minute demo", PRESENTATION_VIDEO, false));
  }
  if (!exists(CLIPS_ROOT)) return videos;
  const clips = fs.readdirSync(path.join(extensionRoot, CLIPS_ROOT), { withFileTypes: true })
    .filter((folder) => folder.isDirectory() && exists(`${CLIPS_ROOT}/${folder.name}/${folder.name}.webm`))
    .map((folder) => folder.name)
    .sort((left, right) => left.localeCompare(right));
  for (const name of clips) {
    const folder = `${CLIPS_ROOT}/${name}`;
    const title = onScreenTitle(path.join(extensionRoot, folder, "clip.md")) ?? name;
    videos.push(entry(name, title, `${folder}/${name}.webm`, true));
  }
  return videos;
}

const siteHref = (repoPath: string): string => escapeHtml(repoPath.split("/").map(encodeURIComponent).join("/"));

/**
 * Starts a video on a click on its picture, which Chromium's controls ignore while a
 * `preload="none"` video has loaded nothing. It acts only on a video that is neither loaded nor
 * started, and leaves the card for good once it plays: every other click is the browser's own.
 * `preventDefault` keeps a browser whose own click toggles playback from undoing the start.
 */
const CLICK_TO_PLAY = `<script>
for (const video of document.querySelectorAll(".video-gallery video")) {
  const start = (event) => {
    if (!video.paused || video.readyState !== HTMLMediaElement.HAVE_NOTHING) return;
    event.preventDefault();
    void video.play();
  };
  video.addEventListener("click", start);
  video.addEventListener("play", () => video.removeEventListener("click", start), { once: true });
}
</script>`;

/** One card: the poster until the reader's click, then the browser's own video controls. */
function videoCard(video: GalleryVideo): string {
  const source = siteHref(video.source);
  const title = escapeHtml(video.title);
  const loop = video.clip ? " loop muted" : "";
  const poster = video.poster ? ` poster="${siteHref(video.poster)}"` : "";
  const type = video.source.endsWith(".webm") ? "video/webm" : "video/mp4";
  return `<figure id="${escapeHtml(video.id)}"><video controls preload="none" playsinline${loop}${poster} aria-label="${title}"><source src="${source}" type="${type}"><a href="${source}">Open the video file: ${title}</a></video><figcaption><h2>${title}</h2><p>${escapeHtml(video.note)}</p></figcaption></figure>`;
}

/**
 * The body of `videos.html`: one card per video, in the order given, with no autoplay, and the
 * script that starts a video on a click on its picture.
 * @implements_req SwRS-MDOKFSTUDIO-CORE-098
 */
export function buildVideoGallery(videos: readonly GalleryVideo[]): string {
  return `<h1>Videos</h1><p>Feature clips and the one-minute demo. Click a picture to watch it.</p><section class="gallery video-gallery">${videos.map(videoCard).join("\n")}</section>${CLICK_TO_PLAY}`;
}
