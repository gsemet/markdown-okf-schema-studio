import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { buildGallery } from "./buildSite";

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
    assert.ok(html.includes("reports/e2e/screenshots/real%20run/checkpoint.png"));
    assert.ok(html.includes("Wrapped editor &lt;visible&gt; &amp; readable"));
    assert.ok(html.includes("No clipped controls"));
    assert.ok(html.includes("Legacy expected content"));
    assert.ok(html.includes('aria-label="Complete screenshot sidecar"'));
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

