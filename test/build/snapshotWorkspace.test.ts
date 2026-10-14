import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { createStageRoot, removeStageRoot, stageSnapshot } from "../../src/build/snapshotWorkspace";

function hash(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function documentAt(filePath: string, text: string, version = 1) {
  return {
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markdown",
    version,
    getText: () => text,
  };
}

test("stages the dirty active buffer and only its referenced inputs", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-snapshot-test-"));
  try {
    const chapterDirectory = path.join(workspaceRoot, "book", "chapters");
    const imageDirectory = path.join(workspaceRoot, "book", "images");
    const productionOutput = path.join(workspaceRoot, "_build", "html");
    fs.mkdirSync(chapterDirectory, { recursive: true });
    fs.mkdirSync(imageDirectory, { recursive: true });
    fs.mkdirSync(productionOutput, { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, "sphinx"), { recursive: true });
    fs.writeFileSync(path.join(imageDirectory, "local.png"), "image");
    fs.writeFileSync(path.join(chapterDirectory, "included.md"), "# On disk include\n");
    fs.writeFileSync(path.join(chapterDirectory, "unused.md"), "# Do not stage\n");
    const productionFile = path.join(productionOutput, "keep.html");
    fs.writeFileSync(productionFile, "production output\n");
    const activePath = path.join(chapterDirectory, "active.md");
    const onDisk = "# On disk\n";
    const dirtyText = "# Unsaved title\n\n```{include} included.md\n```\n\n![image](../images/local.png)\n";
    fs.writeFileSync(activePath, onDisk);
    const includePath = path.join(chapterDirectory, "included.md");
    const dirtyInclude = documentAt(includePath, "# Unsaved include\n", 4);
    const sourceHash = hash(activePath);
    const productionHash = hash(productionFile);

    const stage = stageSnapshot({
      document: documentAt(activePath, dirtyText, 7),
      workspaceRoot,
      requestId: 12,
      getDocument: (filePath) => fs.realpathSync(filePath) === fs.realpathSync(includePath)
        ? dirtyInclude
        : undefined,
    });
    try {
      assert.equal(stage.activeDocumentVersion, 7);
      assert.equal(stage.requestId, 12);
      assert.equal(fs.readFileSync(activePath, "utf8"), onDisk);
      assert.match(fs.readFileSync(stage.activeSourcePath, "utf8"), /Unsaved title/u);
      assert.match(
        fs.readFileSync(path.join(stage.sourceDirectory, "book", "chapters", "included.md"), "utf8"),
        /Unsaved include/u,
      );
      assert.ok(fs.existsSync(path.join(stage.sourceDirectory, "book", "images", "local.png")));
      assert.equal(fs.existsSync(path.join(stage.sourceDirectory, "book", "chapters", "unused.md")), false);
      assert.ok(stage.dependencies.includes(fs.realpathSync(includePath)));
      assert.ok(stage.dependencies.includes(fs.realpathSync(path.join(imageDirectory, "local.png"))));
      assert.equal(hash(activePath), sourceHash);
      assert.equal(hash(productionFile), productionHash);
      // The stage root is canonicalised so webview `localResourceRoots` match served files.
      assert.ok(stage.rootDirectory.startsWith(fs.realpathSync(os.tmpdir())));
      assert.equal(stage.rootDirectory, fs.realpathSync(stage.rootDirectory));
      assert.ok(!stage.rootDirectory.startsWith(workspaceRoot));
      assert.ok(stage.outputDirectory.startsWith(stage.rootDirectory));
      assert.ok(stage.doctreeDirectory.startsWith(stage.rootDirectory));
    } finally {
      const stagedRoot = stage.rootDirectory;
      stage.dispose();
      assert.equal(fs.existsSync(stagedRoot), false);
    }
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("reuses a stage root so doctrees and theme assets survive the next build", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-reuse-test-"));
  const stageRoot = createStageRoot();
  try {
    const activePath = path.join(workspaceRoot, "note.md");
    const staticDirectory = path.join(workspaceRoot, "sphinx", "_static");
    fs.mkdirSync(staticDirectory, { recursive: true });
    fs.writeFileSync(path.join(staticDirectory, "theme.css"), "body{}");
    fs.writeFileSync(activePath, "# First\n\n![image](first.png)\n");
    fs.writeFileSync(path.join(workspaceRoot, "first.png"), "first");

    const first = stageSnapshot({
      document: documentAt(activePath, fs.readFileSync(activePath, "utf8")),
      workspaceRoot,
      requestId: 1,
      rootDirectory: stageRoot,
    });
    assert.equal(first.rootDirectory, stageRoot);
    const themeAsset = path.join(first.sourceDirectory, "_static", "theme.css");
    assert.ok(fs.existsSync(themeAsset));
    assert.ok(fs.existsSync(path.join(first.sourceDirectory, "first.png")));
    // A reused root belongs to the preview, not to a single build.
    first.dispose();
    assert.ok(fs.existsSync(stageRoot));

    fs.writeFileSync(path.join(first.doctreeDirectory ?? stageRoot, ".marker"), "cached");
    const second = stageSnapshot({
      document: documentAt(activePath, "# Second\n", 2),
      workspaceRoot,
      requestId: 2,
      rootDirectory: stageRoot,
    });
    assert.equal(second.rootDirectory, stageRoot);
    assert.match(fs.readFileSync(second.activeSourcePath, "utf8"), /Second/u);
    // Stale staged inputs are cleared, copied theme assets and doctrees are not.
    assert.equal(fs.existsSync(path.join(second.sourceDirectory, "first.png")), false);
    assert.ok(fs.existsSync(themeAsset));
    assert.ok(fs.existsSync(path.join(second.doctreeDirectory ?? stageRoot, ".marker")));
    second.dispose();

    removeStageRoot(stageRoot);
    assert.equal(fs.existsSync(stageRoot), false);
  } finally {
    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("reports missing referenced inputs with source line diagnostics", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-missing-input-test-"));
  try {
    const activePath = path.join(workspaceRoot, "note.md");
    fs.mkdirSync(path.join(workspaceRoot, "sphinx"), { recursive: true });
    fs.writeFileSync(activePath, "# Note\n\n```{include} missing.md\n```\n");
    const stage = stageSnapshot({
      document: documentAt(activePath, fs.readFileSync(activePath, "utf8")),
      workspaceRoot,
      requestId: 1,
    });
    try {
      const diagnostic = stage.diagnostics.find((entry) => entry.code === "unavailable-input");
      assert.ok(diagnostic);
      assert.equal(diagnostic.file, activePath);
      assert.equal(diagnostic.line, 3);
      assert.match(diagnostic.message, /unavailable/u);
      assert.ok(stage.dependencies.includes(path.join(workspaceRoot, "missing.md")));
    } finally {
      stage.dispose();
    }
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});
