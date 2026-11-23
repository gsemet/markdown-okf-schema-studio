import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createNodeProcessRunner } from "../../src/node-services/processRunner";

const runner = createNodeProcessRunner();
const posixOnly = { skip: process.platform === "win32" ? "process groups are POSIX only" : false };

/** Runs a Node script as the program. */
function node(script: string, options: Parameters<typeof runner.run>[2] = {}): ReturnType<typeof runner.run> {
  return runner.run(process.execPath, ["-e", script], options);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntilDead(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (!isAlive(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

test("collects the output, the exit code and feeds standard input", async () => {
  const result = await node(
    "process.stdin.setEncoding('utf8');let d='';process.stdin.on('data',c=>d+=c);"
      + "process.stdin.on('end',()=>{process.stdout.write('in:'+d);process.stderr.write('err');process.exit(3)})",
    { input: "hello" },
  );
  assert.deepEqual(result, { exitCode: 3, stopped: false, stdout: "in:hello", stderr: "err" });
});

test("rejects with the spawn error when the program does not exist", async () => {
  await assert.rejects(
    runner.run("markdown-okf-no-such-program-470", []),
    (error: NodeJS.ErrnoException) => error.code === "ENOENT",
  );
});

test("settles once when the program ends at the moment it is stopped", async () => {
  const controller = new AbortController();
  const pending = node("setTimeout(()=>{},50)", { signal: controller.signal });
  setTimeout(() => controller.abort(), 50);
  const result = await pending;
  assert.equal(typeof result.stopped, "boolean");
  // A second abort after settling does nothing.
  controller.abort();
});

test("a signal already aborted stops the program", async () => {
  const result = await node("setTimeout(()=>{},10000)", { signal: AbortSignal.abort() });
  assert.equal(result.stopped, true);
});

test("the timeout stops the program", async () => {
  const result = await node("setTimeout(()=>{},10000)", { timeoutMs: 100 });
  assert.equal(result.stopped, true);
  assert.notEqual(result.exitCode, 0);
});

test("reports the signal that ended the program", posixOnly, async () => {
  const result = await node("process.kill(process.pid,'SIGKILL')");
  assert.equal(result.exitCode, null);
  assert.equal(result.signal, "SIGKILL");
  assert.equal(result.stopped, false);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("a timeout kills the whole process group, not only the program", posixOnly, async () => {
  // The program starts a grandchild in its own group, as a launcher script starts a JVM.
  const result = await node(
    "const c=require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});"
      + "process.stdout.write(String(c.pid));setTimeout(()=>{},60000)",
    { timeoutMs: 1000 },
  );
  assert.equal(result.stopped, true);
  const grandchild = Number(result.stdout);
  assert.ok(grandchild > 0, `grandchild pid in ${JSON.stringify(result.stdout)}`);
  assert.equal(await waitUntilDead(grandchild), true, "the grandchild is still running");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("an abort kills the whole process group", posixOnly, async () => {
  const controller = new AbortController();
  const pending = node(
    "const c=require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});"
      + "process.stdout.write(String(c.pid));setTimeout(()=>{},60000)",
    { signal: controller.signal },
  );
  setTimeout(() => controller.abort(), 1000);
  const result = await pending;
  assert.equal(result.stopped, true);
  assert.equal(await waitUntilDead(Number(result.stdout)), true, "the grandchild is still running");
});

test("a program that exits without reading its input does not fail the run (EPIPE)", async () => {
  // The write of a large input to a closed pipe raises EPIPE on the input stream; the run still
  // ends with the exit code and the standard error of the program, the more useful diagnostic.
  const result = await node("process.stderr.write('refused');process.exit(2)", { input: "x".repeat(8 * 1024 * 1024) });
  assert.equal(result.exitCode, 2);
  assert.equal(result.stderr, "refused");
  assert.equal(result.stopped, false);
});

test("decodes a multibyte character split across chunks", async () => {
  const result = await node(
    "const b=Buffer.from('a\u00e9\u{1F600}z');let i=0;"
      + "const t=setInterval(()=>{if(i>=b.length){clearInterval(t);return}process.stdout.write(b.subarray(i,i+1));i+=1},5)",
  );
  assert.equal(result.stdout, "a\u00e9\u{1F600}z");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("stops a program that writes more than maxStdoutBytes", async () => {
  const result = await node(
    "setInterval(()=>process.stdout.write('x'.repeat(65536)),1)",
    { maxStdoutBytes: 1000, timeoutMs: 20000 },
  );
  assert.equal(result.outputExceeded, true);
  assert.equal(result.stopped, true);
  assert.equal(result.stdout, "");
});

test("counts maxStdoutBytes in bytes, not characters", async () => {
  // 600 characters of two bytes each: over 1000 bytes, under 1000 characters.
  const result = await node("process.stdout.write('\u00e9'.repeat(600))", { maxStdoutBytes: 1000, timeoutMs: 20000 });
  assert.equal(result.outputExceeded, true);
});

test("keeps an output within maxStdoutBytes whole", async () => {
  const result = await node("process.stdout.write('x'.repeat(1000))", { maxStdoutBytes: 1000 });
  assert.equal(result.outputExceeded, undefined);
  assert.equal(result.stdout.length, 1000);
  assert.equal(result.exitCode, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097
test("cuts the standard error at maxStderrChars and lets the program finish", async () => {
  const result = await node("process.stderr.write('e'.repeat(10000));process.exit(1)", { maxStderrChars: 100 });
  assert.equal(result.stderr, "e".repeat(100));
  assert.equal(result.stderrTruncated, true);
  assert.equal(result.stopped, false);
  assert.equal(result.exitCode, 1);
});

test("a standard error within maxStderrChars is not marked truncated", async () => {
  const result = await node("process.stderr.write('short');process.exit(1)", { maxStderrChars: 100 });
  assert.equal(result.stderr, "short");
  assert.equal(result.stderrTruncated, undefined);
});
