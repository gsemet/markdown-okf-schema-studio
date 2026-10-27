import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import {
  PLANTUML_MAX_CONCURRENT_RENDERS,
  clearPlantUmlCacheForTests,
  renderPlantUmlDiagrams,
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../../src/core/render/plantUmlRenderer";

class FakeChild extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public readonly stdin = Object.assign(new EventEmitter(), { end: (): void => undefined });
  public kill(): boolean {
    return true;
  }
  public finish(): void {
    this.stdout.emit("data", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
    this.emit("close", 0, null);
  }
}

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
  resetPlantUmlProcessSpawnerForTests();
  clearPlantUmlCacheForTests();
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("a second render of the same source starts no process", async () => {
  const ws = workspace();
  let spawns = 0;
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      spawns += 1;
      const child = new FakeChild();
      process.nextTick(() => child.finish());
      return child as never;
    }) as never,
  });
  const options = { jarPath: ws.jarPath, workspaceRoot: ws.root, trusted: true };
  const source = "@startuml\nA -> B\n@enduml";
  try {
    const first = await renderPlantUmlDiagrams(html(source), options);
    const second = await renderPlantUmlDiagrams(html(source), options);
    assert.equal(spawns, 1);
    assert.deepEqual(second.diagrams, first.diagrams);

    await renderPlantUmlDiagrams(html("@startuml\nA -> C\n@enduml"), options);
    assert.equal(spawns, 2, "another source renders");

    // A replaced JAR is another invocation: its output is not served from the old entry.
    fs.writeFileSync(ws.jarPath, "another, longer fake JAR");
    await renderPlantUmlDiagrams(html(source), options);
    assert.equal(spawns, 3, "a changed JAR renders again");

    // Sources that read files are never cached.
    const include = "@startuml\n!include a.puml\n@enduml";
    await renderPlantUmlDiagrams(html(include), options);
    await renderPlantUmlDiagrams(html(include), options);
    assert.equal(spawns, 5);

    // A failed render is not cached.
    setPlantUmlProcessSpawnerForTests({
      spawn: (() => {
        spawns += 1;
        const child = new FakeChild();
        process.nextTick(() => child.emit("close", 1, null));
        return child as never;
      }) as never,
    });
    const bad = "@startuml\nbad\n@enduml";
    await renderPlantUmlDiagrams(html(bad), options);
    await renderPlantUmlDiagrams(html(bad), options);
    assert.equal(spawns, 7);
  } finally {
    fs.rmSync(ws.root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("at most two PlantUML processes run at once", async () => {
  const ws = workspace();
  const children: FakeChild[] = [];
  let running = 0;
  let peak = 0;
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      const child = new FakeChild();
      running += 1;
      peak = Math.max(peak, running);
      child.once("close", () => { running -= 1; });
      children.push(child);
      return child as never;
    }) as never,
  });
  const sources = [1, 2, 3, 4, 5].map((n) => `@startuml\nA -> B${n}\n@enduml`);
  try {
    const pending = renderPlantUmlDiagrams(html(...sources), {
      jarPath: ws.jarPath, workspaceRoot: ws.root, trusted: true,
    });
    let finished = 0;
    while (finished < sources.length) {
      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(children.length - finished <= PLANTUML_MAX_CONCURRENT_RENDERS);
      const child = children[finished];
      if (child && children.length - finished > 0) {
        child.finish();
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
