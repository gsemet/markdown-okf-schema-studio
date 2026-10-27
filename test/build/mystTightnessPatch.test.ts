import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(__dirname, "../../..");
const patched = ["markdown-it-dollarmath", "myst-to-html", "markdown-it-myst"];

/**
 * A scratch install: the three patched packages are copied, every other package is linked to the
 * shared node_modules, which stays untouched. The patch script runs against the scratch copy.
 */
function scratchInstall(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-myst-patch-"));
  const modules = path.join(projectRoot, "node_modules");
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "node_modules"));
  fs.copyFileSync(path.join(projectRoot, "scripts/patch-myst-imports.mjs"), path.join(root, "scripts/patch-myst-imports.mjs"));
  for (const entry of fs.readdirSync(modules)) {
    if (entry === ".bin" || entry === ".package-lock.json") continue;
    const from = path.join(modules, entry);
    const to = path.join(root, "node_modules", entry);
    if (patched.includes(entry)) fs.cpSync(from, to, { recursive: true });
    else fs.symlinkSync(from, to, "dir");
  }
  return root;
}

/** The shared install may already carry the patch, so the scratch copy is put back to 1.0.18 first. */
function unpatch(root: string): void {
  const file = path.join(root, "node_modules/markdown-it-myst/dist/directives.js");
  const source = fs.readFileSync(file, "utf8");
  const patchedHead = /const blockLinesByState = new WeakMap\(\);\nfunction computeBlockTightness\(state, map\) \{\n(?:.*\n){6}/u;
  fs.writeFileSync(file, source
    .replace(patchedHead, "function computeBlockTightness(src, map) {\n    const lines = src.split('\\n');\n")
    .replace("computeBlockTightness(state, token.map)", "computeBlockTightness(state.src, token.map)"));
}

function runPatch(root: string): void {
  const result = spawnSync(process.execPath, ["scripts/patch-myst-imports.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

/** Blank lines around the fences give every `tight` value: false, "before", "after" and true. */
const EXPECTED_TIGHT: unknown[] = [false, "before", "after", true, false];
const SOURCE = [
  "text", "", "```{note}", "a", "```", "", "next",
  "```{note}", "b", "```", "", "after",
  "", "```{note}", "c", "```", "tight after",
  "t", "```{note}", "d", "```", "t",
  "", "```{warning}", "e", "```", "",
].join("\n");

let importCount = 0;

async function parseWith(root: string, source: string): Promise<{ tight: unknown[]; splits: number }> {
  const modulePath = path.join(root, "node_modules/markdown-it-myst/dist/directives.js");
  const MarkdownIt = (await import("markdown-it")).default;
  // A fresh query string loads the file again after the patch has rewritten it.
  const { directivePlugin } = await import(`${pathToFileURL(modulePath).href}?load=${importCount++}`);
  const md = new MarkdownIt().use(directivePlugin);
  const original = String.prototype.split;
  let splits = 0;
  String.prototype.split = function (this: string, ...args: unknown[]) {
    if (args[0] === "\n" && this.length === source.length) splits += 1;
    return (original as (...a: unknown[]) => string[]).apply(this, args);
  } as typeof String.prototype.split;
  try {
    const tokens = md.parse(source, {});
    const tight = tokens.filter((token) => token.type === "parsed_directive_open").map((token) => token.meta.tight);
    return { tight, splits };
  } finally {
    String.prototype.split = original;
  }
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-070
test("the myst patch splits the source into lines once per parse and keeps the tightness values", async () => {
  const root = scratchInstall();
  try {
    unpatch(root);
    const before = await parseWith(root, SOURCE);
    assert.equal(before.splits, 5, "the unpatched package splits the source for every directive fence");
    runPatch(root);
    const after = await parseWith(root, SOURCE);
    assert.equal(after.splits, 1, "the patched package splits the source once for the whole parse");
    assert.deepEqual(after.tight, before.tight);
    assert.deepEqual(after.tight, EXPECTED_TIGHT);
    runPatch(root);
    assert.deepEqual((await parseWith(root, SOURCE)).tight, EXPECTED_TIGHT, "the patch can run twice");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
