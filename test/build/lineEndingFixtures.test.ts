import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

const ROOT = path.resolve(__dirname, "../../..");

/** Tracked files matching a git pathspec, as repository-relative paths. */
function tracked(pattern: string): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", pattern], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
}

/** The raw bytes of a tracked file, as text: never an autocrlf-converted copy. */
function bytes(file: string): string {
  return fs.readFileSync(path.join(ROOT, file)).toString("latin1");
}

test("every tracked *.crlf.md holds CR LF only, and there is at least one", () => {
  const files = tracked("*.crlf.md");
  assert.ok(files.length > 0, "a real CRLF fixture is committed");
  for (const file of files) {
    const text = bytes(file);
    assert.ok(text.includes("\r\n"), `${file}: holds CR LF`);
    assert.equal(text.replace(/\r\n/gu, "").match(/[\r\n]/u), null, `${file}: holds only CR LF line endings`);
  }
});

test("every tracked *.mixed.md holds both CR LF and bare LF, and there is at least one", () => {
  const files = tracked("*.mixed.md");
  assert.ok(files.length > 0, "a real mixed fixture is committed");
  for (const file of files) {
    const text = bytes(file);
    assert.ok(text.includes("\r\n"), `${file}: holds CR LF`);
    assert.ok(text.replace(/\r\n/gu, "").includes("\n"), `${file}: holds a bare LF`);
  }
});

test("Git keeps the bytes of the CRLF and mixed fixtures: the text attribute is unset", () => {
  const files = [...tracked("*.crlf.md"), ...tracked("*.mixed.md")];
  const output = execFileSync("git", ["check-attr", "text", "--", ...files], { cwd: ROOT, encoding: "utf8" });
  const lines = output.split(/\r?\n/u).filter(Boolean);
  assert.equal(lines.length, files.length);
  for (const line of lines) assert.match(line, /: text: unset$/u, line);
});

test("no other tracked Markdown file is stored with a CR", () => {
  // The stored content (the index), not the working tree: a tool on Windows may rewrite a file with CR LF.
  const expected = new Set([...tracked("*.crlf.md"), ...tracked("*.mixed.md")]);
  const output = execFileSync("git", ["ls-files", "--eol", "-z", "--", "*.md"], { cwd: ROOT, encoding: "utf8" });
  const offenders = output.split("\0").filter(Boolean)
    .map((entry) => ({ stored: entry.split(/\s+/u)[0], file: entry.slice(entry.indexOf("\t") + 1) }))
    .filter(({ stored, file }) => (stored === "i/crlf" || stored === "i/mixed") && !expected.has(file))
    .map(({ file }) => file);
  assert.deepEqual(offenders, [], "these Markdown files are stored with a CR: name them *.crlf.md or *.mixed.md, or convert them to LF");
});
