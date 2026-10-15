import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

test("packaging pins Marketplace URLs to the release without editing the README", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-marketplace-"));
  const projectRoot = path.resolve(__dirname, "../../..");
  const readme = "[![Preview](images/readme/preview.png)](images/readme/preview.png)\n";
  try {
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "node_modules/@vscode/vsce"), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, "scripts/package-extension.mjs"), path.join(root, "scripts/package-extension.mjs"));
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
      version: "1.2.3", repository: { url: "https://github.com/example/studio.git" },
    }));
    fs.writeFileSync(path.join(root, "README.md"), readme);
    fs.writeFileSync(path.join(root, "node_modules/@vscode/vsce/vsce"), "console.log(JSON.stringify(process.argv.slice(2)));\n");
    const result = spawnSync(process.execPath, ["scripts/package-extension.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [
      "package", "--out", "out/reports/package/markdown-okf-schema-studio.vsix", "--skip-license",
      "--baseContentUrl", "https://github.com/example/studio/blob/v1.2.3/",
      "--baseImagesUrl", "https://media.githubusercontent.com/media/example/studio/v1.2.3/",
    ]);
    assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), readme);
    assert.ok(fs.existsSync(path.join(root, "out/reports/package")));
    fs.writeFileSync(path.join(root, "node_modules/@vscode/vsce/vsce"), "process.exitCode = 7;\n");
    const failed = spawnSync(process.execPath, ["scripts/package-extension.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(failed.status, 7);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
