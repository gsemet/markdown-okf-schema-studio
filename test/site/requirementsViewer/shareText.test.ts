import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { parse } from "yaml";

import { EXTENSION_ROOT } from "../../reportPaths";
import { plainText, shareDescription } from "../socialCard";

const ROOT = EXTENSION_ROOT;
const WORD = /[\p{L}\p{N}]+/gu;

function files(folder: string): string[] {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(folder, entry.name)) : entry.name.endsWith(".md") ? [path.join(folder, entry.name)] : []);
}

function frontmatter(file: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(fs.readFileSync(file, "utf8"));
  return match ? parse(match[1] ?? "") as Record<string, unknown> : {};
}

test("plainText removes the backticks and the link syntax and nothing else", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085#S5
  assert.equal(plainText("Use `code` and  `x.y`\n now"), "Use code and x.y now");
  assert.equal(plainText("See [the guide](https://example.com/a_b) here"), "See the guide here");
  assert.equal(plainText("  *x* snake_case <b>y</b> {role}`name` "), "*x* snake_case <b>y</b> {role}name");
});

test("shareDescription keeps a short text whole and cuts a long one at a word", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085#S5
  const exact = `${"a".repeat(100)} ${"b".repeat(99)}`;
  assert.equal(exact.length, 200);
  assert.equal(shareDescription(exact), exact);
  const long = `${"word ".repeat(60)}end`;
  const cut = shareDescription(long);
  assert.ok(cut.length <= 200 && cut.endsWith("…"));
  assert.ok(long.startsWith(cut.slice(0, -1)) && long[cut.length - 1] === " ", "ends at a word");
  assert.equal(shareDescription("x".repeat(300)), `${"x".repeat(199)}…`);
});

test("no real requirement loses a word in its share text", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085#S5
  let checked = 0;
  for (const tier of ["strs", "swrs"]) {
    for (const file of files(path.join(ROOT, "requirements", "tiers", tier))) {
      const data = frontmatter(file);
      for (const key of ["description", "user_need"]) {
        const text = data[key];
        if (typeof text !== "string" || text.length === 0) continue;
        // Link targets are left out; a backtick is not a word break, so `$ref`s reads "refs".
        const expected = text.replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1").replaceAll("`", "").match(WORD) ?? [];
        assert.deepEqual(plainText(text).match(WORD) ?? [], expected, `${file} ${key}`);
        checked += 1;
        if (tier === "swrs" && key === "description") {
          const plain = plainText(text);
          const cut = shareDescription(text);
          if (cut.endsWith("…")) {
            const head = cut.slice(0, -1);
            assert.ok(plain.startsWith(head) && plain[head.length] === " ", `${file} cut at a word`);
          } else {
            assert.equal(cut, plain, file);
          }
        }
      }
    }
  }
  assert.ok(checked > 100, "the bundle was read");
});
