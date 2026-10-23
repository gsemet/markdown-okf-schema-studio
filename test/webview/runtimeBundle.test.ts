/**
 * The page runtime is assembled from functions turned back into source text
 * (`Function.prototype.toString()`), so each of them must be self-contained: a reference to a
 * helper defined outside its body type-checks in its module but is an undefined name in the page.
 * The shipped file is built by esbuild with minification, which renames such helpers, so a script
 * that works unminified can still break once bundled. These tests pin the property on the scripts
 * the page really runs, whatever builds them: the runtime of this build and the bundled file
 * `out/bundle/preview.js` produced by the project's own bundle step (built in a temporary
 * directory), and a page session whose trace is pinned as a literal value.
 *
 * When the runtime stops being assembled with `toString()`, the tests of that mechanism retire with
 * it: the undeclared-name check of `createPreviewRuntimeScript()` and the pinned trace of the inline
 * and context-free runtimes. The undeclared-name check of the shipped file and its pinned trace
 * (`EXPECTED_TRACE`) are the ones that must survive, unchanged.
 */
import * as assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { createPreviewRuntimeScript } from "../../src/webview/scrollSync";
import {
  DOCUMENT_ID,
  HARNESS_PAGE,
  identityOf,
  PATCH_NEXT,
  pageIdentity,
  renderIdentity,
  REQUEST_ID,
} from "../shared/previewIdentity";
import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";

const repositoryRoot = path.resolve(__dirname, "../../..");

/** The only global the page script may use that a browser page does not define: the webview API. */
const HOST_GLOBALS = ["acquireVsCodeApi"];

/**
 * Builds the bundle exactly as packaging does (the project's own `esbuild.mjs`), but into a
 * temporary directory: the script writes below its working directory, which here only links to the
 * sources, so the `out/bundle` of the checkout is left alone. Returns the runtime file it writes.
 */
function bundledRuntime(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-runtime-bundle-"));
  try {
    fs.symlinkSync(path.join(repositoryRoot, "src"), path.join(directory, "src"), "dir");
    execFileSync(process.execPath, [path.join(repositoryRoot, "esbuild.mjs")], { cwd: directory, stdio: "pipe" });
    return fs.readFileSync(path.join(directory, "out", "bundle", "preview.js"), "utf8");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

let bundled: string | undefined;
const shippedRuntime = (): string => (bundled ??= bundledRuntime());

/**
 * The identifiers a script reads without declaring them, as the TypeScript checker of the project
 * reports them for a browser page (`lib.dom`): "Cannot find name" diagnostics of a JavaScript check.
 */
function undeclaredNames(script: string): string[] {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-runtime-check-"));
  try {
    const file = path.join(directory, "runtime.js");
    fs.writeFileSync(file, script, "utf8");
    const result = spawnSync(process.execPath, [
      path.join(path.dirname(require.resolve("typescript/package.json")), "bin", "tsc"),
      "--noEmit", "--allowJs", "--checkJs", "--strict", "false", "--skipLibCheck",
      "--target", "es2022", "--lib", "es2022,dom", "--types", "", "--pretty", "false",
      file,
    ], { cwd: directory, encoding: "utf8" });
    assert.equal(result.error, undefined, "the type checker ran");
    const output = `${result.stdout}${result.stderr}`;
    assert.match(output, /runtime\.js\(\d+,\d+\): error TS\d+/u, "the checker reported on the script");
    const names = new Set<string>();
    for (const match of output.matchAll(/error TS(?:2304|2552|2582|2580|2662|2663): Cannot find name '([^']+)'/gu)) {
      names.add(match[1]!);
    }
    return [...names].sort();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("the runtime of this build reads no name it does not declare, except the webview API", () => {
  assert.deepEqual(undeclaredNames(createPreviewRuntimeScript()), HOST_GLOBALS);
});

test("the bundled runtime file reads no name it does not declare, except the webview API", () => {
  assert.deepEqual(undeclaredNames(shippedRuntime()), HOST_GLOBALS);
});

/**
 * One page session: load, scroll from the editor, open a block editor, type, autosave, a content
 * patch. Returns what the page posted and showed, without ids that differ between runs, as plain
 * data (absent fields left out).
 */
function session(runtimeScript: string | undefined): unknown[] {
  const harness: RuntimeHarness = createRuntimeHarness({
    virtualClock: true,
    ...(runtimeScript === undefined ? {} : { runtimeScript }),
  });
  const ids = HARNESS_PAGE;
  const trace: unknown[] = [];
  harness.flushFrames();
  trace.push({ step: "load", root: harness.documentElement.getAttribute("data-sphinx-preview-request-id") });
  harness.dispatchMessage({ type: "sourceScroll", ...ids, line: 50 });
  harness.flushFrames();
  trace.push({ step: "source scroll", scrollY: harness.windowState.scrollY });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  const editId = [...harness.messages].reverse().find((message) => message.type === "previewEditOpen")?.editId;
  harness.dispatchMessage({ type: "previewEditSource", ...ids, editId, originalText: "Second paragraph.\n" });
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
  trace.push({ step: "editor", open: textarea !== undefined });
  if (textarea) {
    textarea.value = "Second paragraph, edited.";
    textarea.dispatch("input");
    harness.advanceTimers(400);
  }
  harness.dispatchMessage({
    type: "previewContentPatch",
    ...ids,
    [PATCH_NEXT]: renderIdentity(8, 12),
    contentHtml: "<p>fresh</p>",
    status: "success",
    label: "Preview ready",
    diagnostics: [],
  });
  harness.flushFrames();
  harness.flushMicrotasks();
  trace.push({ step: "patch", root: harness.documentElement.getAttribute("data-sphinx-preview-request-id") });
  trace.push(...harness.messages.map((message) => ({
    type: message.type,
    ...identityOf(message),
    editMode: message.editMode,
    line: message.line,
    editedText: message.editedText,
    final: message.final,
  })));
  return JSON.parse(JSON.stringify(trace)) as unknown[];
}

const page = HARNESS_PAGE;
const patched = pageIdentity(page[DOCUMENT_ID], 8, 12);

/**
 * The trace of that session, frozen from the inline runtime of the build before the runtime moved
 * to a bundle of its own. Every runtime variant is compared with this value, not with each other,
 * so the comparison outlives the variants that go away with the `toString()` assembly.
 */
const EXPECTED_TRACE: readonly unknown[] = [
  { step: "load", root: String(page[REQUEST_ID]) },
  { step: "source scroll", scrollY: 435 },
  { step: "editor", open: true },
  { step: "patch", root: String(patched[REQUEST_ID]) },
  { type: "previewReady", ...page },
  { type: "previewEditModeChanged", ...page, editMode: true },
  { type: "previewEditOpen", ...page, line: 50 },
  { type: "previewEditSave", ...page, line: 50, editedText: "Second paragraph, edited.\n", final: false },
  { type: "previewReady", ...patched },
];

test("the inline runtime gives the pinned trace of a page session", () => {
  assert.deepEqual(session(undefined), EXPECTED_TRACE);
});

test("the context-free runtime of this build gives the pinned trace of a page session", () => {
  assert.deepEqual(session(createPreviewRuntimeScript()), EXPECTED_TRACE);
});

test("the bundled runtime file gives the pinned trace of a page session", () => {
  assert.deepEqual(session(shippedRuntime()), EXPECTED_TRACE);
});
