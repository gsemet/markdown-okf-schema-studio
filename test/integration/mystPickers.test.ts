import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { listCitationKeysForTests, listDocumentTargetsForTests } from "./extensionApi";

// @tests_req StRS-MDOKFSTUDIO-PALETTE-013
// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-178
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-183
/** The citation and reference lists: bounded workspace scan of `.bib` files, labels of the document. */
export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const directory = fs.mkdtempSync(path.join(extensionRoot, "test", "integration", "fixtures", "picker-"));
  const sourcePath = path.join(directory, "chapter.md");
  fs.writeFileSync(sourcePath, "(first)=\n# First\n\nText.\n\n(second)=\nMore text.\n");
  fs.writeFileSync(path.join(directory, "refs.bib"), "@article{smith2024,\n  title = {Smith title},\n}\n@book{zed,}\n");
  fs.mkdirSync(path.join(directory, "node_modules", "pkg"), { recursive: true });
  fs.writeFileSync(path.join(directory, "node_modules", "pkg", "hidden.bib"), "@misc{hiddenkey,}\n");
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const citations = await listCitationKeysForTests(document.uri.toString());
    const keys = citations.items.map((item) => item.key);
    assert.ok(keys.includes("smith2024") && keys.includes("zed"), `keys: ${keys.join(",")}`);
    assert.equal(keys.includes("hiddenkey"), false, "node_modules must be excluded from the scan");
    assert.equal(citations.items.find((item) => item.key === "smith2024")?.title, "Smith title");
    const targets = listDocumentTargetsForTests(document.uri.toString());
    assert.deepEqual(targets.items.map((item) => item.value), ["first", "second"]);
  } finally {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
