import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { RUN_FOLDER_PREFIX, SUITES } from "../shared/captureRegistry";
import { assignCaptureIds, buildGallery, captureHref, captureId, listCaptures } from "./galleryPage";

/** A temporary screenshot root holding the given captures (posix paths), removed after `use`. */
function withCaptures(relatives: readonly string[], use: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-gallery-"));
  try {
    for (const relative of relatives) {
      const filename = path.join(root, ...relative.split("/"));
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, "fixture");
    }
    use(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** The values of one attribute on the openers of the page, in gallery order. */
function openerAttribute(html: string, name: "href" | "data-capture-id"): string[] {
  return [...html.matchAll(/<a class="capture-open"[^>]*>/gu)].map(([tag]) => new RegExp(` ${name}="([^"]*)"`, "u").exec(tag)?.[1] ?? "");
}

test("gallery includes every nested screenshot, structured summaries and complete sidecars", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-gallery-"));
  try {
    fs.mkdirSync(path.join(root, "real run"));
    for (const name of ["first", "second", "third", "edit-table-wrapped-light-460"]) {
      fs.writeFileSync(path.join(root, `${name}.png`), "fixture");
      fs.writeFileSync(path.join(root, `${name}.json`), JSON.stringify({
        summary: "Wrapped editor <visible> & readable",
        info: { id: name, viewport: { width: 460, height: 900 } },
        checks: ["No clipped controls"],
      }));
    }
    fs.writeFileSync(path.join(root, "real run", "checkpoint.png"), "fixture");
    fs.writeFileSync(path.join(root, "real run", "checkpoint.md"), "Legacy expected content");
    const html = buildGallery(root);
    assert.equal((html.match(/class="capture-open"/gu) ?? []).length, 5);
    assert.ok(html.includes("5 E2E screenshots"));
    assert.equal(listCaptures(root).length, 5);
    assert.ok(html.includes("reports/e2e/screenshots/real%20run/checkpoint.png"));
    assert.ok(html.includes("Wrapped editor &lt;visible&gt; &amp; readable"));
    assert.ok(html.includes("No clipped controls"));
    assert.ok(html.includes("Legacy expected content"));
    assert.ok(html.includes('data-capture-previous'));
    assert.ok(html.includes('data-capture-next'));
    assert.ok(html.includes('data-capture-position'));
    assert.ok(html.includes('class="capture-meta"'));
    assert.ok(html.includes("technical.className = 'capture-technical'"));
    assert.ok(html.includes("event.key === 'ArrowLeft'"));
    assert.ok(html.includes("event.key === 'ArrowRight'"));
    assert.ok(html.includes("pre.setAttribute('aria-label', 'Complete screenshot sidecar')"));
    assert.ok(html.includes("viewer.showModal()"));
    assert.ok(html.includes(".content.textContent"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("gallery tolerates missing artifacts without inventing passing evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-gallery-"));
  try {
    assert.ok(buildGallery(path.join(root, "absent")).includes("0 E2E screenshots"));
    fs.writeFileSync(path.join(root, "orphan.png"), "fixture");
    assert.ok(buildGallery(root).includes("No sidecar metadata was recorded"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a visual capture takes its scenario and step id", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096
  withCaptures(["visual/block-editing/v01-x-light-900.png", "visual/block-editing/v01-x-light-900--typed.png"], (root) => {
    assert.equal(captureId("visual/block-editing/v01-x-light-900.png"), "block-editing/v01-x-light-900");
    assert.equal(captureId("visual/block-editing/v01-x-light-900--typed.png"), "block-editing/v01-x-light-900--typed");
    const html = buildGallery(root);
    assert.deepEqual(openerAttribute(html, "data-capture-id").sort(), ["block-editing/v01-x-light-900", "block-editing/v01-x-light-900--typed"]);
    assert.ok(html.includes('<figure data-capture-id="block-editing/v01-x-light-900"><a class="capture-open" href="#block-editing/v01-x-light-900" data-capture-id="block-editing/v01-x-light-900" aria-label="Inspect visual/block-editing/v01-x-light-900.png">'));
  });
});

test("a real-window capture keeps its id and URL whatever the suffix of its run folder", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096
  for (const suite of SUITES) {
    const pages = ["AbC123", "zZ9-other"].map((suffix) => {
      let html = "";
      withCaptures([`${RUN_FOLDER_PREFIX[suite]}${suffix}/gfm/r01-task.png`], (root) => { html = buildGallery(root); });
      return { ids: openerAttribute(html, "data-capture-id"), hrefs: openerAttribute(html, "href") };
    });
    assert.deepEqual(pages[0], { ids: ["gfm/r01-task"], hrefs: ["#gfm/r01-task"] }, suite);
    assert.deepEqual(pages[1], pages[0], suite);
  }
});

test("any other capture takes its path as id, percent-encoded by segment in the fragment", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096
  assert.equal(captureId("real run/checkpoint.png"), "real run/checkpoint");
  assert.equal(captureHref("real run/checkpoint"), "#real%20run/checkpoint");
  assert.equal(captureId("orphan.webp"), "orphan");
  assert.equal(captureId("real-input-AbC123.png"), "real-input-AbC123");
  withCaptures(["real run/checkpoint.png"], (root) => {
    assert.deepEqual(openerAttribute(buildGallery(root), "href"), ["#real%20run/checkpoint"]);
  });
});

test("two captures of one id keep unique ids, the first in name order the short one", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096
  const prefix = RUN_FOLDER_PREFIX["real-input"];
  withCaptures([`${prefix}BBB/gfm/r01-task.png`, `${prefix}AAA/gfm/r01-task.png`, "visual/gfm/v01-x-light-900.png"], (root) => {
    const html = buildGallery(root);
    const ids = openerAttribute(html, "data-capture-id");
    assert.deepEqual(ids, ["gfm/r01-task", `${prefix}BBB/gfm/r01-task`, "gfm/v01-x-light-900"]);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, (html.match(/class="capture-open"/gu) ?? []).length);
    assert.equal(ids.length, listCaptures(root).length);
    assert.deepEqual([...html.matchAll(/<figure data-capture-id="([^"]*)">/gu)].map((match) => match[1]), ids);
  });
  assert.deepEqual(assignCaptureIds(["shot.jpg", "shot.png", "shot.webp"]), ["shot", "shot~2", "shot~3"]);
  assert.deepEqual(assignCaptureIds(["a/b~2.png", "a/b.jpg", "a/b.png"]), ["a/b~2", "a/b", "a/b~3"]);
});

test("the gallery page carries the unknown-id notice and the history handling of the viewer", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096
  withCaptures(["orphan.png"], (root) => {
    const html = buildGallery(root);
    assert.ok(html.includes('<p class="status" role="status" data-capture-missing hidden></p><section class="gallery">'));
    assert.ok(html.includes("history.pushState"));
    assert.ok(html.includes("window.addEventListener('popstate', syncFromUrl)"));
    assert.ok(html.includes("window.addEventListener('hashchange', syncFromUrl)"));
    assert.ok(html.includes("viewer.addEventListener('close'"));
    assert.ok(!html.includes("innerHTML"));
  });
});

test("an id holding HTML characters is escaped in the page", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096
  // Windows allows no < nor " in a file name; the Linux run covers them.
  const name = process.platform === "win32" ? "a&'b" : "a&'<b>\"c";
  const escaped = process.platform === "win32" ? "a&amp;&#39;b" : "a&amp;&#39;&lt;b&gt;&quot;c";
  withCaptures([`${name}.png`], (root) => {
    const html = buildGallery(root);
    assert.deepEqual(openerAttribute(html, "data-capture-id"), [escaped]);
    assert.deepEqual(openerAttribute(html, "href"), [captureHref(name).replaceAll("'", "&#39;")]);
    assert.ok(!html.includes(name));
  });
});
