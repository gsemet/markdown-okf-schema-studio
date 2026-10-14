import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  injectPlantUmlDiagrams,
  renderPlantUmlDiagrams,
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../src/render/plantUmlRenderer";

class FakeChild extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public readonly stdin = {
    end: (value?: string | Uint8Array): void => {
      this.input = value?.toString() ?? "";
    },
  };
  public input = "";
  public killed = false;

  public kill(): boolean {
    this.killed = true;
    process.nextTick(() => this.emit("close", null, "SIGTERM"));
    return true;
  }
}

function createWorkspace(): { root: string; jarPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "markdown-okf-plantuml-test-"));
  const jarPath = path.join(root, "plantuml.jar");
  fs.writeFileSync(jarPath, "fake JAR");
  return { root, jarPath };
}

function diagramHtml(source = "@startuml\nAlice -> Bob: hello\n@enduml"): string {
  return `<figure class="myst-plantuml-figure" data-line="7"><div class="myst-plantuml-diagram">${source}</div></figure>`;
}

test("renders PlantUML through the configured external JAR and injects an image", async () => {
  const workspace = createWorkspace();
  const child = new FakeChild();
  let observed: { command: string; args: readonly string[]; cwd?: string } | undefined;
  setPlantUmlProcessSpawnerForTests({
    spawn: ((command: string, args: readonly string[], options: { cwd?: string }) => {
      observed = { command, args, cwd: options.cwd };
      process.nextTick(() => {
        child.stdout.emit("data", `PlantUML log\n<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>\n`);
        child.emit("close", 0, null);
      });
      return child as never;
    }) as never,
  });
  const source = "@startuml\nAlice -> Bob: hello\n@enduml";

  try {
    const result = await renderPlantUmlDiagrams(diagramHtml(source), {
      jarPath: "plantuml.jar",
      workspaceRoot: workspace.root,
      trusted: true,
    });

    assert.deepEqual(observed, {
      command: "java",
      args: ["-jar", workspace.jarPath, "-pipe", "-tsvg"],
      cwd: workspace.root,
    });
    assert.equal(child.input, source);
    assert.equal(result.diagnostics.length, 0);
    assert.deepEqual(result.diagrams[0], {
      status: "rendered",
      line: 7,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>',
    });

    const injected = injectPlantUmlDiagrams(diagramHtml(source), result.diagrams);
    assert.match(injected, /data-render-state="rendered"/u);
    assert.match(injected, /class="myst-plantuml-image"/u);
    assert.match(injected, /data:image\/svg\+xml;charset=utf-8,/u);
    assert.doesNotMatch(injected, /@startuml/u);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});

test("uses the PATH executable when no JAR is configured and reports missing commands", async () => {
  const workspace = createWorkspace();
  let spawnCount = 0;
  let observedCommand = "";
  let observedArgs: readonly string[] = [];
  setPlantUmlProcessSpawnerForTests({
    spawn: ((command: string, args: readonly string[]) => {
      spawnCount += 1;
      observedCommand = command;
      observedArgs = args;
      const child = new FakeChild();
      process.nextTick(() => child.emit("error", Object.assign(new Error("spawn plantuml ENOENT"), {
        code: "ENOENT",
      })));
      return child as never;
    }) as never,
  });

  try {
    const untrusted = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: false,
      jarPath: workspace.jarPath,
    });
    assert.equal(untrusted.diagrams[0]?.status, "unavailable");
    assert.match(untrusted.diagrams[0]?.message ?? "", /untrusted workspace/u);

    const unconfigured = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
    });
    assert.equal(unconfigured.diagrams[0]?.status, "unavailable");
    assert.equal(observedCommand, "plantuml");
    assert.deepEqual(observedArgs, ["-pipe", "-tsvg"]);
    assert.match(unconfigured.diagrams[0]?.message ?? "", /not found on PATH/u);

    const invalid = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: "missing.jar",
    });
    assert.equal(invalid.diagrams[0]?.status, "error");
    assert.match(invalid.diagrams[0]?.message ?? "", /could not be found/u);
    assert.equal(spawnCount, 1);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});

test("returns diagnostics for PlantUML process failures and malformed output", async () => {
  const workspace = createWorkspace();
  const children = [new FakeChild(), new FakeChild()];
  let index = 0;
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      const child = children[index++];
      process.nextTick(() => {
        if (child === children[0]) {
          child.stderr.emit("data", "syntax error");
          child.emit("close", 1, null);
        } else {
          child.stdout.emit("data", "not SVG");
          child.emit("close", 0, null);
        }
      });
      return child as never;
    }) as never,
  });

  try {
    const processFailure = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: workspace.jarPath,
    });
    assert.equal(processFailure.diagrams[0]?.status, "error");
    assert.match(processFailure.diagrams[0]?.message ?? "", /syntax error/u);
    assert.equal(processFailure.diagnostics[0]?.severity, "warning");

    const malformed = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: workspace.jarPath,
    });
    assert.equal(malformed.diagrams[0]?.status, "error");
    assert.match(malformed.diagrams[0]?.message ?? "", /did not return SVG/u);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});

test("cancels an active PlantUML process", async () => {
  const workspace = createWorkspace();
  const child = new FakeChild();
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => child as never) as never,
  });
  const controller = new AbortController();

  try {
    const render = renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: workspace.jarPath,
      signal: controller.signal,
    });
    controller.abort();
    const result = await render;
    assert.equal(child.killed, true);
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagrams[0]?.message ?? "", /canceled/u);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});
