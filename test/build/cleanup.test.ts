import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

test("cleanup recipes remove only their owned artifacts and are idempotent", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-cleanup-"));
  const generated = ["out/site/gallery.html", "out/reports/package/extension.vsix",
    "out/reports/e2e/screenshots/chapter.png",
    ".artifacts/capture.png", ".pytest_cache/state", "sphinx/__pycache__/conf.pyc",
    "src/nested/__pycache__/module.pyc",
    ".vscode-test/runtime/code", ".uv_cache/state", ".playwright-cli/session.yml",
    "node_modules/.cache/bundle/state"];
  const environment = [".env", "node_modules/dependency/index.js",
    "node_modules/dependency/__pycache__/index.pyc", ".venv/bin/python",
    ".venv/lib/python/__pycache__/dependency.pyc"];
  const preserved = ["src/extension.ts", "test/visual/fixtures/05-long-chapter.md",
    "images/gallery.json", "images/01-paragraph-blur-commit.png",
    "images/21-edit-hover.png", "images/38-edit-mode-remembered.png",
    "images/manual.png", "package-lock.json", "uv.lock", ".npmrc", "uv.toml",
    ".git/config", "personal-notes.md"];
  try {
    fs.copyFileSync(path.resolve(__dirname, "../../../justfile"), path.join(root, "justfile"));
    for (const filename of [...generated, ...environment, ...preserved]) {
      const target = path.join(root, filename);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, filename === ".env" ? "STUDIO_CLEANUP_TEST=1\n" : "fixture\n");
    }
    const run = (recipe: string): void => {
      const result = spawnSync("just", [recipe], { cwd: root, encoding: "utf8" });
      assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    };
    run("clean");
    run("clean");
    for (const filename of generated) assert.equal(fs.existsSync(path.join(root, filename)), false, filename);
    for (const filename of [...environment, ...preserved]) assert.ok(fs.existsSync(path.join(root, filename)), filename);
    run("mr-proper");
    run("mr-proper");
    for (const filename of [...generated, ...environment]) assert.equal(fs.existsSync(path.join(root, filename)), false, filename);
    for (const filename of preserved) assert.equal(fs.readFileSync(path.join(root, filename), "utf8"), "fixture\n", filename);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
