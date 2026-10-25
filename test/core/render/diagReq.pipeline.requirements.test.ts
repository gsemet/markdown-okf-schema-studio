/**
 * Requirement tests of the render pipeline for PlantUML: the jarPath setting that waits for useJar,
 * and the message of a diagram file after the include budget is exhausted. Each test asserts the
 * behaviour of the current code.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { resolvePlantUmlEngine } from "../../../src/core/configuration/plantUmlConfiguration";
import {
  INCLUDE_BUDGET_MAX_CHARS,
  renderMyst,
} from "../../../src/core/render/mystRenderer";
import {
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../../src/core/render/plantUmlRenderer";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, workspaceRoot } from "./mystFeaturesSupport";

const BUDGET_MESSAGE = "was not read: the include budget of this render is exhausted.";

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024
test("jarPath is ignored while useJar is off and used as soon as the JAR pipeline is chosen", async (t) => {
  t.after(resetPlantUmlProcessSpawnerForTests);
  let spawned = 0;
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      spawned += 1;
      throw new Error("no process may start");
    }) as never,
  });
  const markdown = "```plantuml\n@startuml\nA -> B\n@enduml\n```\n";
  const jarPath = "/missing/plantuml.jar";

  // useJar off: the engine choice is the built-in one whatever jarPath holds.
  assert.equal(resolvePlantUmlEngine({ useJar: false }, true), "builtin");
  const builtin = await renderPreviewDocument({
    document: inlineDocument(markdown),
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "builtin",
    plantUmlJarPath: jarPath,
  });
  assert.deepEqual(await builtin.resolvePlantUml(), { diagrams: [], diagnostics: [] }, "the JAR is neither checked nor started");
  assert.match(builtin.html, /myst-plantuml-diagram/u, "the page keeps the source for the built-in engine");
  assert.equal(spawned, 0);

  // useJar on: the same stored path is the one the JAR pipeline uses.
  assert.equal(resolvePlantUmlEngine({ useJar: true }, true), "jar");
  const jar = await renderPreviewDocument({
    document: inlineDocument(markdown),
    workspaceRoot,
    requestId: 2,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "jar",
    plantUmlJarPath: jarPath,
  });
  const resolved = await jar.resolvePlantUml();
  assert.equal(resolved.diagrams[0]?.status, "error");
  assert.match(resolved.diagrams[0]?.message ?? "", /The PlantUML JAR could not be found: \/missing\/plantuml\.jar/u);
  assert.equal(spawned, 0, "a missing JAR is refused before any process starts");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-068
test("after the include budget is exhausted every remaining diagram file shows the budget message, with one warning", async () => {
  const root = "/virtual";
  const files: Record<string, string> = {
    [`${root}/huge.md`]: "x".repeat(INCLUDE_BUDGET_MAX_CHARS + 1),
    [`${root}/a.puml`]: "@startuml\nA -> B\n@enduml\n",
    [`${root}/b.puml`]: "@startuml\nC -> D\n@enduml\n",
  };
  const main = "```{include} huge.md\n```\n\n```{uml} a.puml\n```\n\n```{plantuml} b.puml\n```\n";

  const result = await renderMyst(main, {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = `${root}/${request}`;
      void from;
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
  });

  const html = parseHtml(result.html);
  const messages = findElements(html, (element) => hasClass(element, "myst-plantuml-file-error"))
    .map((element) => textContent(element).trim());
  assert.deepEqual(messages, [
    `PlantUML file a.puml ${BUDGET_MESSAGE}`,
    `PlantUML file b.puml ${BUDGET_MESSAGE}`,
  ]);
  const budgetWarnings = result.diagnostics.filter((entry) => /include budget exhausted/iu.test(entry.message));
  assert.equal(budgetWarnings.length, 1);
  assert.equal(result.diagnostics.length, 1, "the placeholders add no warning of their own");
});
