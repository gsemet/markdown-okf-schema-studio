import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  resetRenderHooksForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
} from "./extensionApi";

function fileHash(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function treeHash(rootDirectory: string): string {
  const hash = createHash("sha256");
  if (!fs.existsSync(rootDirectory)) {
    return hash.update("missing").digest("hex");
  }
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = path.join(directory, entry.name);
      const relativePath = path.relative(rootDirectory, entryPath);
      hash.update(relativePath);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        hash.update(fs.readFileSync(entryPath));
      }
    }
  };
  walk(rootDirectory);
  return hash.digest("hex");
}

async function waitFor(
  description: string,
  predicate: () => boolean,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function replaceDocument(document: vscode.TextDocument, text: string): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    text,
  );
  return edit;
}

// @tests_req StRS-MDOKFSTUDIO-LIFE-005
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const workspaceRoot = extensionRoot;
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const otherFixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview-other.md");
  const refreshFixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview-refresh.md");
  const productionOutput = path.join(workspaceRoot, "_build");
  const originalSource = fs.readFileSync(fixturePath, "utf8");
  const originalRefreshFixture = fs.readFileSync(refreshFixturePath, "utf8");
  const sourceHashBefore = fileHash(fixturePath);
  const productionHashBefore = treeHash(productionOutput);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  const otherDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(otherFixturePath));

  try {
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    const dirtyMarker = "Dirty snapshot marker";
    const dirtyText = `${originalSource}\n\n${dirtyMarker}\n`;
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, dirtyText)), true);
    const initialStartedAt = performance.now();
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the initial dirty snapshot", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes(dirtyMarker);
    });
    const initialPreview = getActivePreviewForTests();
    assert.ok(initialPreview);
    assert.match(initialPreview.html, new RegExp(dirtyMarker, "u"));
    assert.equal(fileHash(fixturePath), sourceHashBefore);
    assert.equal(treeHash(productionOutput), productionHashBefore);
    const initialLatencyMs = performance.now() - initialStartedAt;

    await vscode.window.showTextDocument(otherDocument, vscode.ViewColumn.One);
    await waitFor("the selected second Markdown file", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes("Second fixture marker");
    });

    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitFor("the original dirty document to become active", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes(dirtyMarker);
    });

    const editMarker = "Normal edit latency marker";
    const editStartedAt = performance.now();
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, `${originalSource}\n\n${editMarker}\n`)), true);
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-039
    await waitFor("the normal edited snapshot", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes(editMarker);
    });
    const editLatencyMs = performance.now() - editStartedAt;

    const includeText = `${originalSource}\n\n\`\`\`{include} preview-refresh.md\n\`\`\`\n`;
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, includeText)), true);
    await waitFor("the initial referenced include", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes("Initial include marker");
    });
    const includeRequestId = getActivePreviewForTests()?.requestId;
    fs.writeFileSync(refreshFixturePath, "# Refreshable include\n\nUpdated include marker\n", "utf8");
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-044
    await waitFor("the changed referenced include", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.html.includes("Updated include marker")
        && preview.requestId !== undefined
        && includeRequestId !== undefined
        && preview.requestId > includeRequestId;
    });

    setRenderDelayForTests(500);
    const obsoleteMarker = "Obsolete snapshot marker";
    const obsoleteText = `${originalSource}\n\n${obsoleteMarker}\n`;
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, obsoleteText)), true);
    await waitFor("the obsolete snapshot build to start", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "building" && preview.documentVersion === document.version;
    });
    const obsoleteRequestId = getActivePreviewForTests()?.requestId;
    const newestMarker = "Newest snapshot marker";
    const newestText = `${originalSource}\n\n${newestMarker}\n`;
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, newestText)), true);
    await waitFor("the newest snapshot result", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes(newestMarker);
    });
    const newestPreview = getActivePreviewForTests();
    assert.ok(newestPreview);
    assert.match(newestPreview.html, new RegExp(newestMarker, "u"));
    assert.doesNotMatch(newestPreview.html, new RegExp(obsoleteMarker, "u"));
    assert.ok(newestPreview.requestId !== undefined && obsoleteRequestId !== undefined);
    assert.ok(newestPreview.requestId > obsoleteRequestId);

    setRenderDelayForTests(0);
    const invalidText = `${originalSource}\n\n\`\`\`{definitely-not-a-directive}\ninvalid\n\`\`\`\n`;
    setRenderOverrideForTests(async (source) => {
      if (source.includes("definitely-not-a-directive")) {
        throw new Error("Simulated render failure for the dirty-snapshot test.");
      }
      return { html: `<p>${newestMarker}</p>` };
    });
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, invalidText)), true);
    await waitFor("the failed snapshot result", () => getActivePreviewForTests()?.phase === "failed");
    const stalePreview = getActivePreviewForTests();
    assert.ok(stalePreview);
    // @tests_req SwRS-MDOKFSTUDIO-LIFE-049
    assert.match(stalePreview.html, /Preview is stale/iu);
    assert.match(stalePreview.html, /Simulated render failure for the dirty-snapshot test/u);
    assert.match(stalePreview.html, new RegExp(newestMarker, "u"));

    setRenderOverrideForTests(undefined);
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, newestText)), true);
    await waitFor("recovery after the failing directive", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes(newestMarker);
    });
    assert.equal(fileHash(fixturePath), sourceHashBefore);
    assert.equal(treeHash(productionOutput), productionHashBefore);
    console.log(
      `[Task 02] measured initial command-to-render=${Math.round(initialLatencyMs)}ms; `
      + `normal edit-to-render=${Math.round(editLatencyMs)}ms; delayed obsolete build=500ms`,
    );
  } finally {
    resetRenderHooksForTests();
    disposeActivePreviewForTests();
    fs.writeFileSync(refreshFixturePath, originalRefreshFixture, "utf8");
    if (document.getText() !== originalSource) {
      await vscode.workspace.applyEdit(replaceDocument(document, originalSource));
    }
  }
}
