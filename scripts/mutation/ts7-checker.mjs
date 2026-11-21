/**
 * Stryker checker plugin `mdokf-ts7` (CR-450, mt-Q7, mt-Q8, mt-Q12): type-checks every mutant
 * against the whole program with the project's own TypeScript, through `typescript/unstable/sync`.
 *
 * Pinned to `typescript` 7.0.2 (the native compiler, `devDependencies.typescript`); `unstable`
 * means the API may change between TypeScript 7 releases. The only names used are: `API`
 * (`new API({ cwd, fs: { readFile } })`, `updateSnapshot({ openProjects })`,
 * `updateSnapshot({ fileChanges: { changed } })`, `close()`), `snapshot.getProjects()`,
 * `snapshot.dispose()`, `project.program.getSyntacticDiagnostics()` and `getSemanticDiagnostics()`,
 * and the diagnostic fields `fileName`, `pos`, `code`, `category`, `text`.
 *
 * Why the stock `@stryker-mutator/typescript-checker` cannot run here: it loads the classic compiler
 * API from `typescript`, whose root export in version 7 is only `{ version, versionMajorMinor }`.
 * Its option `typescriptChecker.experimentalNativePreview` targets the native-preview packaging,
 * not a `typescript` 7 install. Its design is the reference of this checker: one mutant per check,
 * whole-program diagnostics, `snapshot.dispose()` after each check.
 *
 * `init` opens the project once and records the baseline diagnostics; `check(mutants)` checks the
 * ORIGINAL sources, with the mutated text of one file given through the virtual file system
 * (never Stryker's instrumented copies), one mutant per check, no grouping. A mutant whose check
 * throws is an error of the run, never `Passed`. The sync API blocks while `tsgo` works, so no
 * in-process timeout is possible: a hung `tsgo` is stopped by the user or the 6 h rule.
 *
 * `node scripts/mutation/ts7-checker.mjs --self-test` (run first by `just mutation-core`): writes a
 * small project to a temporary folder and runs the real check there. It exits non-zero when the
 * API does not load, `tsgo` does not spawn, the project does not open, or the check misjudges a
 * type-breaking or a type-valid replacement. No setting and no flag skips the type check.
 */
import { CheckStatus } from "@stryker-mutator/api/check";
import { PluginKind, declareClassPlugin, tokens, commonTokens } from "@stryker-mutator/api/plugin";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { applyMutant, describeDiagnostic, diagnosticKey, newDiagnostics, overlayKey } from "./ts7-checker-pure.mjs";

const require = createRequire(import.meta.url);
const slash = (file) => file.replace(/\\/gu, "/");

/** A whole-program checker over one TypeScript project. */
export class Ts7Session {
  constructor(root) {
    this.root = path.resolve(root);
    this.overlay = new Map();
    this.texts = new Map();
  }

  async open() {
    const { version } = require("typescript");
    if (!String(version).startsWith("7.")) {
      throw new Error(`mdokf-ts7: typescript ${version} is installed, this checker is pinned to TypeScript 7.x`);
    }
    this.version = version;
    let module;
    try {
      module = await import("typescript/unstable/sync");
    } catch (error) {
      throw new Error(`mdokf-ts7: typescript/unstable/sync does not load: ${error.message}`);
    }
    this.api = new module.API({ cwd: this.root, fs: { readFile: (file) => this.overlay.get(overlayKey(file)) } });
    this.tsconfig = slash(path.join(this.root, "tsconfig.json"));
    const snapshot = this.api.updateSnapshot({ openProjects: [this.tsconfig] });
    try {
      if (snapshot.getProjects().length === 0) throw new Error(`mdokf-ts7: the project ${this.tsconfig} did not open`);
      this.baseline = new Set(this.diagnostics(snapshot).map(diagnosticKey));
    } finally {
      snapshot.dispose();
    }
  }

  /** Every error of the whole program: syntactic then semantic. */
  diagnostics(snapshot) {
    const project = snapshot.getProjects()[0];
    return [...project.program.getSyntacticDiagnostics(), ...project.program.getSemanticDiagnostics()].filter(
      (diagnostic) => diagnostic.category === 1,
    );
  }

  textOf(file) {
    const key = overlayKey(file);
    if (this.overlay.has(key)) return this.overlay.get(key);
    if (!this.texts.has(key)) this.texts.set(key, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined);
    return this.texts.get(key);
  }

  /** Checks `mutatedText` in place of `file`: `{ status: "passed" }` or `{ status: "compile-error", reason }`. */
  check(file, mutatedText) {
    const absolute = path.resolve(this.root, file);
    const changed = slash(absolute);
    const key = overlayKey(absolute);
    this.overlay.set(key, mutatedText);
    let snapshot;
    try {
      snapshot = this.api.updateSnapshot({ fileChanges: { changed: [changed] } });
      const added = newDiagnostics(this.baseline, this.diagnostics(snapshot));
      if (added.length === 0) return { status: "passed" };
      return { status: "compile-error", reason: describeDiagnostic(added[0], (name) => this.textOf(name)) };
    } finally {
      snapshot?.dispose();
      this.overlay.delete(key);
      this.api.updateSnapshot({ fileChanges: { changed: [changed] } }).dispose();
    }
  }

  close() {
    this.api?.close();
  }
}

export class Ts7Checker {
  static inject = tokens(commonTokens.logger);

  constructor(log) {
    this.log = log;
  }

  async init() {
    this.session = new Ts7Session(process.cwd());
    await this.session.open();
    this.log.info("mdokf-ts7: typescript %s, project opened, %s baseline error(s)", this.session.version, this.session.baseline.size);
  }

  async check(mutants) {
    const results = {};
    for (const mutant of mutants) {
      const file = path.resolve(process.cwd(), mutant.fileName);
      const original = fs.readFileSync(file, "utf8");
      const checked = this.session.check(file, applyMutant(original, mutant.location, mutant.replacement));
      results[mutant.id] =
        checked.status === "passed" ? { status: CheckStatus.Passed } : { status: CheckStatus.CompileError, reason: checked.reason };
    }
    return results;
  }

  async dispose() {
    this.session?.close();
  }
}

export const strykerPlugins = [declareClassPlugin(PluginKind.Checker, "mdokf-ts7", Ts7Checker)];

/** The self-test: a temporary project, the real check, both outcomes. Throws on any failure. */
export async function selfTest(log = console.log) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mdokf-ts7-selftest-"));
  const session = new Ts7Session(root);
  try {
    fs.writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", types: [] }, include: ["*.ts"] }),
    );
    const source = "export function double(value: number): number {\n  return value * 2;\n}\n";
    const file = path.join(root, "double.ts");
    fs.writeFileSync(file, source);
    fs.writeFileSync(path.join(root, "use.ts"), 'import { double } from "./double.js";\nexport const four: number = double(2);\n');
    const started = performance.now();
    await session.open();
    log(`self-test: typescript ${session.version} loaded, tsgo spawned, project opened (${Math.round(performance.now() - started)} ms), ${session.baseline.size} baseline error(s)`);
    const broken = session.check(file, applyMutant(source, { start: { line: 1, column: 9 }, end: { line: 1, column: 18 } }, '"two"'));
    if (broken.status !== "compile-error") throw new Error(`self-test: a type-breaking replacement was reported as ${broken.status}`);
    log(`self-test: type-breaking replacement -> CompileError: ${broken.reason}`);
    const broken2 = session.check(file, applyMutant(source, { start: { line: 0, column: 39 }, end: { line: 0, column: 45 } }, "string"));
    if (broken2.status !== "compile-error") throw new Error(`self-test: a return type change (errors in two files) was reported as ${broken2.status}`);
    log(`self-test: return type change -> CompileError: ${broken2.reason}`);
    const valid = session.check(file, applyMutant(source, { start: { line: 1, column: 9 }, end: { line: 1, column: 18 } }, "value + value"));
    if (valid.status !== "passed") throw new Error(`self-test: a type-valid replacement was reported as ${valid.status}: ${valid.reason}`);
    log("self-test: type-valid replacement -> Passed");
    const again = session.check(file, source);
    if (again.status !== "passed") throw new Error(`self-test: the original text was reported as ${again.status}`);
  } finally {
    session.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.includes("--self-test")) {
    try {
      await selfTest();
      console.log("self-test: passed");
    } catch (error) {
      console.error(`self-test: FAILED: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error("usage: node scripts/mutation/ts7-checker.mjs --self-test");
    process.exit(2);
  }
}
