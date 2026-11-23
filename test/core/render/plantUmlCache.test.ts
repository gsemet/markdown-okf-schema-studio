import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import {
  PLANTUML_MAX_CONCURRENT_RENDERS,
  clearPlantUmlCacheForTests,
  renderPlantUmlDiagrams,
} from "../../../src/core/render/plantUmlRenderer";
import type { ProcessResult } from "../../../src/host-api/processRunner";
import { TINY_SVG, exited, fakeRunner, hostOf } from "./plantUmlFakes";

function workspace(): { root: string; jarPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "markdown-okf-plantuml-cache-"));
  const jarPath = path.join(root, "plantuml.jar");
  fs.writeFileSync(jarPath, "fake JAR");
  return { root, jarPath };
}

function html(...sources: string[]): string {
  return sources.map((source) => `<div class="myst-plantuml-diagram">${source}</div>`).join("");
}

afterEach(() => {
  clearPlantUmlCacheForTests();
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("a second render of the same source starts no process", async () => {
  const ws = workspace();
  const runner = fakeRunner();
  const options = { jarPath: ws.jarPath, workspaceRoot: ws.root, trusted: true, ...hostOf(runner) };
  const source = "@startuml\nA -> B\n@enduml";
  try {
    const first = await renderPlantUmlDiagrams(html(source), options);
    const second = await renderPlantUmlDiagrams(html(source), options);
    assert.equal(runner.calls.length, 1);
    assert.deepEqual(second.diagrams, first.diagrams);

    await renderPlantUmlDiagrams(html("@startuml\nA -> C\n@enduml"), options);
    assert.equal(runner.calls.length, 2, "another source renders");

    // A replaced JAR is another invocation: its output is not served from the old entry.
    fs.writeFileSync(ws.jarPath, "another, longer fake JAR");
    await renderPlantUmlDiagrams(html(source), options);
    assert.equal(runner.calls.length, 3, "a changed JAR renders again");

    // Sources that read files are never cached.
    const include = "@startuml\n!include a.puml\n@enduml";
    await renderPlantUmlDiagrams(html(include), options);
    await renderPlantUmlDiagrams(html(include), options);
    assert.equal(runner.calls.length, 5);

    // A failed render is not cached.
    const failing = fakeRunner(() => exited("", 1));
    const failingOptions = { ...options, ...hostOf(failing) };
    const bad = "@startuml\nbad\n@enduml";
    await renderPlantUmlDiagrams(html(bad), failingOptions);
    await renderPlantUmlDiagrams(html(bad), failingOptions);
    assert.equal(failing.calls.length, 2);
  } finally {
    fs.rmSync(ws.root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("at most two PlantUML processes run at once", async () => {
  const ws = workspace();
  const finishers: Array<() => void> = [];
  let running = 0;
  let peak = 0;
  const runner = fakeRunner(() => new Promise<ProcessResult>((resolve) => {
    running += 1;
    peak = Math.max(peak, running);
    finishers.push(() => {
      running -= 1;
      resolve(exited(TINY_SVG));
    });
  }));
  const sources = [1, 2, 3, 4, 5].map((n) => `@startuml\nA -> B${n}\n@enduml`);
  try {
    const pending = renderPlantUmlDiagrams(html(...sources), {
      jarPath: ws.jarPath, workspaceRoot: ws.root, trusted: true, ...hostOf(runner),
    });
    let finished = 0;
    while (finished < sources.length) {
      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(finishers.length - finished <= PLANTUML_MAX_CONCURRENT_RENDERS);
      const finish = finishers[finished];
      if (finish) {
        finish();
        finished += 1;
      }
    }
    const result = await pending;
    assert.equal(PLANTUML_MAX_CONCURRENT_RENDERS, 2);
    assert.equal(peak, 2);
    assert.equal(result.diagrams.every((diagram) => diagram.status === "rendered"), true);
  } finally {
    fs.rmSync(ws.root, { recursive: true, force: true });
  }
});
