import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

// CR 124: the README presents comment threads as a feature of its own, with a screenshot of an open thread.
const root = path.resolve(__dirname, "../../..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const image = "images/readme/showcase-comment-thread.png";

test("the README has a comment-thread section with the screenshot of an open thread", () => {
  assert.match(readme, /^### Review with comment threads$/mu);
  assert.ok(readme.includes(`](${image})`), "the section shows the thread screenshot");
  assert.ok(fs.existsSync(path.join(root, image)), "the screenshot file exists");
  const section = readme.split(/^### Review with comment threads$/mu)[1]!.split(/^### /mu)[0]!;
  assert.match(section, /\.comments\.json/u, "names the sidecar file");
  assert.match(section, /markdownOkfSchemaStudio\.comments\.authorName/u, "names the author setting");
  assert.match(section, /multi-user/u, "states the multi-user direction");
});

test("the comment-thread section follows the change-bar section and 'And more' no longer repeats it", () => {
  assert.ok(readme.indexOf("### See what changed since the last commit") < readme.indexOf("### Review with comment threads"));
  assert.ok(readme.indexOf("### Review with comment threads") < readme.indexOf("### Mermaid and PlantUML"));
  const more = readme.split(/^### And more$/mu)[1]!.split(/^## /mu)[0]!;
  assert.ok(!/comment thread/iu.test(more), "no duplicate bullet");
});

test("every README line stays within 100 columns outside tables and images", () => {
  const section = readme.split(/^### Review with comment threads$/mu)[1]!.split(/^### /mu)[0]!;
  for (const line of section.split("\n").filter((entry) => !entry.startsWith("![") && !entry.startsWith("|"))) {
    assert.ok(line.length <= 100, line);
  }
});

test("the review-comments guide links back to the README screenshot's feature and names the setting", () => {
  const guide = fs.readFileSync(path.join(root, "docs/user/review-comments.md"), "utf8");
  assert.match(guide, /markdownOkfSchemaStudio\.comments\.authorName/u);
  assert.match(guide, /\(\.\.\/\.\.\/images\/readme\/showcase-comment-thread\.png\)/u);
});
