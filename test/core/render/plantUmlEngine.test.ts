import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import {
  renderPreviewDocument,
  type PreviewDocument,
} from "../../../src/core/render/renderPipeline";
import { findElement, hasClass, parseHtml, textContent } from "./dom";
import { fakeRunner, nodeFiles } from "./plantUmlFakes";

const workspaceRoot = path.resolve(__dirname, "../../../..");
const source = "```plantuml\n@startuml\nAlice -> Bob: hello\n@enduml\n```\n";

function inlineDocument(text: string): PreviewDocument {
  return {
    uri: { scheme: "file", fsPath: path.join(workspaceRoot, "plantuml-engine.md") },
    languageId: "markdown",
    version: 1,
    getText: () => text,
  };
}

const withHost = (runner: ReturnType<typeof fakeRunner>) => ({ plantUmlProcesses: runner, files: nodeFiles });
const started = (runner: ReturnType<typeof fakeRunner>): string[] => runner.calls.map((call) => call.command);

for (const trusted of [true, false]) {
  test(`the built-in PlantUML engine starts no process and leaves the diagram to the webview (${trusted ? "trusted" : "Restricted Mode"})`, async () => {
    const runner = fakeRunner();
    const result = await renderPreviewDocument({
      document: inlineDocument(source),
      workspaceRoot,
      requestId: 1,
      isWorkspaceTrusted: () => trusted,
      allowUntrusted: true,
      plantUmlEngine: "builtin",
      plantUmlJarPath: "a-configured.jar",
      ...withHost(runner),
    });
    assert.equal(result.plantUmlEngine, "builtin", "the page must load the bundled engine");
    const diagram = findElement(parseHtml(result.html), (element) => hasClass(element, "myst-plantuml-diagram"));
    assert.ok(diagram, "the diagram placeholder is kept for the webview engine");
    assert.equal(textContent(diagram).trim(), "@startuml\nAlice -> Bob: hello\n@enduml");
    const plantUml = await result.resolvePlantUml();
    assert.deepEqual(plantUml, { diagrams: [], diagnostics: [] });
    assert.deepEqual(started(runner), [], "the built-in engine must never spawn PlantUML or Java");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024#S3
// @tests_req SwRS-MDOKFSTUDIO-DIAG-024#S6
// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S4
test("useJar keeps the external pipeline: trusted it spawns, Restricted Mode refuses it without a process", async () => {
  const runner = fakeRunner();
  const trusted = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 2,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "jar",
    ...withHost(runner),
  });
  assert.equal((await trusted.resolvePlantUml()).diagrams[0]?.status, "rendered");
  assert.deepEqual(started(runner), ["plantuml"]);

  const untrusted = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 3,
    isWorkspaceTrusted: () => false,
    allowUntrusted: true,
    plantUmlEngine: "jar",
    ...withHost(runner),
  });
  const refused = await untrusted.resolvePlantUml();
  assert.equal(refused.diagrams[0]?.status, "unavailable");
  assert.match(refused.diagrams[0]?.message ?? "", /untrusted workspace/u);
  assert.deepEqual(started(runner), ["plantuml"], "Restricted Mode must not start the JAR");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S8
test("the jar engine on a host without a process runner reports the diagrams unavailable", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    files: nodeFiles,
    workspaceRoot,
    requestId: 4,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "jar",
  });
  const plantUml = await result.resolvePlantUml();
  assert.equal(plantUml.diagrams[0]?.status, "unavailable");
  assert.match(plantUml.diagrams[0]?.message ?? "", /host that can run programs/u);
});
