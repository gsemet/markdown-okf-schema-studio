import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

// CR 522: the README shows five features in motion, each clip's GIF in the section of its feature.
// No GIF size is checked: a checkout without Git LFS holds pointer files.
const root = path.resolve(__dirname, "../../..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8").replaceAll("\r\n", "\n");

const GIFS: Readonly<Record<string, string>> = {
  "table-anchors": "Highest respect for the raw Markdown",
  "slash-menu-grid": "Edit MyST visually",
  "figure-editor": "Edit MyST visually",
  "diff-side-by-side": "See what changed since the last commit",
  "radio-buttons": "Decide in the page: choices in your plans",
};

/** The text under a `###` heading, up to the next heading of level 2 or 3. */
function section(title: string): string {
  const parts = readme.split(`\n### ${title}\n`);
  assert.equal(parts.length, 2, `one section titled ${title}`);
  return parts[1]!.split(/^##/mu)[0]!;
}

test("each of the five clip GIFs is an image of its feature's section, with a text and an existing file", () => {
  for (const [clip, title] of Object.entries(GIFS)) {
    const file = `docs/demo-video/clips/${clip}/${clip}.gif`;
    const images = [...section(title).matchAll(/^!\[([^\]]+)\]\(([^)]+)\)$/gmu)].filter((match) => match[2] === file);
    assert.equal(images.length, 1, `${title} shows ${file}`);
    assert.equal(readme.split(`](${file})`).length, 2, `${file} is shown once`);
    assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
  }
});

test("the replaced stills are no longer referenced and the Markdown example stays above the radio clip", () => {
  for (const still of ["showcase-diff-cream.png", "radio-plan-cream.png", "radio-plan-dark.png"]) {
    assert.ok(!readme.includes(still), still);
  }
  const decide = section("Decide in the page: choices in your plans");
  assert.ok(decide.indexOf("```markdown") >= 0 && decide.indexOf("```markdown") < decide.indexOf("radio-buttons.gif"));
  assert.ok(section("Edit MyST visually").includes("](images/readme/showcase-myst-edit.png)"), "the editing still stays");
});

test("the one-minute demo stays at the top and the top line links the Videos page", () => {
  const demo = readme.indexOf("**One-minute demo**\n\nhttps://github.com/user-attachments/assets/");
  assert.ok(demo >= 0 && demo < readme.indexOf("\n## "), "the demo comes before the first section");
  assert.ok(demo < readme.indexOf("**Example of complex Markdown rendering**"));
  const top = readme.split("\n").find((line) => line.startsWith("[VS Code Marketplace]")) ?? "";
  assert.match(top, /\/gallery\.html\) \| \[Videos\]\(https:\/\/gsemet\.github\.io\/markdown-okf-schema-studio\/videos\.html\) \| /u);
});

test("every line of the changed sections stays within 100 columns outside tables and images", () => {
  for (const title of new Set(Object.values(GIFS))) {
    for (const line of section(title).split("\n").filter((entry) => !entry.startsWith("![") && !entry.startsWith("|"))) {
      assert.ok(line.length <= 100, line);
    }
  }
});
