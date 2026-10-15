import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import * as childProcess from "node:child_process";

import {
  injectPlantUmlDiagrams,
  resetPlantUmlTimeoutForTests,
  setPlantUmlTimeoutForTests,
  PLANTUML_TIMEOUT_MS,
  renderPlantUmlDiagrams,
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../src/render/plantUmlRenderer";

class FakeChild extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public readonly stdin = Object.assign(new EventEmitter(), {
    end: (value?: string | Uint8Array): void => {
      this.input = value?.toString() ?? "";
    },
  });
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

async function withFake<T>(
  spawn: (command: string, args: readonly string[], options: Record<string, unknown>) => unknown,
  run: (workspace: { root: string; jarPath: string }) => Promise<T>,
): Promise<T> {
  const workspace = createWorkspace();
  setPlantUmlProcessSpawnerForTests({ spawn: spawn as never });
  try {
    return await run(workspace);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
    resetPlantUmlTimeoutForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
}

const render = (workspace: { root: string; jarPath: string }, source?: string) =>
  renderPlantUmlDiagrams(diagramHtml(source), {
    workspaceRoot: workspace.root,
    trusted: true,
    jarPath: workspace.jarPath,
  });

test("a child that exits before reading stdin does not raise an uncaught exception", async () => {
  let uncaught = 0;
  const onUncaught = (): void => { uncaught += 1; };
  process.on("uncaughtException", onUncaught);
  try {
    await withFake(
      (_command, _args, options) => childProcess.spawn("/bin/sh", ["-c", "exit 0"], options as never),
      async (workspace) => {
        const result = await render(workspace, "@startuml\n" + "x".repeat(900 * 1024) + "\n@enduml");
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(uncaught, 0);
        assert.equal(result.diagrams.length, 1);
        assert.notEqual(result.diagrams[0]?.status, "rendered");
        assert.ok(result.diagnostics.length >= 1);
      },
    );
  } finally {
    process.off("uncaughtException", onUncaught);
  }
});

test("a stdin error settles the render with a diagnostic", async () => {
  const child = new FakeChild();
  await withFake(() => {
    process.nextTick(() => child.stdin.emit("error", new Error("write EPIPE")));
    return child;
  }, async (workspace) => {
    const result = await render(workspace);
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagnostics[0]?.message ?? "", /EPIPE/u);
  });
});

test("decodes a multibyte character split across stdout chunks", async () => {
  const child = new FakeChild();
  const bytes = Buffer.from('<svg><text>caf\u00e9</text></svg>');
  const split = bytes.indexOf(0xc3) + 1;
  await withFake(() => {
    process.nextTick(() => {
      child.stdout.emit("data", bytes.subarray(0, split));
      child.stdout.emit("data", bytes.subarray(split));
      child.emit("close", 0, null);
    });
    return child;
  }, async (workspace) => {
    const result = await render(workspace);
    assert.equal(result.diagrams[0]?.svg, "<svg><text>caf\u00e9</text></svg>");
  });
});

test("caps stderr at 64 KiB and notes the truncation", async () => {
  const child = new FakeChild();
  await withFake(() => {
    process.nextTick(() => {
      child.stderr.emit("data", Buffer.from("E".repeat(40 * 1024)));
      child.stderr.emit("data", Buffer.from("F".repeat(40 * 1024)));
      child.stderr.emit("data", Buffer.from("G".repeat(40 * 1024)));
      child.emit("close", 1, null);
    });
    return child;
  }, async (workspace) => {
    const message = (await render(workspace)).diagnostics[0]?.message ?? "";
    assert.match(message, /truncated/u);
    assert.ok(message.length < 64 * 1024 + 300, `message length ${message.length}`);
    assert.ok(message.includes("E".repeat(1000)));
    assert.ok(!message.includes("G"));
  });
});

test("kills a hung child at the timeout with a clear diagnostic", async () => {
  assert.equal(PLANTUML_TIMEOUT_MS, 30_000);
  setPlantUmlTimeoutForTests(30);
  const child = new FakeChild();
  await withFake(() => child, async (workspace) => {
    const result = await render(workspace);
    assert.equal(child.killed, true);
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagnostics[0]?.message ?? "", /did not finish within 0\.03 s/u);
  });
});

test("spawns detached and kills the process group on POSIX", async () => {
  if (process.platform === "win32") {
    return;
  }
  setPlantUmlTimeoutForTests(20);
  const child = Object.assign(new FakeChild(), { pid: 424242 });
  const originalKill = process.kill;
  const calls: Array<[number, string | number | undefined]> = [];
  process.kill = ((pid: number, sig?: string | number) => {
    calls.push([pid, sig]);
    return true;
  }) as typeof process.kill;
  let spawnOptions: Record<string, unknown> | undefined;
  try {
    await withFake((_c, _a, options) => {
      spawnOptions = options;
      return child;
    }, async (workspace) => {
      await render(workspace);
    });
  } finally {
    process.kill = originalKill;
  }
  assert.equal(spawnOptions?.detached, true);
  assert.deepEqual(spawnOptions?.stdio, ["pipe", "pipe", "pipe"]);
  assert.deepEqual(calls, [[-424242, "SIGTERM"]]);
  assert.equal(child.killed, false);
});

test("abort also kills the process group, falling back to child.kill on failure", async () => {
  if (process.platform === "win32") {
    return;
  }
  const child = Object.assign(new FakeChild(), { pid: 424243 });
  const originalKill = process.kill;
  const calls: number[] = [];
  process.kill = ((pid: number) => {
    calls.push(pid);
    throw new Error("ESRCH");
  }) as typeof process.kill;
  const controller = new AbortController();
  try {
    await withFake(() => child, async (workspace) => {
      const pending = renderPlantUmlDiagrams(diagramHtml(), {
        workspaceRoot: workspace.root,
        trusted: true,
        jarPath: workspace.jarPath,
        signal: controller.signal,
      });
      controller.abort();
      await pending;
    });
  } finally {
    process.kill = originalKill;
  }
  assert.deepEqual(calls, [-424243]);
  assert.equal(child.killed, true);
});

test("settles exactly once when close, error and timeout race", async () => {
  setPlantUmlTimeoutForTests(5);
  const child = new FakeChild();
  await withFake(() => {
    process.nextTick(() => {
      child.stdout.emit("data", "<svg></svg>");
      child.emit("close", 0, null);
      child.emit("error", new Error("late"));
      child.stdin.emit("error", new Error("late EPIPE"));
    });
    return child;
  }, async (workspace) => {
    const result = await render(workspace);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(result.diagrams[0]?.status, "rendered");
    assert.equal(result.diagnostics.length, 0);
    assert.equal(child.killed, false);
  });
});

test("does not group-kill a child that already exited", async () => {
  if (process.platform === "win32") {
    return;
  }
  setPlantUmlTimeoutForTests(20);
  const child = Object.assign(new FakeChild(), { pid: 424244, exitCode: 0 });
  const originalKill = process.kill;
  const calls: number[] = [];
  process.kill = ((pid: number) => {
    calls.push(pid);
    return true;
  }) as typeof process.kill;
  try {
    await withFake(() => child, async (workspace) => {
      await render(workspace);
    });
  } finally {
    process.kill = originalKill;
  }
  assert.deepEqual(calls, []);
});
