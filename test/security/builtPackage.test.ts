/**
 * The built package, without VS Code: it reads the dependency tree installed in this checkout, builds
 * the bundles with the project's own bundle step in a temporary directory and asks the packaging tool
 * which files the VSIX would hold. It accepts no use-case path: nothing is installed again and no VSIX
 * is written.
 */
import * as assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { listFiles, PackageManager } from "@vscode/vsce";

const repositoryRoot = path.resolve(__dirname, "../../..");

/** The files of `out/bundle` that the extension and the preview page load by name. */
const LOADED_BUNDLES = [
  "extension.js",
  "renderWorker.js",
  "lazy/highlight.js",
  "lazy/katex.js",
  "preview.js",
  "preview.css",
  "mermaidPreview.js",
  "vegaPreview.js",
  "plantumlPreview.js",
  "katex/katex.min.css",
  "plantuml/LICENSE",
];

/** Files a build or a test run leaves under `out/`, which no package may hold. */
const LEFTOVERS = [
  "out/test/leftover.test.js",
  "out/src/leftover.js",
  "out/boundaries/leftover.json",
  "out/reports/leftover.json",
  "out/site/index.html",
];

interface LockEntry {
  readonly version?: string;
  readonly resolved?: string;
}

function readText(...segments: string[]): string {
  return fs.readFileSync(path.join(repositoryRoot, ...segments), "utf8");
}

function lockedPackages(...segments: string[]): Record<string, LockEntry> {
  return (JSON.parse(readText(...segments)) as { packages: Record<string, LockEntry> }).packages;
}

/** The installation of this checkout: pinned Node.js, the lock file's versions, the official registry. */
function assertPinnedInstall(): void {
  assert.equal(readText(".nvmrc").trim(), "24", ".nvmrc pins another Node.js version");
  assert.equal(process.versions.node.split(".")[0], "24",
    `this run uses Node.js ${process.versions.node}, not the pinned major 24`);
  const locked = lockedPackages("package-lock.json");
  const installed = lockedPackages("node_modules", ".package-lock.json");
  assert.ok(Object.keys(installed).length > 0, "npm records no installed package");
  for (const [name, entry] of Object.entries(installed)) {
    assert.equal(entry.version, locked[name]?.version, `${name} is installed in another version than the locked one`);
  }
  for (const [name, entry] of [...Object.entries(locked), ...Object.entries(installed)]) {
    if (entry.resolved === undefined) continue;
    assert.equal(new URL(entry.resolved).origin, "https://registry.npmjs.org", `${name} comes from ${entry.resolved}`);
  }
}

/** The built-in PlantUML engine: one exact version, and that version installed. */
function assertExactEngine(): void {
  const manifest = JSON.parse(readText("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const pin = { ...manifest.dependencies, ...manifest.devDependencies }["@plantuml/core"] ?? "";
  assert.match(pin, /^\d+\.\d+\.\d+$/u, `@plantuml/core is not pinned to one exact version: "${pin}"`);
  assert.equal(lockedPackages("node_modules", ".package-lock.json")["node_modules/@plantuml/core"]?.version, pin,
    "the installed PlantUML engine is not the pinned one");
}

/** The files below `folder` of `root`, as the forward-slash paths the packaging tool prints. */
function filesUnder(root: string, folder: string): string[] {
  return fs.readdirSync(path.join(root, folder), { recursive: true, encoding: "utf8" })
    .filter((name) => fs.statSync(path.join(root, folder, name)).isFile())
    .map((name) => `${folder}/${name.replace(/\\/gu, "/")}`)
    .sort();
}

/**
 * The project's bundle step, run in `directory`: it writes below its working directory, which links
 * to the sources, so the `out/` folder of the checkout is left alone.
 */
function buildBundles(directory: string): void {
  const sources = path.join(directory, "src");
  fs.symlinkSync(path.join(repositoryRoot, "src"), sources, "junction");
  execFileSync(process.execPath, [path.join(repositoryRoot, "esbuild.mjs")], { cwd: directory, stdio: "pipe" });
  fs.unlinkSync(sources);
}

// The checkout runs the pinned Node.js on the locked dependencies, the bundle step writes every file
// the preview loads, with the engine's licence, and the packaging tool keeps all of out/bundle but its
// source maps.
// @tests_req SwRS-MDOKFSTUDIO-TRUST-092#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-092#S2
test("the bundle step writes the files the preview loads and the package keeps them", async () => {
  assertPinnedInstall();
  assertExactEngine();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-built-package-"));
  try {
    buildBundles(directory);
    const built = filesUnder(directory, "out/bundle").filter((file) => !file.endsWith(".map"));
    for (const file of LOADED_BUNDLES) {
      assert.ok(built.includes(`out/bundle/${file}`), `the build writes no out/bundle/${file}: ${built.join(", ")}`);
    }
    for (const folder of ["out/bundle/mermaid-chunks/", "out/bundle/katex/fonts/"]) {
      assert.ok(built.some((file) => file.startsWith(folder)), `the build writes nothing under ${folder}`);
    }
    assert.equal(
      fs.readFileSync(path.join(directory, "out", "bundle", "plantuml", "LICENSE"), "utf8"),
      readText("node_modules", "@plantuml", "core", "LICENSE"),
      "the bundle does not carry the licence of the installed PlantUML engine",
    );

    for (const leftover of LEFTOVERS) {
      fs.mkdirSync(path.dirname(path.join(directory, leftover)), { recursive: true });
      fs.writeFileSync(path.join(directory, leftover), "leftover\n", "utf8");
    }
    for (const file of ["package.json", ".vscodeignore"]) {
      fs.copyFileSync(path.join(repositoryRoot, file), path.join(directory, file));
    }
    const packaged = (await listFiles({ cwd: directory, packageManager: PackageManager.None }))
      .map((file) => file.replace(/\\/gu, "/"));
    assert.deepEqual(packaged.filter((file) => file.startsWith("out/")).sort(), built,
      "the package must keep all of out/bundle but its source maps, and nothing else of out/");
    assert.deepEqual(packaged.filter((file) => file.endsWith(".map")), [], "the package holds source maps");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
