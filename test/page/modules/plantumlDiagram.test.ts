import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPlantUmlDiagramRenderer,
  findUnsupportedPlantUmlFeature,
  installPlantUmlLoaders,
  isDarkBackground,
  type PlantUmlDiagramRenderer,
  type PlantUmlFileHost,
  type PlantUmlFileLoader,
  type PlantUmlRenderToString,
} from "../../../src/page/modules/plantumlDiagram";
import { FakeDocument, FakeElement } from "./fakeDom";

const SEQUENCE = "@startuml\nAlice -> Bob: hello\n@enduml";

function diagram(doc: FakeDocument, source: string): FakeElement {
  const element = doc.add("div", { class: "myst-plantuml-diagram" });
  element.textContent = source;
  return element;
}

interface EngineCall { lines: string[]; dark: boolean }

function fakeEngine(answer: (call: EngineCall) => { svg: string } | { error: string }): {
  engine: PlantUmlRenderToString;
  calls: EngineCall[];
} {
  const calls: EngineCall[] = [];
  const engine: PlantUmlRenderToString = (lines, onSuccess, onError, options) => {
    const call = { lines, dark: options.dark };
    calls.push(call);
    const outcome = answer(call);
    queueMicrotask(() => ("svg" in outcome ? onSuccess(outcome.svg) : onError(outcome.error)));
  };
  return { engine, calls };
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-032
test("finds the PlantUML directives the built-in engine cannot serve, with their line", () => {
  const cases: Array<[string, string]> = [
    ["@startuml\n  !include <C4/C4_Context>\n@enduml", "!include <C4/C4_Context>"],
    ["@startuml\n!includeurl https://example.com/x.puml\n@enduml", "!includeurl https://example.com/x.puml"],
    ["@startuml\n!include https://example.com/x.puml\n@enduml", "!include https://example.com/x.puml"],
    ["@startuml\n!include_many <aws/common>\n@enduml", "!include_many <aws/common>"],
    ["@startuml\n!includesub http://example.com/parts.puml!BASE\n@enduml", "!includesub http://example.com/parts.puml!BASE"],
    ["@startuml\n!includedef defs.puml\n@enduml", "!includedef defs.puml"],
    ["@startuml\n!import lib.zip\n@enduml", "!import lib.zip"],
    ["@startuml\n!theme corporate from ./themes\n@enduml", "!theme corporate from ./themes"],
  ];
  for (const [source, directive] of cases) {
    assert.deepEqual(findUnsupportedPlantUmlFeature(source), { line: 2, directive }, source);
  }
  for (const supported of [
    SEQUENCE,
    // Local files are read by the host (decision: local !include in the built-in engine).
    "@startuml\n!include styles/common.puml\nAlice -> Bob\n@enduml",
    "@startuml\n!include_many parts.puml\n@enduml",
    "@startuml\n!include_once parts.puml\n@enduml",
    "@startuml\n!includesub parts.puml!BASE\n@enduml",
    "@startuml\n!theme cerulean\nAlice -> Bob\n@enduml",
    "@startuml\n' !include commented.puml\nAlice -> Bob: !include is text here\n@enduml",
  ]) {
    assert.equal(findUnsupportedPlantUmlFeature(supported), undefined, supported);
  }
});

test("a diagram with a standard-library include shows the useJar hint, keeps its source and never reaches the engine", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include <C4/C4_Context>\nAlice -> Bob\n@enduml");
  const { engine, calls } = fakeEngine(() => ({ svg: "<svg/>" }));
  await createPlantUmlDiagramRenderer(engine).render(element as unknown as HTMLElement, false);

  assert.equal(calls.length, 0);
  assert.equal(element.getAttribute("data-render-state"), "unavailable");
  assert.equal(element.querySelectorAll("img").length, 0);
  const message = element.querySelector(".myst-plantuml-error");
  assert.ok(message);
  assert.match(message.textContent, /built-in PlantUML engine/u);
  assert.match(message.textContent, /!include <C4\/C4_Context>/u);
  assert.match(message.textContent, /line 2/u);
  assert.match(message.textContent, /markdownOkfSchemaStudio\.plantuml\.useJar/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-023
test("a rendered diagram becomes an inert data-URI image, in the theme asked for", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, SEQUENCE);
  const { engine, calls } = fakeEngine(() => ({ svg: "<svg xmlns=\"http://www.w3.org/2000/svg\"><text>Alice</text></svg>" }));
  await createPlantUmlDiagramRenderer(engine).render(element as unknown as HTMLElement, true);

  assert.deepEqual(calls, [{ lines: ["@startuml", "Alice -> Bob: hello", "@enduml"], dark: true }]);
  assert.equal(element.getAttribute("data-render-state"), "rendered");
  assert.equal(element.getAttribute("data-plantuml-engine"), "builtin");
  assert.equal(element.getAttribute("data-plantuml-dark"), "true");
  const image = element.querySelector("img");
  assert.ok(image);
  assert.equal(image.getAttribute("class"), "myst-plantuml-image");
  assert.equal(image.getAttribute("alt"), "PlantUML diagram");
  assert.match(image.getAttribute("src") ?? "", /^data:image\/svg\+xml;charset=utf-8,%3Csvg/u);
  assert.equal(element.querySelectorAll(".myst-plantuml-error").length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-039
test("the same source in the same theme renders once; a theme change renders again from the kept source", async () => {
  const doc = new FakeDocument();
  const first = diagram(doc, SEQUENCE);
  const patched = diagram(doc, SEQUENCE);
  const { engine, calls } = fakeEngine(({ dark }) => ({ svg: `<svg data-dark="${dark}"/>` }));
  const renderer = createPlantUmlDiagramRenderer(engine);

  await renderer.render(first as unknown as HTMLElement, false);
  await renderer.render(patched as unknown as HTMLElement, false);
  assert.equal(calls.length, 1, "a patched page with an unchanged diagram is served from the cache");

  // The image replaced the source text: the renderer must still know it.
  await renderer.render(first as unknown as HTMLElement, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], { lines: ["@startuml", "Alice -> Bob: hello", "@enduml"], dark: true });
  assert.equal(first.getAttribute("data-plantuml-dark"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-039
test("ten patches of one block run the engine at most twice: queued runs are superseded, the latest wins", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, SEQUENCE);
  const { engine, calls } = fakeEngine(() => ({ svg: "<svg/>" }));
  const renderer = createPlantUmlDiagramRenderer(engine);

  const renders: Array<Promise<void>> = [];
  for (let patch = 0; patch < 10; patch += 1) {
    element.setAttribute("data-plantuml-base", `/docs/v${patch}.md`);
    renders.push(renderer.render(element as unknown as HTMLElement, false));
  }
  await Promise.all(renders);

  assert.ok(calls.length <= 2, `the engine ran ${calls.length} times for 10 patches`);
  assert.equal(element.getAttribute("data-render-state"), "rendered", "the latest render is shown");
});

test("an engine failure shows its reason as plain text with the useJar hint", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\nAlice -> Bob: <:smile:>\n@enduml");
  const { engine } = fakeEngine(() => ({
    error: "java.lang.RuntimeException: emoji.js is not available in the built-in PlantUML engine <img src=x>",
  }));
  await createPlantUmlDiagramRenderer(engine).render(element as unknown as HTMLElement, false);

  assert.equal(element.getAttribute("data-render-state"), "error");
  assert.equal(element.querySelectorAll("img").length, 0, "the reason is text, never markup");
  const message = element.querySelector(".myst-plantuml-error");
  assert.ok(message);
  assert.match(message.textContent, /emoji\.js is not available/u);
  assert.doesNotMatch(message.textContent, /java\.lang/u);
  assert.match(message.textContent, /markdownOkfSchemaStudio\.plantuml\.useJar/u);
});

test("the loaders installed for the engine refuse every file and library, so nothing is read or fetched", () => {
  const target: Record<string, unknown> = {};
  installPlantUmlLoaders(target);
  for (const name of ["PLANTUML_FILE_LOADER", "PLANTUML_STDLIB_LOADER"]) {
    assert.equal(typeof target[name], "function", `${name} must be installed`);
  }
  const outcomes: string[] = [];
  const ok = (): void => { outcomes.push("ok"); };
  const err = (message: string): void => { outcomes.push(message); };
  (target.PLANTUML_FILE_LOADER as (...args: unknown[]) => unknown)("styles/common.puml", null, ok, err, { kind: "include" });
  const declined = (target.PLANTUML_STDLIB_LOADER as (...args: unknown[]) => unknown)("c4.min.js", ok, err);
  assert.notEqual(declined, false, "returning false would let the engine add a script tag");
  assert.deepEqual(outcomes, [
    "styles/common.puml is not available in the built-in PlantUML engine",
    "c4.min.js is not available in the built-in PlantUML engine",
  ]);
  assert.equal(target.PLANTUML_STDLIB_BASE, undefined, "no remote standard library base");
});

test("the preview background decides the dark rendering", () => {
  assert.equal(isDarkBackground("rgb(31, 31, 31)"), true);
  assert.equal(isDarkBackground("rgba(30, 30, 30, 1)"), true);
  assert.equal(isDarkBackground("rgb(255, 255, 255)"), false);
  assert.equal(isDarkBackground("rgb(246, 241, 228)"), false);
  assert.equal(isDarkBackground("rgba(0, 0, 0, 0)"), false, "a transparent background is not a dark theme");
  assert.equal(isDarkBackground(""), false);
});

// --- Local !include files through the host (built-in engine) ---

interface HostCall { path: string; from: string | null }

/** A host serving `files` by absolute path: top-level names resolve in /docs, nested ones next to `from`. */
function fakeHost(files: Record<string, string>, delayMs = 0): { host: PlantUmlFileHost; calls: HostCall[] } {
  const calls: HostCall[] = [];
  const host: PlantUmlFileHost = (request) => {
    calls.push(request);
    const base = request.from === null ? "/docs" : request.from.replace(/\/[^/]*$/u, "");
    const id = `${base}/${request.path}`.replace(/\/[^/]+\/\.\.\//gu, "/");
    const text = files[id];
    return new Promise((resolve) => setTimeout(() => resolve(text === undefined
      ? { ok: false, reason: `PlantUML file not found: ${request.path}.` }
      : { ok: true, id, text }), delayMs));
  };
  return { host, calls };
}

/**
 * Mimics the engine's include handling: every `!include*` line asks the loader (top-level with
 * `from` null, nested with the id of the including file) and is replaced by the delivered text.
 */
function includingEngine(loader: () => PlantUmlFileLoader): { engine: PlantUmlRenderToString; runs: string[][] } {
  const runs: string[][] = [];
  const expand = async (text: string, from: string | null): Promise<string> => {
    const out: string[] = [];
    for (const line of text.split("\n")) {
      const match = /^\s*!include(?:_many|_once|sub)?\s+(\S+)/u.exec(line);
      if (!match) {
        out.push(line);
        continue;
      }
      const result = await new Promise<{ id: string; text: string } | { error: string }>((resolve) => {
        loader()(match[1]!, from, (id, delivered) => resolve({ id, text: delivered }), (error) => resolve({ error }), { kind: "include" });
      });
      out.push("error" in result ? `ERROR ${result.error}` : await expand(result.text, result.id));
    }
    return out.join("\n");
  };
  const engine: PlantUmlRenderToString = (lines, onSuccess) => {
    runs.push(lines);
    void expand(lines.join("\n"), null).then((text) => onSuccess(`<svg>${text}</svg>`));
  };
  return { engine, runs };
}

function withIncludes(files: Record<string, string>, delayMs = 0) {
  const { host, calls } = fakeHost(files, delayMs);
  let renderer: PlantUmlDiagramRenderer | undefined;
  const { engine, runs } = includingEngine(() => renderer!.loadFile);
  renderer = createPlantUmlDiagramRenderer(engine, { host });
  return { renderer, calls, runs };
}

function svgOf(element: FakeElement): string {
  return decodeURIComponent((element.querySelector("img")?.getAttribute("src") ?? "").split(",").slice(1).join(","));
}

function messageOf(element: FakeElement): string {
  return element.querySelector(".myst-plantuml-error")?.textContent ?? "";
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-046
test("a local include is asked of the host and drawn; a nested include resolves next to the including file", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include styles/common.puml\nAlice -> Carol\n@enduml");
  const { renderer, calls } = withIncludes({
    "/docs/styles/common.puml": "skinparam monochrome true\n!include parts.puml",
    "/docs/styles/parts.puml": "participant \"Included Carol\" as Carol",
  });
  await renderer.render(element as unknown as HTMLElement, false);

  assert.deepEqual(calls, [
    { path: "styles/common.puml", from: null },
    { path: "parts.puml", from: "/docs/styles/common.puml" },
  ]);
  assert.equal(element.getAttribute("data-render-state"), "rendered");
  assert.equal(element.getAttribute("data-plantuml-includes"), "true");
  assert.match(svgOf(element), /participant "Included Carol" as Carol/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-068
test("the top-level includes of a {uml} diagram file resolve next to that file", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include common.puml\nA -> B\n@enduml");
  element.setAttribute("data-plantuml-base", "/docs/diagrams/flow.puml");
  const { renderer, calls } = withIncludes({ "/docs/diagrams/common.puml": "participant Shared" });
  await renderer.render(element as unknown as HTMLElement, false);

  assert.deepEqual(calls, [{ path: "common.puml", from: "/docs/diagrams/flow.puml" }]);
  assert.match(svgOf(element), /participant Shared/u);
});

test("an include cycle is stopped with a message, also back to the diagram's own file", async () => {
  const doc = new FakeDocument();
  const looping = diagram(doc, "@startuml\n!include_many a.puml\n@enduml");
  const self = diagram(doc, "@startuml\n!include flow.puml\n@enduml");
  self.setAttribute("data-plantuml-base", "/docs/flow.puml");
  const { renderer } = withIncludes({
    "/docs/a.puml": "!include_many b.puml",
    "/docs/b.puml": "!include_many a.puml",
    "/docs/flow.puml": "!include flow.puml",
  });
  await renderer.render(looping as unknown as HTMLElement, false);
  await renderer.render(self as unknown as HTMLElement, false);

  for (const element of [looping, self]) {
    assert.equal(element.getAttribute("data-render-state"), "error");
    assert.match(messageOf(element), /includes itself \(an include cycle\)/u);
    assert.equal(element.querySelectorAll("img").length, 0);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-061
test("includes nested deeper than 8 files are refused", async () => {
  const files: Record<string, string> = {};
  for (let level = 1; level <= 10; level += 1) {
    files[`/docs/level${level}.puml`] = `!include level${level + 1}.puml`;
  }
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include level1.puml\n@enduml");
  const { renderer, calls } = withIncludes(files);
  await renderer.render(element as unknown as HTMLElement, false);

  assert.equal(calls.length, 8, "the ninth level is never asked for");
  assert.equal(element.getAttribute("data-render-state"), "error");
  assert.match(messageOf(element), /level9\.puml is nested deeper than 8 includes/u);
});

test("a diagram includes at most 64 files and at most 1 MiB of text with its includes", async () => {
  const files: Record<string, string> = {};
  const lines = ["@startuml"];
  for (let index = 1; index <= 70; index += 1) {
    files[`/docs/part${index}.puml`] = `participant P${index}`;
    lines.push(`!include part${index}.puml`);
  }
  lines.push("@enduml");
  const doc = new FakeDocument();
  const many = diagram(doc, lines.join("\n"));
  const big = diagram(doc, "@startuml\n!include big.puml\n@enduml");
  const { renderer, calls } = withIncludes({ ...files, "/docs/big.puml": "x".repeat(1024 * 1024) });
  await renderer.render(many as unknown as HTMLElement, false);
  assert.equal(calls.length, 64);
  assert.match(messageOf(many), /part65\.puml was not read: a diagram includes at most 64 files/u);

  await renderer.render(big as unknown as HTMLElement, false);
  assert.match(messageOf(big), /big\.puml was not read: the diagram with its included files exceeds the 1 MiB preview limit/u);
});

test("a diagram source over 1 MiB is refused without running the engine, like the JAR pipeline", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, `@startuml\n${"A -> B\n".repeat(160_000)}@enduml`);
  const { engine, calls } = fakeEngine(() => ({ svg: "<svg/>" }));
  await createPlantUmlDiagramRenderer(engine).render(element as unknown as HTMLElement, false);

  assert.equal(calls.length, 0);
  assert.equal(element.getAttribute("data-render-state"), "unavailable");
  assert.equal(messageOf(element), "The PlantUML source exceeds the 1 MiB preview limit.");
});

test("a refused include shows the host's reason and is asked again at the next render", async () => {
  const doc = new FakeDocument();
  const source = "@startuml\n!include missing.puml\n@enduml";
  const first = diagram(doc, source);
  const patched = diagram(doc, source);
  const { renderer, calls } = withIncludes({});
  await renderer.render(first as unknown as HTMLElement, false);

  assert.equal(first.getAttribute("data-render-state"), "error");
  assert.equal(messageOf(first), "The built-in PlantUML engine could not render this diagram: PlantUML file not found: missing.puml.");
  await renderer.render(patched as unknown as HTMLElement, false);
  assert.equal(calls.length, 2, "a failed include is not cached: the file may have appeared");
});

test("a URL or library directive inside an included file names the file and hints at useJar", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include styles/c4.puml\n@enduml");
  const { renderer } = withIncludes({ "/docs/styles/c4.puml": "' C4 shapes\n!include <C4/C4_Container>" });
  await renderer.render(element as unknown as HTMLElement, false);

  assert.equal(element.getAttribute("data-render-state"), "unavailable");
  assert.match(messageOf(element), /!include <C4\/C4_Container> \(line 2 of c4\.puml\)/u);
  assert.match(messageOf(element), /markdownOkfSchemaStudio\.plantuml\.useJar/u);
});

test("a local theme folder is refused by the loader even past the pre-scan", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, SEQUENCE);
  const { host, calls } = fakeHost({});
  let renderer: PlantUmlDiagramRenderer | undefined;
  const engine: PlantUmlRenderToString = (_lines, onSuccess) => {
    renderer!.loadFile("themes/puml-theme-corp.puml", null, () => undefined, () => undefined, { kind: "theme" });
    queueMicrotask(() => onSuccess("<svg/>"));
  };
  renderer = createPlantUmlDiagramRenderer(engine, { host });
  await renderer.render(element as unknown as HTMLElement, false);

  assert.deepEqual(calls, [], "the host is never asked for a theme");
  assert.match(messageOf(element), /!theme \.\.\. from themes\/puml-theme-corp\.puml is not available/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-053
test("after an included file changed, the diagrams that read files are drawn again from the host", async () => {
  const doc = new FakeDocument();
  const including = diagram(doc, "@startuml\n!include part.puml\n@enduml");
  const plain = diagram(doc, SEQUENCE);
  const files = { "/docs/part.puml": "participant Before" };
  const { renderer, calls, runs } = withIncludes(files);
  await renderer.render(including as unknown as HTMLElement, false);
  await renderer.render(plain as unknown as HTMLElement, false);
  assert.equal(plain.getAttribute("data-plantuml-includes"), null);

  files["/docs/part.puml"] = "participant After";
  await renderer.render(including as unknown as HTMLElement, false);
  assert.match(svgOf(including), /Before/u, "without a change notice the cached picture stays");

  renderer.forgetIncludedFiles();
  await renderer.render(including as unknown as HTMLElement, false);
  await renderer.render(plain as unknown as HTMLElement, false);
  assert.match(svgOf(including), /participant After/u);
  assert.equal(calls.length, 2);
  assert.equal(runs.length, 3, "the diagram without includes stays cached");
});

test("diagrams render one at a time, so each include request belongs to the diagram that is drawing", async () => {
  const doc = new FakeDocument();
  const left = diagram(doc, "@startuml\n!include common.puml\n@enduml");
  left.setAttribute("data-plantuml-base", "/docs/left/flow.puml");
  const right = diagram(doc, "@startuml\n!include common.puml\n@enduml");
  right.setAttribute("data-plantuml-base", "/docs/right/flow.puml");
  const { renderer, calls } = withIncludes({
    "/docs/left/common.puml": "participant Left",
    "/docs/right/common.puml": "participant Right",
  }, 5);
  await Promise.all([
    renderer.render(left as unknown as HTMLElement, false),
    renderer.render(right as unknown as HTMLElement, false),
  ]);

  assert.deepEqual(calls.map((call) => call.from), ["/docs/left/flow.puml", "/docs/right/flow.puml"]);
  assert.match(svgOf(left), /participant Left/u);
  assert.match(svgOf(right), /participant Right/u);
});

test("a render superseded while its files are read does not overwrite the newer result", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include part.puml\n@enduml");
  const { renderer } = withIncludes({ "/docs/part.puml": "participant Slow" }, 5);
  const light = renderer.render(element as unknown as HTMLElement, false);
  const dark = renderer.render(element as unknown as HTMLElement, true);
  await Promise.all([light, dark]);
  assert.equal(element.getAttribute("data-plantuml-dark"), "true");
  assert.equal(element.querySelectorAll("img").length, 1);
});

test("the engine's file loader refuses files outside a render or without a host", () => {
  const outcomes: string[] = [];
  const renderer = createPlantUmlDiagramRenderer(fakeEngine(() => ({ svg: "<svg/>" })).engine);
  renderer.loadFile("styles/common.puml", null, () => outcomes.push("ok"), (message) => outcomes.push(message));
  assert.deepEqual(outcomes, ["styles/common.puml is not available in the built-in PlantUML engine"]);

  const target: Record<string, unknown> = {};
  installPlantUmlLoaders(target, renderer.loadFile);
  assert.equal(target.PLANTUML_FILE_LOADER, renderer.loadFile);
  assert.equal(typeof target.PLANTUML_STDLIB_LOADER, "function");
});
