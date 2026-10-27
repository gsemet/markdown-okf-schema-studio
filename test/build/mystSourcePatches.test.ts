import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const projectRoot = path.resolve(__dirname, "../../..");
const sharedModules = path.join(projectRoot, "node_modules");
const patched = ["markdown-it-dollarmath", "myst-to-html", "markdown-it-myst"];
const patchedFiles = [
  "markdown-it-dollarmath/dist/index.js",
  "myst-to-html/dist/utils.js",
  "markdown-it-myst/dist/directives.js",
];

/**
 * A scratch install with pristine MyST packages: the three patched packages are copied (and put
 * back to their published content, because the shared install may carry an older postinstall
 * patch), every other package is linked to the shared node_modules, which this test never writes.
 */
function scratchInstall(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-myst-patch-"));
  fs.mkdirSync(path.join(root, "node_modules"));
  for (const entry of fs.readdirSync(sharedModules)) {
    if (entry === ".bin" || entry === ".package-lock.json") continue;
    const from = path.join(sharedModules, entry);
    const to = path.join(root, "node_modules", entry);
    if (patched.includes(entry)) fs.cpSync(from, to, { recursive: true });
    else fs.symlinkSync(from, to, "dir");
  }
  const modules = path.join(root, "node_modules");
  for (const file of ["markdown-it-dollarmath/dist/index.js", "myst-to-html/dist/utils.js"]) {
    const target = path.join(modules, file);
    fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace("utils.mjs", "utils.js"));
  }
  const directives = path.join(modules, "markdown-it-myst/dist/directives.js");
  const patchedHead = /const blockLinesByState = new WeakMap\(\);\nfunction computeBlockTightness\(state, map\) \{\n(?:.*\n){6}/u;
  fs.writeFileSync(directives, fs.readFileSync(directives, "utf8")
    .replace(patchedHead, "function computeBlockTightness(src, map) {\n    const lines = src.split('\\n');\n")
    .replace("computeBlockTightness(state, token.map)", "computeBlockTightness(state.src, token.map)"));
  return root;
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

/** The body shared by the bundled entry and the Node-run script: parse, count splits, render. */
const PROBE = `
import MarkdownIt from "markdown-it";
import { directivePlugin } from "markdown-it-myst";
import { mystParse } from "myst-parser";
import { mystToHtml } from "myst-to-html";
export function probe(source) {
  const original = String.prototype.split;
  let splits = 0;
  String.prototype.split = function (...args) {
    if (args[0] === "\\n" && this.length === source.length) splits += 1;
    return original.apply(this, args);
  };
  try {
    const tokens = new MarkdownIt().use(directivePlugin).parse(source, {});
    const tight = tokens.filter((token) => token.type === "parsed_directive_open").map((token) => token.meta.tight);
    return { tight, splits };
  } finally {
    String.prototype.split = original;
  }
}
export function html() {
  return mystToHtml(mystParse("Euler $e^{i\\\\pi}+1=0$ and *emphasis*.", {}));
}
`;

type Probe = { tight: unknown[]; splits: number };
type ProbeModule = { probe(source: string): Probe; html(): string };

async function plugin(): Promise<{ mystPatchPlugin: import("esbuild").Plugin }> {
  return import(pathToFileURL(path.join(projectRoot, "scripts/myst-patches.mjs")).href);
}

/** Only the import-path correction, so the control build shows the split count of the package alone. */
const importOnly: import("esbuild").Plugin = {
  name: "import-only",
  setup(builder) {
    builder.onResolve({ filter: /^markdown-it\/lib\/common\/utils\.js$/ }, (args) =>
      builder.resolve("markdown-it/lib/common/utils.mjs", { resolveDir: args.resolveDir, kind: args.kind }));
  },
};

async function bundle(root: string, withPlugin: boolean, extra: import("esbuild").Plugin[] = []): Promise<{ module: ProbeModule; inputs: string[] }> {
  fs.writeFileSync(path.join(root, "entry.mjs"), PROBE);
  const outfile = path.join(root, `out/bundle-${withPlugin ? "patched" : "control"}.cjs`);
  const result = await build({
    absWorkingDir: root,
    entryPoints: ["entry.mjs"],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    metafile: true,
    logLevel: "silent",
    plugins: withPlugin ? [(await plugin()).mystPatchPlugin] : extra,
  });
  return {
    module: createRequire(path.join(root, "x.js"))(outfile),
    inputs: Object.keys(result.metafile.inputs),
  };
}

function fingerprint(): string[] {
  return patchedFiles.map((file) => {
    const target = path.join(sharedModules, file);
    return `${file} ${fs.statSync(target).mtimeMs} ${createHash("sha256").update(fs.readFileSync(target)).digest("hex")}`;
  });
}

// @tests_req SwRS-MDOKFSTUDIO-CORE-070
test("the esbuild plugin patches the MyST packages in memory: one line split per parse, same tightness", async () => {
  const before = fingerprint();
  const root = scratchInstall();
  try {
    const onDisk = patchedFiles.map((file) => fs.readFileSync(path.join(root, "node_modules", file), "utf8"));
    await assert.rejects(bundle(root, false), /Could not resolve "markdown-it\/lib\/common\/utils\.js"/u, "published import path");
    const control = await bundle(root, false, [importOnly]);
    assert.equal(control.module.probe(SOURCE).splits, 5, "without the plugin the package splits for every fence");

    const plugged = await bundle(root, true);
    const result = plugged.module.probe(SOURCE);
    assert.equal(result.splits, 1, "the patched package splits the source once for the whole parse");
    assert.deepEqual(result.tight, control.module.probe(SOURCE).tight);
    assert.deepEqual(result.tight, EXPECTED_TIGHT);
    assert.ok(plugged.inputs.some((input) => input.endsWith("markdown-it/lib/common/utils.mjs")), "corrected import path");
    assert.ok(!plugged.inputs.some((input) => input.endsWith("markdown-it/lib/common/utils.js")));
    assert.match(plugged.module.html(), /<em>emphasis<\/em>/u);
    assert.match(plugged.module.html(), /math/u);

    assert.deepEqual(
      patchedFiles.map((file) => fs.readFileSync(path.join(root, "node_modules", file), "utf8")),
      onDisk, "the packages on disk are not written");
    assert.deepEqual(fingerprint(), before, "the real node_modules is not written");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-070
test("the Node load hook patches the MyST packages for Node-run code without writing them", () => {
  const before = fingerprint();
  const root = scratchInstall();
  try {
    fs.writeFileSync(path.join(root, "run.mjs"), `${PROBE}\nconsole.log(JSON.stringify({ ...probe(${JSON.stringify(SOURCE)}), html: html() }));\n`);
    const onDisk = fs.readFileSync(path.join(root, "node_modules/markdown-it-myst/dist/directives.js"), "utf8");
    const register = path.join(projectRoot, "scripts/register-myst-patches.mjs");

    const hooked = spawnSync(process.execPath, ["--import", register, "run.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(hooked.status, 0, hooked.stderr);
    const result = JSON.parse(hooked.stdout) as Probe & { html: string };
    assert.equal(result.splits, 1);
    assert.deepEqual(result.tight, EXPECTED_TIGHT);
    assert.match(result.html, /<em>emphasis<\/em>/u);
    assert.equal(fs.readFileSync(path.join(root, "node_modules/markdown-it-myst/dist/directives.js"), "utf8"), onDisk);
    assert.deepEqual(fingerprint(), before, "the real node_modules is not written");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-070
test("a MyST package of another version or with unexpected content fails the build", async () => {
  for (const change of ["version", "content"] as const) {
    const root = scratchInstall();
    try {
      const directory = path.join(root, "node_modules/markdown-it-myst");
      if (change === "version") {
        const manifest = path.join(directory, "package.json");
        fs.writeFileSync(manifest, fs.readFileSync(manifest, "utf8").replace('"1.0.18"', '"1.0.19"'));
      } else {
        const file = path.join(directory, "dist/directives.js");
        fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("function computeBlockTightness", "function computeTightness"));
      }
      await assert.rejects(bundle(root, true), /Review the MyST source patch for markdown-it-myst/u, change);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

/**
 * The extension host loads no Node hook, so a file under test/integration must not reach the MyST
 * engine (directly or through a relative import): it takes rendered HTML from the bundle built by
 * esbuild.mjs (out/test/bundle/mystRenderer.js), which carries the source patches.
 */
// @tests_req SwRS-MDOKFSTUDIO-CORE-070
test("no integration test imports the MyST engine unbundled", () => {
  const engine = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:myst-[\w-]+|markdown-it-[\w-]+|unified)["']/u;
  // `import type` is erased by tsc: it never loads the module in the host.
  const relative = /(?<!import type[^;]*?)(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](\.[^"']+)["']/gu;
  const resolve = (from: string, specifier: string): string | undefined => {
    const base = path.resolve(path.dirname(from), specifier);
    return [`${base}.ts`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
  };
  const listed = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { return entry.name === "fixtures" ? [] : listed(full); }
    return entry.name.endsWith(".ts") ? [full] : [];
  });
  const offenders: string[] = [];
  for (const entry of listed(path.join(projectRoot, "test", "integration"))) {
    const seen = new Set<string>();
    const stack = [entry];
    while (stack.length > 0) {
      const file = stack.pop() as string;
      if (seen.has(file)) { continue; }
      seen.add(file);
      const source = fs.readFileSync(file, "utf8");
      if (engine.test(source) || file.endsWith(path.join("render", "mystEngine.ts"))) {
        offenders.push(`${path.relative(projectRoot, entry)} -> ${path.relative(projectRoot, file)}`);
        break;
      }
      for (const match of source.matchAll(relative)) {
        const next = resolve(file, match[1]);
        if (next !== undefined) { stack.push(next); }
      }
    }
  }
  assert.deepEqual(offenders, [], "integration tests must use out/test/bundle/mystRenderer.js");
});
