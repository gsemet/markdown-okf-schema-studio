import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
  sendPreviewMessageForTests,
} from "./extensionApi";

async function waitFor(description: string, predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function currentContext(document: vscode.TextDocument): {
  documentId: string;
  revision: number;
  requestId: number;
} {
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  assert.equal(preview.documentUri, document.uri.toString());
  assert.equal(preview.documentVersion, document.version);
  assert.ok(preview.requestId !== undefined);
  return {
    documentId: document.uri.toString(),
    revision: preview.documentVersion as number,
    requestId: preview.requestId,
  };
}

async function waitForCurrentPreview(document: vscode.TextDocument): Promise<void> {
  await waitFor("the generic preview to render the current document version", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString()
      && preview.phase === "ready"
      && preview.documentVersion === document.version
      && preview.requestId !== undefined
      && /<section\b[^>]*data-okf-properties/u.test(preview.html);
  });
}

async function saveGenericYamlField(
  document: vscode.TextDocument,
  fieldName: string,
  fieldValue: string,
  expectedSource: string,
  editId: string,
): Promise<void> {
  const result = sendPreviewMessageForTests({
    type: "previewFrontmatterSave",
    ...currentContext(document),
    editId,
    fieldName,
    fieldValueFormat: "yaml",
    fieldValue,
  });
  assert.ok(result, `the generic frontmatter save for ${fieldName} was rejected as stale`);
  await result;
  await waitFor(`generic YAML value for ${fieldName} to be written`, () =>
    document.getText().includes(expectedSource));
  await waitForCurrentPreview(document);
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const extensionRoot = path.resolve(__dirname, "../../..");
  const integrationFixtures = path.join(extensionRoot, "test", "integration", "fixtures");
  const visualFixtures = path.join(extensionRoot, "test", "visual", "fixtures");
  const directory = fs.mkdtempSync(path.join(integrationFixtures, "generic-markdown-"));
  const schemaDirectory = path.join(directory, "_schema");
  const filePath = path.join(directory, "skills", "local-tooling", "SKILL.md");
  const source = fs.readFileSync(path.join(visualFixtures, "SKILL.md"), "utf8");

  fs.mkdirSync(schemaDirectory, { recursive: true });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.copyFileSync(
    path.join(visualFixtures, "_schema", "swrs.schema.yaml"),
    path.join(schemaDirectory, "swrs.schema.yaml"),
  );
  fs.writeFileSync(filePath, source, "utf8");

  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    assert.equal(document.languageId, "skill");
    assert.ok(vscode.workspace.getWorkspaceFolder(document.uri));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("vscode.openWith", document.uri, EDITOR_VIEW_TYPE);
    await waitForCurrentPreview(document);

    const preview = getActivePreviewForTests();
    assert.ok(preview);
    assert.equal(preview.phase, "ready");
    const table = preview.html.match(/<section\b[^>]*data-okf-properties[\s\S]*?<\/section>/u)?.[0];
    assert.ok(table, "the custom editor did not render generic frontmatter");
    assert.match(
      table,
      /<thead><tr><th scope="col">Names<\/th><th scope="col">Values<\/th><\/tr><\/thead>/u,
    );
    assert.match(table, /data-okf-schema-found="false"/u);
    assert.match(table, /data-okf-field="allowed-tools"/u);
    assert.match(table, /data-okf-field="metadata"/u);
    const metadataRow = table.match(/<tr\b[^>]*data-okf-field="metadata"[\s\S]*?<\/tr>/u)?.[0];
    assert.ok(metadataRow);
    assert.match(
      metadataRow,
      /<pre class="okf-value-yaml" data-okf-value-display(?:="")?><code class="language-yaml">owner: Developer Experience\nreview:\n  required: false\n  attempts: 3\n<\/code><\/pre>/u,
    );
    assert.doesNotMatch(table, /<th scope="col">Description<\/th>|<select\b|<datalist\b|data-okf-enums=/u);
    assert.doesNotMatch(table, /class="okf-(?:error|warning)|data-okf-missing-required/u);

    await saveGenericYamlField(
      document,
      "status",
      "ready for review\n",
      "status: ready for review",
      "generic-skill-scalar",
    );
    await saveGenericYamlField(
      document,
      "allowed-tools",
      "- Read\n- Search\n",
      "  - Search",
      "generic-skill-list",
    );
    await saveGenericYamlField(
      document,
      "metadata",
      "owner: Platform Enablement\nreview:\n  required: false\n  attempts: 4\n",
      "  owner: Platform Enablement",
      "generic-skill-nested",
    );

    const refreshedTable = getActivePreviewForTests()?.html.match(
      /<section\b[^>]*data-okf-properties[\s\S]*?<\/section>/u,
    )?.[0];
    assert.ok(refreshedTable);
    assert.match(refreshedTable, /data-okf-schema-found="false"/u);
    assert.doesNotMatch(refreshedTable, /<select\b|<datalist\b|data-okf-enums=/u);
  } finally {
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
