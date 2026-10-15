import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  disposeActivePreviewForTests,
  deserializePreviewPanelForTests,
  getActivePreviewForTests,
  getLivePreviewRolesForTests,
  PANEL_VIEW_TYPE,
} from "./extensionApi";

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

export async function run(): Promise<void> {
  const extensionRoot = path.resolve(__dirname, "../../..");
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  const restoredPanel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Restored preview",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
  );

  try {
    await deserializePreviewPanelForTests(restoredPanel, {
      documentId: document.uri.toString(),
      sourceFile: fixturePath,
      sourceLine: 4,
      scrollTop: 88,
      descriptionsCollapsed: true,
    });
    await waitFor("the restored serializer render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.status === "success"
        && preview.documentUri === document.uri.toString();
    });

    const restored = getActivePreviewForTests();
    assert.ok(restored);
    assert.equal(restored.sourceLine, 4);
    assert.equal(restored.scrollTop, 88);
    assert.match(restored.html, /Markdown OKF-Schema Studio Fixture/u);
    assert.match(restored.html, /"descriptionsCollapsed":true/u);
  } finally {
    disposeActivePreviewForTests();
    restoredPanel.dispose();
  }

  const missingPanel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Missing restored preview",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
  );
  try {
    await deserializePreviewPanelForTests(missingPanel, {
      documentId: vscode.Uri.file(path.join(extensionRoot, "test", "integration", "fixtures", "missing-restored.md")).toString(),
      sourceFile: path.join(extensionRoot, "test", "integration", "fixtures", "missing-restored.md"),
    });
    const missing = getActivePreviewForTests();
    assert.ok(missing);
    assert.equal(missing.status, "missing-source");
    assert.match(missing.html, /restored Markdown source is unavailable/u);
  } finally {
    disposeActivePreviewForTests();
    missingPanel.dispose();
  }

  // STAB-05: two restored panels coexist; each keeps a live session and only the newest follows.
  const firstPanel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Restored one",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
  );
  const secondPanel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Restored two",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
  );
  try {
    await deserializePreviewPanelForTests(firstPanel, {
      documentId: document.uri.toString(),
      sourceFile: fixturePath,
    });
    await deserializePreviewPanelForTests(secondPanel, {
      documentId: document.uri.toString(),
      sourceFile: fixturePath,
    });
    const roles = getLivePreviewRolesForTests();
    assert.equal(roles.length, 2, "both restored panels keep a live preview session");
    assert.deepEqual(roles.map((role) => role.followsActiveEditor), [false, true]);
    assert.doesNotMatch(roles[0].title, /^Studio/u, "the older panel is a fixed preview");
    assert.match(roles[1].title, /^Studio/u);
  } finally {
    disposeActivePreviewForTests();
    firstPanel.dispose();
    secondPanel.dispose();
  }
}
