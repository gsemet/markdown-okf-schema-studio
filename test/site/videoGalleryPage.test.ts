import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { pageDocument, writeVideosAndManifest } from "./buildSite";
import { buildVideoGallery, listVideos, PRESENTATION_VIDEO } from "./videoGalleryPage";

const CLIPS = "docs/demo-video/clips";
const PRESENTATION_FOLDER = path.posix.dirname(PRESENTATION_VIDEO);

function write(root: string, repoPath: string, content = "x"): void {
  const file = path.join(root, ...repoPath.split("/"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A clip folder as the clip kit leaves it: the WebM, the poster and the storyboard with its texts. */
function addClip(root: string, name: string, text: string): void {
  write(root, `${CLIPS}/${name}/${name}.webm`);
  write(root, `${CLIPS}/${name}/poster.png`);
  write(root, `${CLIPS}/${name}/clip.md`, `| Field | Content |\r\n| --- | --- |\r\n| Text 1 *(on screen)* | ${text} |\r\n| Text 2 *(on screen)* | The second text |\r\n\r\n| Field | Content |\r\n| --- | --- |\r\n| Text 1 *(on screen)* | A later row |\r\n`);
}

function withTree(run: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-videos-"));
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** Each card of a page body: its id, the video's start tag and the whole markup. */
function cards(body: string): { id: string; video: string; html: string }[] {
  return [...body.matchAll(/<figure id="([^"]*)">.*?<\/figure>/gsu)].map((match) => ({
    id: match[1],
    video: /<video [^>]*>/u.exec(match[0])?.[0] ?? "",
    html: match[0],
  }));
}

/** What every card holds: a video that shows its poster and loads nothing until the reader plays it. */
function assertClickToPlay(video: string, id: string): void {
  for (const attribute of [/ controls[ >]/u, / preload="none"[ >]/u, / playsinline[ >]/u, / poster="[^"]+poster\.png"/u]) assert.match(video, attribute, id);
  assert.doesNotMatch(video, /autoplay/u, id);
}

test("the presentation video comes first, then each clip with its poster, source and on-screen title", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S1
  withTree((root) => {
    addClip(root, "beta", "Second **bold** clip");
    addClip(root, "alpha", "Type <a> & \"b\" in **/grid**");
    write(root, PRESENTATION_VIDEO);
    write(root, `${PRESENTATION_FOLDER}/poster.png`);
    const videos = listVideos(root);
    assert.deepEqual(videos.map((video) => [video.id, video.title, video.note]), [
      ["short-demo-01", "One-minute demo", "short-demo-01"],
      ["alpha", "Type <a> & \"b\" in /grid", "alpha"],
      ["beta", "Second bold clip", "beta"],
    ]);
    const body = buildVideoGallery(videos);
    assert.ok(body.startsWith("<h1>Videos</h1><p>"));
    assert.ok(body.includes('<section class="gallery video-gallery">'));
    const [demo, alpha, beta] = cards(body);
    assert.deepEqual(cards(body).map((card) => card.id), ["short-demo-01", "alpha", "beta"]);
    for (const card of [demo, alpha, beta]) assertClickToPlay(card.video, card.id);
    assert.ok(demo.video.includes(`poster="${PRESENTATION_FOLDER}/poster.png"`));
    assert.ok(demo.html.includes(`<source src="${PRESENTATION_VIDEO}" type="video/mp4">`));
    assert.doesNotMatch(demo.video, / (?:loop|muted)[ >]/u, "the presentation video neither loops nor is muted");
    assert.ok(alpha.video.includes(`poster="${CLIPS}/alpha/poster.png"`));
    assert.ok(alpha.html.includes(`<source src="${CLIPS}/alpha/alpha.webm" type="video/webm">`));
    assert.ok(alpha.html.includes(`<a href="${CLIPS}/alpha/alpha.webm">`), "the fallback is a link to the file");
    assert.match(alpha.video, / loop muted[ >]/u);
    assert.ok(alpha.html.includes("<figcaption><h2>Type &lt;a&gt; &amp; &quot;b&quot; in /grid</h2><p>alpha</p></figcaption>"), "text is escaped");
    const script = /<\/section><script>(.*)<\/script>$/su.exec(body)?.[1] ?? "";
    assert.ok(script.includes('document.querySelectorAll(".video-gallery video")') && script.includes("video.play()"), "one script, after the cards, starts a video on a click on its picture");
    assert.equal(body.split("<script").length, 2);
    assert.doesNotMatch(body, /autoplay/u);
    assert.ok(pageDocument("videos", "videos.html", body).includes(".video-gallery figure video { aspect-ratio: 16 / 9; object-fit: contain; }"), "a poster is shown whole");
  });
});

test("a new clip folder appears on the next build", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S2
  withTree((root) => {
    addClip(root, "beta", "Beta");
    assert.deepEqual(listVideos(root).map((video) => video.id), ["beta"]);
    addClip(root, "a-new-clip", "A new clip");
    assert.deepEqual(listVideos(root).map((video) => [video.id, video.title]), [["a-new-clip", "A new clip"], ["beta", "Beta"]]);
  });
});

test("a folder without a WebM is skipped, a clip without a Text 1 row is titled with its name, one without a poster has none", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S3
  withTree((root) => {
    write(root, `${CLIPS}/draft/poster.png`);
    write(root, `${CLIPS}/draft/draft.gif`);
    write(root, `${CLIPS}/draft/clip.md`, "| Text 1 *(on screen)* | Not filmed yet |\n");
    write(root, `${CLIPS}/loose.webm`);
    write(root, `${CLIPS}/bare/bare.webm`);
    write(root, `${CLIPS}/untitled/untitled.webm`);
    write(root, `${CLIPS}/untitled/clip.md`, "| Text 2 *(on screen)* | Only the second text |\n");
    const videos = listVideos(root);
    assert.deepEqual(videos.map((video) => [video.id, video.title, video.poster]), [["bare", "bare", undefined], ["untitled", "untitled", undefined]]);
    assert.ok(!buildVideoGallery(videos).includes("poster="), "no poster attribute without a poster file");
  });
});

test("no clips folder and no presentation video give a page with no card", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S4
  withTree((root) => {
    assert.deepEqual(listVideos(root), []);
    const body = buildVideoGallery(listVideos(root));
    assert.ok(body.includes("<h1>Videos</h1>"));
    assert.ok(body.includes('<section class="gallery video-gallery"></section>'));
    assert.ok(!body.includes("<figure") && !body.includes("<video"));
  });
});

test("the build writes the Videos page, copies the presentation video and its poster, and lists the page", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S1
  withTree((root) => {
    addClip(root, "alpha", "Alpha");
    write(root, PRESENTATION_VIDEO, "the video's bytes");
    write(root, `${PRESENTATION_FOLDER}/poster.png`, "the poster's bytes");
    const site = path.join(root, "site");
    fs.mkdirSync(site);
    const pictures = writeVideosAndManifest(root, site, ["index.html"], { name: "gallery", html: "<p>gallery</p>" });
    const page = fs.readFileSync(path.join(site, "videos.html"), "utf8");
    assert.deepEqual(cards(page).map((card) => card.id), ["short-demo-01", "alpha"]);
    assert.ok(page.includes('<meta property="og:image" content="') && page.includes('og/videos.png">'), "the page names its social picture");
    assert.equal(fs.readFileSync(path.join(site, PRESENTATION_VIDEO), "utf8"), "the video's bytes");
    assert.equal(fs.readFileSync(path.join(site, PRESENTATION_FOLDER, "poster.png"), "utf8"), "the poster's bytes");
    const manifest = JSON.parse(fs.readFileSync(path.join(site, "site-manifest.json"), "utf8")) as { pages: string[]; cards: string[] };
    assert.deepEqual(manifest.pages, ["index.html", "videos.html"]);
    assert.ok(manifest.cards.includes("og/videos.png"));
    assert.deepEqual(pictures.map((picture) => picture.name).slice(0, 2), ["gallery", "videos"]);
    assert.deepEqual(pictures.map((picture) => `og/${picture.name}.png`), manifest.cards, "every listed card is drawn");
  });
});

test("the shipped videos: the presentation video, then one click-to-play card per clip with a WebM", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S2
  const root = path.resolve(__dirname, "../../..");
  const shipped = fs.readdirSync(path.join(root, CLIPS)).filter((name) => fs.existsSync(path.join(root, CLIPS, name, `${name}.webm`))).sort();
  assert.ok(shipped.length >= 17, "the shipped clips are found");
  const found = cards(buildVideoGallery(listVideos(root)));
  assert.deepEqual(found.map((card) => card.id), ["short-demo-01", ...shipped]);
  for (const card of found) {
    assertClickToPlay(card.video, card.id);
    const poster = / poster="([^"]+)"/u.exec(card.video)?.[1] ?? "";
    assert.ok(fs.existsSync(path.join(root, poster)), `${card.id}: ${poster} exists`);
    assert.doesNotMatch(card.html, /<h2>[^<]*\*\*/u, `${card.id}: no Markdown emphasis in the title`);
  }
});
