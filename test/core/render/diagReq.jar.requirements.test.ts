/**
 * Requirement tests of the PlantUML JAR pipeline (`plantUmlRenderer.ts`): result order, one process
 * per diagram, spawn failures, size limits and failure isolation. A scripted process spawner
 * replaces the real one; each test asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import {
  injectPlantUmlDiagrams,
  clearPlantUmlCacheForTests,
  renderPlantUmlDiagrams,
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../../src/core/render/plantUmlRenderer";

class FakeChild extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public readonly stdin = Object.assign(new EventEmitter(), {
    end: (value?: string | Uint8Array): void => {
      this.input = value?.toString() ?? "";
      this.onInput?.(this.input);
    },
  });
  public input = "";
  public killed = false;
  public onInput?: (input: string) => void;

  public kill(): boolean {
    this.killed = true;
    process.nextTick(() => this.emit("close", null, "SIGTERM"));
    return true;
  }
}

const roots: string[] = [];

function workspace(): { root: string; jarPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "diag-req-jar-"));
  roots.push(root);
  const jarPath = path.join(root, "plantuml.jar");
  fs.writeFileSync(jarPath, "fake JAR");
  return { root, jarPath };
}

afterEach(() => {
  resetPlantUmlProcessSpawnerForTests();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function figure(source: string, line: number): string {
  return `<figure class="myst-plantuml-figure" data-line="${line}">`
    + `<div class="myst-plantuml-diagram">${source}</div></figure>`;
}

const svgFor = (label: string): string => `<svg xmlns="http://www.w3.org/2000/svg"><title>${label}</title></svg>`;

/** Installs a spawner whose children answer through `answer(input, child)`. */
function scriptSpawner(
  answer: (input: string, child: FakeChild, index: number) => void,
): { spawned: () => number } {
  let count = 0;
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      const child = new FakeChild();
      const index = count;
      count += 1;
      child.onInput = (input) => answer(input, child, index);
      return child as never;
    }) as never,
  });
  return { spawned: () => count };
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-105
test("JAR results come back in document order with the source line of their diagram", async () => {
  const { root, jarPath } = workspace();
  const delays: Record<string, number> = { first: 30, second: 5, third: 15 };
  scriptSpawner((input, child) => {
    setTimeout(() => {
      child.stdout.emit("data", svgFor(input));
      child.emit("close", 0, null);
    }, delays[input]);
  });
  const html = figure("first", 3) + figure("second", 9) + figure("third", 15);

  const result = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true });

  assert.deepEqual(result.diagrams.map((item) => item.line), [3, 9, 15]);
  assert.deepEqual(result.diagrams.map((item) => item.svg), [svgFor("first"), svgFor("second"), svgFor("third")]);

  const single = await renderPlantUmlDiagrams(figure("second", 21), { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(single.diagrams.map((item) => [item.status, item.line]), [["rendered", 21]]);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("the JAR pipeline starts one process per diagram before any of them finishes", async () => {
  const { root, jarPath } = workspace();
  const pending: FakeChild[] = [];
  const spawner = scriptSpawner((_input, child) => {
    pending.push(child);
    if (pending.length === 3) {
      assert.equal(spawner.spawned(), 3, "all processes exist before the first one answers");
      for (const item of pending) {
        item.stdout.emit("data", svgFor("x"));
        item.emit("close", 0, null);
      }
    }
  });
  const html = figure("a", 1) + figure("b", 2) + figure("c", 3);

  const result = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true });

  assert.equal(spawner.spawned(), 3);
  assert.equal(result.diagrams.length, 3);

  const none = scriptSpawner(() => assert.fail("no process may start"));
  const empty = await renderPlantUmlDiagrams("<p>text</p>", { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(empty, { diagrams: [], diagnostics: [] });
  assert.equal(none.spawned(), 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089
test("a spawn call that throws is reported on the diagram like any other failure", async () => {
  const { root } = workspace();
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      throw new Error("cannot fork");
    }) as never,
  });
  const thrown = await renderPlantUmlDiagrams(figure("@startuml\n@enduml", 4), {
    workspaceRoot: root,
    trusted: true,
  });
  assert.deepEqual(thrown.diagrams, [{ status: "error", message: "cannot fork", line: 4 }]);
  assert.deepEqual(thrown.diagnostics, [{ message: "cannot fork", severity: "warning", line: 4 }]);

  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      throw Object.assign(new Error("spawn plantuml ENOENT"), { code: "ENOENT" });
    }) as never,
  });
  const missing = await renderPlantUmlDiagrams(figure("@startuml\n@enduml", 4), {
    workspaceRoot: root,
    trusted: true,
  });
  assert.equal(missing.diagrams[0]?.status, "unavailable");
  assert.match(missing.diagrams[0]?.message ?? "", /^PlantUML executable "plantuml" was not found on PATH\./u);
});

test("a missing java is reported like a missing command; other spawn errors keep their text", async () => {
  const { root, jarPath } = workspace();
  scriptSpawner((_input, child) => {
    process.nextTick(() => child.emit("error", Object.assign(new Error("spawn java ENOENT"), { code: "ENOENT" })));
  });
  const absent = await renderPlantUmlDiagrams(figure("a", 2), { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(absent.diagrams, [{
    status: "unavailable",
    message: 'PlantUML executable "java" was not found on PATH. '
      + "Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path.",
    line: 2,
  }]);

  scriptSpawner((_input, child) => {
    process.nextTick(() => child.emit("error", Object.assign(new Error("spawn java EACCES"), { code: "EACCES" })));
  });
  const denied = await renderPlantUmlDiagrams(figure("a", 2), { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(denied.diagrams, [{ status: "error", message: "spawn java EACCES", line: 2 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("a diagram text over 1 MiB is refused without a process, a text of exactly 1 MiB is rendered", async () => {
  const { root, jarPath } = workspace();
  const spawner = scriptSpawner((_input, child) => {
    child.stdout.emit("data", svgFor("ok"));
    child.emit("close", 0, null);
  });
  const limit = 1024 * 1024;

  const over = await renderPlantUmlDiagrams(figure("x".repeat(limit + 1), 5), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
  });
  assert.deepEqual(over.diagrams, [{
    status: "error",
    message: "PlantUML source exceeds the 1 MiB preview limit.",
    line: 5,
  }]);
  assert.equal(spawner.spawned(), 0);

  const at = await renderPlantUmlDiagrams(figure("x".repeat(limit), 5), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
  });
  assert.equal(at.diagrams[0]?.status, "rendered");
  assert.equal(spawner.spawned(), 1);
});

test("an output over 8 MiB stops the process; an output of exactly 8 MiB is accepted", async () => {
  const { root, jarPath } = workspace();
  const limit = 8 * 1024 * 1024;
  const children: FakeChild[] = [];
  scriptSpawner((input, child) => {
    children.push(child);
    const svg = svgFor("big");
    const length = input === "over" ? limit + 1 : limit;
    child.stdout.emit("data", Buffer.from(" ".repeat(length - svg.length) + svg));
    if (input === "exact") {
      child.emit("close", 0, null);
    }
  });

  const over = await renderPlantUmlDiagrams(figure("over", 6), { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(over.diagrams, [{
    status: "error",
    message: "PlantUML SVG output exceeds the 8 MiB preview limit.",
    line: 6,
  }]);
  assert.equal(children[0]?.killed, true);

  const exact = await renderPlantUmlDiagrams(figure("exact", 6), { jarPath, workspaceRoot: root, trusted: true });
  assert.equal(exact.diagrams[0]?.status, "rendered");
  assert.equal(children[1]?.killed, false);
});

test("one failing JAR diagram leaves the pictures of the other diagrams intact", async () => {
  const { root, jarPath } = workspace();
  scriptSpawner((input, child) => {
    process.nextTick(() => {
      if (input === "bad") {
        child.stderr.emit("data", "Syntax Error");
        child.emit("close", 1, null);
        return;
      }
      child.stdout.emit("data", svgFor(input));
      child.emit("close", 0, null);
    });
  });
  const html = figure("one", 1) + figure("bad", 2) + figure("three", 3);

  const result = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(result.diagrams.map((item) => item.status), ["rendered", "error", "rendered"]);
  assert.equal(result.diagnostics.length, 1);

  const injected = injectPlantUmlDiagrams(html, result.diagrams);
  assert.equal(injected.match(/class="myst-plantuml-image"/gu)?.length, 2);
  assert.match(injected, /<p class="myst-plantuml-error">PlantUML exited with code 1: Syntax Error<\/p>/u);

  scriptSpawner((_input, child) => {
    process.nextTick(() => {
      child.stderr.emit("data", "boom");
      child.emit("close", 2, null);
    });
  });
  clearPlantUmlCacheForTests(); // the first pass was cached; this pass must meet the new failing process
  const failed = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true });
  assert.deepEqual(failed.diagrams.map((item) => item.status), ["error", "error", "error"]);
});

test("a jarPath naming a directory is refused on every diagram before any process starts", async () => {
  const { root } = workspace();
  const directory = path.join(root, "jars");
  fs.mkdirSync(directory);
  const spawner = scriptSpawner(() => assert.fail("no process may start"));

  const result = await renderPlantUmlDiagrams(figure("a", 1) + figure("b", 2), {
    jarPath: directory,
    workspaceRoot: root,
    trusted: true,
  });
  const message = `The PlantUML JAR path is not a file: ${directory}`;
  assert.deepEqual(result.diagrams, [
    { status: "error", message, line: 1 },
    { status: "error", message, line: 2 },
  ]);
  assert.equal(result.diagnostics.length, 2);
  assert.equal(spawner.spawned(), 0);
});
