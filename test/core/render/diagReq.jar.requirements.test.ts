/**
 * Requirement tests of the PlantUML JAR pipeline (`plantUmlRenderer.ts`): result order, one process
 * per diagram, spawn failures, size limits and failure isolation. A scripted process runner
 * replaces the real one; each test asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import {
  injectPlantUmlDiagrams,
  clearPlantUmlCacheForTests,
  renderPlantUmlDiagrams,
} from "../../../src/core/render/plantUmlRenderer";
import type { ProcessResult } from "../../../src/host-api/processRunner";
import { exited, fakeRunner, hostOf, missingProgram, type FakeProcessRunner, type RunCall } from "./plantUmlFakes";

const roots: string[] = [];

function workspace(): { root: string; jarPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "diag-req-jar-"));
  roots.push(root);
  const jarPath = path.join(root, "plantuml.jar");
  fs.writeFileSync(jarPath, "fake JAR");
  return { root, jarPath };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function figure(source: string, line: number): string {
  return `<figure class="myst-plantuml-figure" data-line="${line}">`
    + `<div class="myst-plantuml-diagram">${source}</div></figure>`;
}

const svgFor = (label: string): string => `<svg xmlns="http://www.w3.org/2000/svg"><title>${label}</title></svg>`;

/** A runner whose programs answer through `answer(input, call)`; the input is the diagram text. */
function scripted(answer: (input: string, call: RunCall) => ProcessResult | Promise<ProcessResult>): FakeProcessRunner {
  return fakeRunner((call) => answer(call.options.input ?? "", call));
}

const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

// @tests_req SwRS-MDOKFSTUDIO-DIAG-105#S1
test("JAR results come back in document order with the source line of their diagram", async () => {
  const { root, jarPath } = workspace();
  const delays: Record<string, number> = { first: 30, second: 5, third: 15 };
  const runner = scripted(async (input) => {
    await wait(delays[input] ?? 0);
    return exited(svgFor(input));
  });
  const html = figure("first", 3) + figure("second", 9) + figure("third", 15);

  const result = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true, ...hostOf(runner) });

  assert.deepEqual(result.diagrams.map((item) => item.line), [3, 9, 15]);
  assert.deepEqual(result.diagrams.map((item) => item.svg), [svgFor("first"), svgFor("second"), svgFor("third")]);

  const single = await renderPlantUmlDiagrams(figure("second", 21), { jarPath, workspaceRoot: root, trusted: true, ...hostOf(runner) });
  assert.deepEqual(single.diagrams.map((item) => [item.status, item.line]), [["rendered", 21]]);
});

// The renderer stats the JAR through the file port before it starts a process, so one turn of the loop is not enough.
const settle = (): Promise<void> => wait(50);

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084#S8
test("the JAR pipeline runs one process per diagram, at most 2 at once, results in document order", async () => {
  const { root, jarPath } = workspace();
  clearPlantUmlCacheForTests();
  const running = new Map<string, (result: ProcessResult) => void>();
  const started: string[] = [];
  let peak = 0;
  const runner = scripted((input) => new Promise<ProcessResult>((resolve) => {
    running.set(input, resolve);
    started.push(input);
    peak = Math.max(peak, running.size);
  }));
  const finish = (name: string): void => {
    const resolve = running.get(name);
    assert.ok(resolve, `a process runs for ${name}`);
    running.delete(name);
    resolve(exited(svgFor(name)));
  };
  const html = figure("a", 1) + figure("b", 2) + figure("c", 3);
  const begin = Date.now();

  const rendering = renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true, ...hostOf(runner) });
  await settle();
  assert.deepEqual(started, ["a", "b"], "the third diagram waits while 2 processes run");
  finish("b");
  await settle();
  assert.deepEqual(started, ["a", "b", "c"], "the third diagram starts when one process finishes");
  finish("c");
  finish("a");
  const result = await rendering;

  assert.equal(runner.calls.length, 3);
  assert.equal(peak, 2);
  assert.deepEqual(result.diagrams.map((item) => [item.line, item.svg]), [
    [1, svgFor("a")],
    [2, svgFor("b")],
    [3, svgFor("c")],
  ]);
  assert.ok(Date.now() - begin < 1000, "no wait on the 30 s process timeout");

  const none = scripted(() => assert.fail("no process may start"));
  const empty = await renderPlantUmlDiagrams("<p>text</p>", { jarPath, workspaceRoot: root, trusted: true, ...hostOf(none) });
  assert.deepEqual(empty, { diagrams: [], diagnostics: [] });
  assert.equal(none.calls.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S5
// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S8
test("a run that rejects is reported on the diagram like any other failure", async () => {
  const { root } = workspace();
  const thrown = await renderPlantUmlDiagrams(figure("@startuml\n@enduml", 4), {
    workspaceRoot: root,
    trusted: true,
    ...hostOf(scripted(() => { throw new Error("cannot fork"); })),
  });
  assert.deepEqual(thrown.diagrams, [{ status: "error", message: "cannot fork", line: 4 }]);
  assert.deepEqual(thrown.diagnostics, [{ message: "cannot fork", severity: "warning", line: 4 }]);

  const missing = await renderPlantUmlDiagrams(figure("@startuml\n@enduml", 4), {
    workspaceRoot: root,
    trusted: true,
    ...hostOf(scripted(() => { throw missingProgram("plantuml"); })),
  });
  assert.equal(missing.diagrams[0]?.status, "unavailable");
  assert.match(missing.diagrams[0]?.message ?? "", /^PlantUML executable "plantuml" was not found on PATH\./u);
});

test("a missing java is reported like a missing command; other spawn errors keep their text", async () => {
  const { root, jarPath } = workspace();
  // A machine with JAVA_HOME set (a CI runner) would name the absolute java path instead of "java".
  const javaHome = process.env.JAVA_HOME;
  delete process.env.JAVA_HOME;
  const absent = await renderPlantUmlDiagrams(figure("a", 2), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
    ...hostOf(scripted(() => { throw missingProgram("java"); })),
  }).finally(() => {
    if (javaHome !== undefined) process.env.JAVA_HOME = javaHome;
  });
  assert.deepEqual(absent.diagrams, [{
    status: "unavailable",
    message: 'PlantUML executable "java" was not found on PATH. '
      + "Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path.",
    line: 2,
  }]);

  const denied = await renderPlantUmlDiagrams(figure("a", 2), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
    ...hostOf(scripted(() => {
      throw Object.assign(new Error("spawn java EACCES"), { code: "EACCES" });
    })),
  });
  assert.deepEqual(denied.diagrams, [{ status: "error", message: "spawn java EACCES", line: 2 }]);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-097#S8
test("a diagram text over 1 MiB is refused without a process, a text of exactly 1 MiB is rendered", async () => {
  const { root, jarPath } = workspace();
  const runner = scripted(() => exited(svgFor("ok")));
  const limit = 1024 * 1024;

  const over = await renderPlantUmlDiagrams(figure("x".repeat(limit + 1), 5), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
    ...hostOf(runner),
  });
  assert.deepEqual(over.diagrams, [{
    status: "error",
    message: "PlantUML source exceeds the 1 MiB preview limit.",
    line: 5,
  }]);
  assert.equal(runner.calls.length, 0);

  const at = await renderPlantUmlDiagrams(figure("x".repeat(limit), 5), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
    ...hostOf(runner),
  });
  assert.equal(at.diagrams[0]?.status, "rendered");
  assert.equal(runner.calls.length, 1);
});

test("an output over 8 MiB is refused; an output of exactly 8 MiB is accepted", async () => {
  const { root, jarPath } = workspace();
  const limit = 8 * 1024 * 1024;
  const runner = scripted((input) => {
    const svg = svgFor("big");
    const length = input === "over" ? limit + 1 : limit;
    return exited(" ".repeat(length - svg.length) + svg);
  });

  const over = await renderPlantUmlDiagrams(figure("over", 6), { jarPath, workspaceRoot: root, trusted: true, ...hostOf(runner) });
  assert.deepEqual(over.diagrams, [{
    status: "error",
    message: "PlantUML SVG output exceeds the 8 MiB preview limit.",
    line: 6,
  }]);

  const exact = await renderPlantUmlDiagrams(figure("exact", 6), { jarPath, workspaceRoot: root, trusted: true, ...hostOf(runner) });
  assert.equal(exact.diagrams[0]?.status, "rendered");
});

test("one failing JAR diagram leaves the pictures of the other diagrams intact", async () => {
  const { root, jarPath } = workspace();
  const runner = scripted((input) => input === "bad" ? exited("", 1, "Syntax Error") : exited(svgFor(input)));
  const html = figure("one", 1) + figure("bad", 2) + figure("three", 3);

  const result = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true, ...hostOf(runner) });
  assert.deepEqual(result.diagrams.map((item) => item.status), ["rendered", "error", "rendered"]);
  assert.equal(result.diagnostics.length, 1);

  const injected = injectPlantUmlDiagrams(html, result.diagrams);
  assert.equal(injected.match(/class="myst-plantuml-image"/gu)?.length, 2);
  assert.match(injected, /<p class="myst-plantuml-error">PlantUML exited with code 1: Syntax Error<\/p>/u);

  const failing = scripted(() => exited("", 2, "boom"));
  clearPlantUmlCacheForTests(); // the first pass was cached; this pass must meet the new failing process
  const failed = await renderPlantUmlDiagrams(html, { jarPath, workspaceRoot: root, trusted: true, ...hostOf(failing) });
  assert.deepEqual(failed.diagrams.map((item) => item.status), ["error", "error", "error"]);
});

test("a jarPath naming a directory is refused on every diagram before any process starts", async () => {
  const { root } = workspace();
  const directory = path.join(root, "jars");
  fs.mkdirSync(directory);
  const runner = scripted(() => assert.fail("no process may start"));

  const result = await renderPlantUmlDiagrams(figure("a", 1) + figure("b", 2), {
    jarPath: directory,
    workspaceRoot: root,
    trusted: true,
    ...hostOf(runner),
  });
  const message = `The PlantUML JAR path is not a file: ${directory}`;
  assert.deepEqual(result.diagrams, [
    { status: "error", message, line: 1 },
    { status: "error", message, line: 2 },
  ]);
  assert.equal(result.diagnostics.length, 2);
  assert.equal(runner.calls.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S3
test("a JAR process that ends on a signal names the signal, with its error output or the no-diagnostic text", async () => {
  const { root, jarPath } = workspace();
  clearPlantUmlCacheForTests();
  const runner = scripted((input) => ({
    exitCode: null,
    stopped: false,
    stdout: "",
    stderr: input === "noisy" ? "Out of memory" : "",
    signal: "SIGTERM",
  }));
  const result = await renderPlantUmlDiagrams(figure("noisy", 1) + figure("silent", 2), {
    jarPath,
    workspaceRoot: root,
    trusted: true,
    ...hostOf(runner),
  });
  assert.deepEqual(result.diagrams, [
    { status: "error", message: "PlantUML exited with signal SIGTERM: Out of memory", line: 1 },
    { status: "error", message: "PlantUML exited with signal SIGTERM: PlantUML returned no diagnostic.", line: 2 },
  ]);
  assert.equal(result.diagnostics.length, 2, "one warning per failing diagram");
});
