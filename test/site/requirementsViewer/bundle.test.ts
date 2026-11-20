import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { parseScenarios } from "./model";
import { scenarioBody } from "./pages";

/** Every `*.md` file under a folder, at any depth, sorted. */
function markdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  }).sort();
}

/** For each `### Scenario` heading above the links block, whether its section (up to the next heading of level 1 to 3) holds a non-blank line. */
function sectionsHoldText(raw: string): boolean[] {
  const found: boolean[] = [];
  let open = false;
  for (const line of (raw.split("<!-- okf:links:start -->")[0] ?? "").split("\n")) {
    if (/^###\s+Scenario/u.test(line)) {
      found.push(false);
      open = true;
    } else if (/^#{1,3}\s/u.test(line)) open = false;
    else if (open && line.trim() !== "") found[found.length - 1] = true;
  }
  return found;
}

const text = (html: string): string => html.replace(/<[^>]*>/gu, "").trim();

test("no scenario card of the requirements bundle is empty", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082
  const root = path.join(process.cwd(), "requirements/tiers");
  const files = [...markdownFiles(path.join(root, "strs")), ...markdownFiles(path.join(root, "swrs"))];
  assert.ok(files.length > 0, "the bundle is found from the repository root");
  let tables = 0;
  let lists = 0;
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8").replace(/\r\n/gu, "\n");
    const scenarios = parseScenarios(raw);
    const holds = sectionsHoldText(raw);
    assert.equal(scenarios.length, holds.length, `${file}: every Scenario heading is read`);
    scenarios.forEach((scenario, index) => {
      if (!holds[index]) return;
      const label = `${file}: ${scenario.name}`;
      if (scenario.blocks.some((block) => block.type === "table")) tables += 1;
      if (scenario.blocks.some((block) => block.type === "steps")) lists += 1;
      const html = scenarioBody(scenario);
      assert.notEqual(text(html), "", `${label}: the card has text`);
      for (const grid of html.matchAll(/<div class="gwt">(.*?)<\/div><\/div>/gsu)) {
        const columns = [...`${grid[1] ?? ""}</div>`.matchAll(/<div><b>[^<]*<\/b>(.*?)<\/div>/gsu)].map((match) => text(match[1] ?? ""));
        assert.ok(columns.some((column) => column !== ""), `${label}: no grid with three empty columns`);
      }
    });
  }
  assert.ok(tables > 0 && lists > 0, "the guard saw at least one table scenario and one list scenario");
});
