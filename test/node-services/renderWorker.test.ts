import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { threadId } from "node:worker_threads";

import { RenderCanceledError, renderPreviewSource, type SourceRenderInput } from "../../src/core/render/renderPipeline";
import { createWorkerRenderer } from "../../src/node-services/renderWorker";

function workspace(context: { after: (fn: () => void) => void }): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "render-worker-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function input(root: string, text: string): SourceRenderInput {
  return { text, documentPath: path.join(root, "doc.md"), workspaceRoot: root, readOnly: false };
}

/** A MyST document that takes a few hundred milliseconds to render. */
function largeDocument(sections: number): string {
  const out: string[] = ["# Large document", ""];
  for (let index = 0; index < sections; index += 1) {
    out.push(`## Section ${index}`, "", `Paragraph ${index} with *emphasis*, **strong** and \`code\`.`, "");
    out.push(":::{note}", `Note ${index} with a [link](https://example.com/${index}).`, ":::", "");
    out.push("```python", `print(${index})`, "```", "");
  }
  return out.join("\n");
}

/** Records the longest gap between ticks of a 5 ms interval: how long the thread was blocked. */
function watchEventLoop(): () => number {
  let last = performance.now();
  let longest = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    longest = Math.max(longest, now - last);
    last = now;
  }, 5);
  return () => {
    clearInterval(timer);
    return Math.max(longest, performance.now() - last);
  };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("renders in a worker thread, with the output of the in-process render", async (context) => {
  const root = workspace(context);
  fs.writeFileSync(path.join(root, "part.md"), "Included *text*.\n");
  const renderer = createWorkerRenderer();
  context.after(() => renderer.dispose());
  const source = input(root, "# Title\n\n```{include} part.md\n```\n\n:::{note}\nBody\n:::\n");
  const { renderMs: workerMs, ...fromWorker } = await renderer.render(source);
  const { renderMs: inProcessMs, ...inProcess } = await renderPreviewSource(source);
  assert.deepEqual(fromWorker, inProcess);
  assert.equal(typeof workerMs, "number");
  assert.equal(typeof inProcessMs, "number");
  assert.match(fromWorker.html, /Included/u);
  const stats = renderer.stats();
  assert.equal(stats.workerRenders, 1);
  assert.equal(stats.fallbackRenders, 0);
  assert.notEqual(stats.lastThreadId, threadId);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("the host thread stays free while a worker renders", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer();
  context.after(() => renderer.dispose());
  const text = largeDocument(1500);
  // Warm the worker (thread start and engine load) so the measure covers the render alone.
  await renderer.render(input(root, "# Warm\n"));
  const stopWorker = watchEventLoop();
  const workerStart = performance.now();
  await renderer.render(input(root, text));
  const workerMs = performance.now() - workerStart;
  const workerBlocked = stopWorker();
  const stopInProcess = watchEventLoop();
  const inProcessStart = performance.now();
  await renderPreviewSource(input(root, text));
  const inProcessMs = performance.now() - inProcessStart;
  const inProcessBlocked = stopInProcess();
  // In-process, the thread is blocked for most of the render; with the worker, only briefly.
  assert.ok(inProcessBlocked > inProcessMs / 2, `in-process blocked ${inProcessBlocked} ms of ${inProcessMs} ms`);
  assert.ok(workerBlocked < workerMs / 2, `worker render blocked the host ${workerBlocked} ms of ${workerMs} ms`);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("an abort stops the render at once, and the next render gets a fresh worker", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer();
  context.after(() => renderer.dispose());
  await renderer.render(input(root, "# Warm\n"));
  const text = largeDocument(3000);
  const controller = new AbortController();
  const render = renderer.render(input(root, text), controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 30));
  const abortedAt = performance.now();
  controller.abort();
  await assert.rejects(render, RenderCanceledError);
  const settleMs = performance.now() - abortedAt;
  assert.ok(settleMs < 50, `the aborted render settled after ${settleMs} ms`);
  assert.equal(renderer.stats().aborted, 1);
  assert.equal(renderer.stats().workerRenders, 1);
  const next = await renderer.render(input(root, "# After\n"));
  assert.match(next.html, /After/u);
  assert.equal(renderer.stats().started, 2);
  assert.equal(renderer.stats().workerRenders, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("a render given up before it starts never reaches a worker", async (context) => {
  const renderer = createWorkerRenderer();
  context.after(() => renderer.dispose());
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(renderer.render(input(os.tmpdir(), "# T\n"), controller.signal), RenderCanceledError);
  assert.equal(renderer.stats().started, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("a worker that cannot start falls back to the in-process render", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer({ scriptPath: path.join(root, "missing-worker.js") });
  context.after(() => renderer.dispose());
  const result = await renderer.render(input(root, "# Fallback\n"));
  assert.match(result.html, /Fallback/u);
  const second = await renderer.render(input(root, "# Again\n"));
  assert.match(second.html, /Again/u);
  const stats = renderer.stats();
  assert.equal(stats.workerRenders, 0);
  assert.equal(stats.fallbackRenders, 2);
  assert.match(stats.disabledReason ?? "", /could not start/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("disposing the renderer cancels the render in flight", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer();
  const render = renderer.render(input(root, largeDocument(500)));
  renderer.dispose();
  await assert.rejects(render, RenderCanceledError);
  // After disposal, renders run in-process.
  const result = await renderer.render(input(root, "# Late\n"));
  assert.match(result.html, /Late/u);
  void context;
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("the extension bundle ships the worker next to extension.js, where the renderer looks for it", () => {
  const repositoryRoot = path.resolve(__dirname, "../../..");
  const esbuild = fs.readFileSync(path.join(repositoryRoot, "esbuild.mjs"), "utf8");
  assert.match(esbuild, /entryPoints: \["src\/node-services\/renderWorker\.ts"\],\s*outfile: "out\/bundle\/renderWorker\.js"/u);
  assert.match(esbuild, /outfile: "out\/bundle\/extension\.js"/u);
  // The renderer resolves `renderWorker.js` beside its own module: out/bundle/ in the VSIX.
  const source = fs.readFileSync(path.join(repositoryRoot, "src/node-services/renderWorker.ts"), "utf8");
  assert.match(source, /path\.join\(__dirname, "renderWorker\.js"\)/u);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("warming starts one thread that the first render then uses", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer();
  context.after(() => renderer.dispose());
  renderer.warm();
  renderer.warm();
  assert.equal(renderer.stats().started, 1);
  const first = await renderer.render(input(root, "# One\n"));
  const second = await renderer.render(input(root, "# Two\n"));
  assert.match(first.html + second.html, /One[\s\S]*Two/u);
  assert.equal(renderer.stats().started, 1);
  assert.equal(renderer.stats().workerRenders, 2);
});

/**
 * Writes a stub worker script: it posts `ready` after `readyMs`, then answers each render with the
 * texts it received so far. A text `die` ends the thread; `slow:<ms>` answers after that delay.
 */
function stubWorker(root: string, readyMs = 0): string {
  const scriptPath = path.join(root, `stub-worker-${readyMs}.js`);
  fs.writeFileSync(scriptPath, `
const { parentPort } = require("node:worker_threads");
const received = [];
parentPort.on("message", (message) => {
  if (message.type !== "render") return;
  const text = message.input.text;
  received.push(text);
  if (text === "die") process.exit(1);
  const delay = text.startsWith("slow:") ? Number(text.slice(5)) : 0;
  setTimeout(() => parentPort.postMessage({
    type: "done",
    id: message.id,
    output: { html: received.join(","), diagnostics: [], dependencies: [] },
    threadId: 1,
  }), delay);
});
setTimeout(() => parentPort.postMessage({ type: "ready" }), ${readyMs});
`);
  return scriptPath;
}

const inProcessStub = async (source: SourceRenderInput) => ({ html: `in-process:${source.text}`, diagnostics: [], dependencies: [] });

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("a ready worker that dies during a render fails that render; three deaths in a row fall back", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer({ scriptPath: stubWorker(root), fallback: inProcessStub });
  context.after(() => renderer.dispose());
  for (let death = 1; death <= 3; death += 1) {
    await assert.rejects(renderer.render(input(root, "die")), /stopped during the render/u);
    assert.equal(renderer.stats().started, death);
  }
  assert.match(renderer.stats().disabledReason ?? "", /stopped 3 times in a row/u);
  const after = await renderer.render(input(root, "next"));
  assert.equal(after.html, "in-process:next");
  assert.equal(renderer.stats().started, 3);
  assert.equal(renderer.stats().fallbackRenders, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("a render waits for the busy worker instead of starting a second thread", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer({ scriptPath: stubWorker(root), fallback: inProcessStub });
  context.after(() => renderer.dispose());
  const first = renderer.render(input(root, "slow:150"));
  const second = renderer.render(input(root, "fast"));
  assert.equal(renderer.stats().started, 1);
  assert.equal((await first).html, "slow:150");
  // The same thread rendered both, the second after the first.
  assert.equal((await second).html, "slow:150,fast");
  assert.equal(renderer.stats().started, 1);
  assert.equal(renderer.stats().workerRenders, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("a waiting render that is given up never reaches the worker", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer({ scriptPath: stubWorker(root), fallback: inProcessStub });
  context.after(() => renderer.dispose());
  const first = renderer.render(input(root, "slow:150"));
  const controller = new AbortController();
  const waiting = renderer.render(input(root, "stale"), controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  await assert.rejects(waiting, RenderCanceledError);
  assert.equal((await first).html, "slow:150");
  assert.equal((await renderer.render(input(root, "next"))).html, "slow:150,next");
  const stats = renderer.stats();
  assert.equal(stats.started, 1);
  assert.equal(stats.aborted, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-004
test("a render aborted while its thread still starts keeps that thread for the next render", async (context) => {
  const root = workspace(context);
  const renderer = createWorkerRenderer({ scriptPath: stubWorker(root, 200), fallback: inProcessStub });
  context.after(() => renderer.dispose());
  const controller = new AbortController();
  const cold = renderer.render(input(root, "cold"), controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.abort();
  await assert.rejects(cold, RenderCanceledError);
  // The thread was neither stopped nor sent the aborted render.
  assert.equal((await renderer.render(input(root, "next"))).html, "next");
  const stats = renderer.stats();
  assert.equal(stats.started, 1);
  assert.equal(stats.aborted, 0);
  assert.equal(stats.workerRenders, 1);
});
