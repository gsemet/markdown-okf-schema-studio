import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as path from "node:path";
import { test } from "node:test";

import {
  renderPreviewDocument,
  type PreviewDocument,
} from "../../src/render/renderPipeline";
import {
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../src/render/plantUmlRenderer";
import { findElement, hasClass, parseHtml, textContent } from "./dom";

const workspaceRoot = path.resolve(__dirname, "../../..");
const source = "```plantuml\n@startuml\nAlice -> Bob: hello\n@enduml\n```\n";

function inlineDocument(text: string): PreviewDocument {
  return {
    uri: { scheme: "file", fsPath: path.join(workspaceRoot, "plantuml-engine.md") },
    languageId: "markdown",
    version: 1,
    getText: () => text,
  };
}

/** Counts spawns; a spawned fake process answers with a tiny SVG. */
function countingSpawner(): { spawns: string[] } {
  const record = { spawns: [] as string[] };
  setPlantUmlProcessSpawnerForTests({
    spawn: ((command: string) => {
      record.spawns.push(command);
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: Object.assign(new EventEmitter(), { end: () => undefined }),
        kill: () => true,
        exitCode: null,
        signalCode: null,
      });
      process.nextTick(() => {
        child.stdout.emit("data", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
        child.emit("close", 0, null);
      });
      return child;
    }) as never,
  });
  return record;
}

for (const trusted of [true, false]) {
  test(`the built-in PlantUML engine starts no process and leaves the diagram to the webview (${trusted ? "trusted" : "Restricted Mode"})`, async () => {
    const record = countingSpawner();
    try {
      const result = await renderPreviewDocument({
        document: inlineDocument(source),
        workspaceRoot,
        requestId: 1,
        isWorkspaceTrusted: () => trusted,
        allowUntrusted: true,
        plantUmlEngine: "builtin",
        plantUmlJarPath: "a-configured.jar",
      });
      assert.equal(result.plantUmlEngine, "builtin", "the page must load the bundled engine");
      const diagram = findElement(parseHtml(result.html), (element) => hasClass(element, "myst-plantuml-diagram"));
      assert.ok(diagram, "the diagram placeholder is kept for the webview engine");
      assert.equal(textContent(diagram).trim(), "@startuml\nAlice -> Bob: hello\n@enduml");
      const plantUml = await result.resolvePlantUml();
      assert.deepEqual(plantUml, { diagrams: [], diagnostics: [] });
      assert.deepEqual(record.spawns, [], "the built-in engine must never spawn PlantUML or Java");
    } finally {
      resetPlantUmlProcessSpawnerForTests();
    }
  });
}

test("useJar keeps the external pipeline: trusted it spawns, Restricted Mode refuses it without a process", async () => {
  const record = countingSpawner();
  try {
    const trusted = await renderPreviewDocument({
      document: inlineDocument(source),
      workspaceRoot,
      requestId: 2,
      isWorkspaceTrusted: () => true,
      plantUmlEngine: "jar",
    });
    assert.equal((await trusted.resolvePlantUml()).diagrams[0]?.status, "rendered");
    assert.deepEqual(record.spawns, ["plantuml"]);

    const untrusted = await renderPreviewDocument({
      document: inlineDocument(source),
      workspaceRoot,
      requestId: 3,
      isWorkspaceTrusted: () => false,
      allowUntrusted: true,
      plantUmlEngine: "jar",
    });
    const refused = await untrusted.resolvePlantUml();
    assert.equal(refused.diagrams[0]?.status, "unavailable");
    assert.match(refused.diagrams[0]?.message ?? "", /untrusted workspace/u);
    assert.deepEqual(record.spawns, ["plantuml"], "Restricted Mode must not start the JAR");
  } finally {
    resetPlantUmlProcessSpawnerForTests();
  }
});
