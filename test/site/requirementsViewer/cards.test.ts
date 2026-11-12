import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { chromium } from "playwright-core";

import { SITE_URL, writeCardPictures } from "../socialCard";
import { levelCards } from "./cards";
import { fixtureReport } from "./fixture";
import { parseRequirementsReport } from "./model";
import { LEVELS, viewerDocument, type Level } from "./shell";
import { viewerPages } from "./write";

const FOOTER = { sha: "abc123", generatedAt: "" };

test("social tags of each level: own title, absolute url, the picture of the level", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  const model = parseRequirementsReport(fixtureReport(), "abc123");
  assert.ok(model);
  const levels = new Set<Level>();
  for (const spec of viewerPages(model, "/nonexistent-root")) {
    const html = viewerDocument(spec, FOOTER);
    levels.add(spec.level);
    assert.ok(html.includes(`property="og:image" content="${SITE_URL}requirements/og/${spec.level}.png"`), spec.dir);
    assert.ok(html.includes(`property="og:url" content="${SITE_URL}${spec.dir}/"`), spec.dir);
    assert.ok(html.includes('property="og:image:width" content="1200"') && html.includes('property="og:image:height" content="630"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.equal(html.split('property="og:title"').length - 1, 1);
  }
  assert.deepEqual([...levels].sort(), ["area", "areas", "behaviour", "use-case"]);
  const titles = new Set(viewerPages(model, "/nonexistent-root").map((spec) => spec.title));
  assert.ok(titles.size > 5, "each page has its own title");
  assert.deepEqual(levelCards().map((card) => card.name).sort(), Object.keys(LEVELS).sort());
});

test("the four pictures are drawn at 1200 x 630", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  try {
    await (await chromium.launch()).close();
  } catch {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-viewer-cards-"));
  try {
    await writeCardPictures(path.join(root, "site", "requirements"), levelCards(), path.join(root, "templates"));
    for (const level of Object.keys(LEVELS)) {
      const png = fs.readFileSync(path.join(root, "site", "requirements", "og", `${level}.png`));
      assert.equal(png.readUInt32BE(16), 1200);
      assert.equal(png.readUInt32BE(20), 630);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
