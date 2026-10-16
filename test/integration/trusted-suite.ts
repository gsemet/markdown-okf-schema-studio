import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
} from "./extensionApi";
import { run as runCheckboxToggle } from "./checkboxToggle.test";
import { run as runDirtySnapshots } from "./dirtySnapshots.test";
import { run as runGenericMarkdown } from "./genericMarkdown.test";
import { run as runPreviewEditing } from "./previewEditing.test";
import { run as runPreviewHistory } from "./previewHistory.test";
import { run as runRealInput } from "./realInput.test";
import { run as runLifecycle } from "./lifecycle.test";
import { run as runProjectFeatures } from "./projectFeatures.test";
import { run as runSerializer } from "./serializer.test";
import { run as runSourceMapping } from "./sourceMapping.test";
import { run as runStockCoexistence } from "./stockCoexistence.test";
import { run as runWorkspaceDisposal } from "./workspaceDisposal.test";
import { attribute, findElements, parseHtml } from "../rendering/dom";

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const workspaceRoot = extensionRoot;
  const fixturePath = path.join(extensionRoot, "test", "integration", "fixtures", "preview.md");
  const productionBuild = path.join(workspaceRoot, "_build");
  const beforeBuild = fs.existsSync(productionBuild) ? fs.readdirSync(productionBuild).sort() : [];
  const originalSource = fs.readFileSync(fixturePath, "utf8");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), document.uri.toString());
  assert.equal(document.languageId, "markdown");
  assert.ok(vscode.workspace.getWorkspaceFolder(document.uri));
  const studioExtension = vscode.extensions.getExtension("GaetanSemet.markdown-okf-schema-studio");
  assert.ok(studioExtension, "Markdown OKF-Schema Studio is not registered in the extension host");
  const dirtyMarker = "Dirty buffer only marker";
  const dirtyEdit = new vscode.WorkspaceEdit();
  dirtyEdit.insert(document.uri, document.positionAt(document.getText().length), `\n\n${dirtyMarker}\n`);
  assert.equal(await vscode.workspace.applyEdit(dirtyEdit), true);

  try {
    await vscode.commands.executeCommand(COMMAND_ID);
    assert.equal(studioExtension.isActive, true, "Markdown OKF-Schema Studio did not activate");
    const preview = getActivePreviewForTests();
    assert.ok(preview, "the trusted command did not create a preview panel");
    assert.match(preview.html, /admonition/iu);
    assert.match(preview.html, /math/iu);
    assert.match(preview.html, /Local preview image/u);
    assert.match(preview.html, /Content-Security-Policy/u);
    assert.match(preview.html, /nonce=/u);
    assert.match(preview.html, /data-sphinx-preview-accessibility/u);
    const stylesheets = findElements(parseHtml(preview.html), (element) =>
      element.tagName === "link" && attribute(element, "rel") === "stylesheet");
    assert.equal(stylesheets.length, 1);
    assert.ok(attribute(stylesheets[0], "data-studio-math-stylesheet") !== undefined);
    assert.match(attribute(stylesheets[0], "href") ?? "", /out\/bundle\/katex\/katex\.min\.css/u);
    assert.match(preview.html, /<style\b[^>]*data-sphinx-preview-accessibility/u);
    assert.match(preview.html, /data-sphinx-preview-toolbar/u);
    assert.match(preview.html, new RegExp(dirtyMarker, "u"));
    assert.doesNotMatch(preview.html, /unsafe-inline|default-src \*/iu);
    assert.equal(fs.readFileSync(fixturePath, "utf8"), originalSource);
    const afterBuild = fs.existsSync(productionBuild) ? fs.readdirSync(productionBuild).sort() : [];
    assert.deepEqual(afterBuild, beforeBuild, "preview changed the production _build directory");
  } finally {
    disposeActivePreviewForTests();
    const restoreEdit = new vscode.WorkspaceEdit();
    restoreEdit.replace(
      document.uri,
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
      originalSource,
    );
    await vscode.workspace.applyEdit(restoreEdit);
  }

  await runProjectFeatures();
  await runStockCoexistence();
  try {
    await runCheckboxToggle();
  } catch (error) {
    console.error("Checkbox toggle integration failed:", error);
    throw error;
  }
  try {
    await runRealInput();
  } catch (error) {
    console.error("Real-input integration failed:", error);
    throw error;
  }
  try {
    await runPreviewEditing();
  } catch (error) {
    console.error("Preview editing integration failed:", error);
    throw error;
  }
  await runPreviewHistory();
  await runGenericMarkdown();
  await runDirtySnapshots();
  await runSourceMapping();
  await runLifecycle();
  await runSerializer();
  await runWorkspaceDisposal();
}
