import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPlantUmlDiagramRenderer,
  findUnsupportedPlantUmlFeature,
  installPlantUmlLoaders,
  isDarkBackground,
  type PlantUmlRenderToString,
} from "../../src/webview/plantumlDiagram";
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

test("finds the PlantUML directives the built-in engine cannot serve, with their line", () => {
  const cases: Array<[string, string]> = [
    ["@startuml\n!include styles/common.puml\nAlice -> Bob\n@enduml", "!include styles/common.puml"],
    ["@startuml\n  !include <C4/C4_Context>\n@enduml", "!include <C4/C4_Context>"],
    ["@startuml\n!includeurl https://example.com/x.puml\n@enduml", "!includeurl https://example.com/x.puml"],
    ["@startuml\n!include_many parts.puml\n@enduml", "!include_many parts.puml"],
    ["@startuml\n!include_once parts.puml\n@enduml", "!include_once parts.puml"],
    ["@startuml\n!includesub parts.puml!BASE\n@enduml", "!includesub parts.puml!BASE"],
    ["@startuml\n!import lib.zip\n@enduml", "!import lib.zip"],
    ["@startuml\n!theme corporate from ./themes\n@enduml", "!theme corporate from ./themes"],
  ];
  for (const [source, directive] of cases) {
    assert.deepEqual(findUnsupportedPlantUmlFeature(source), { line: 2, directive }, source);
  }
  for (const supported of [
    SEQUENCE,
    "@startuml\n!theme cerulean\nAlice -> Bob\n@enduml",
    "@startuml\n' !include commented.puml\nAlice -> Bob: !include is text here\n@enduml",
  ]) {
    assert.equal(findUnsupportedPlantUmlFeature(supported), undefined, supported);
  }
});

test("a diagram with an include shows the useJar hint, keeps its source and never reaches the engine", async () => {
  const doc = new FakeDocument();
  const element = diagram(doc, "@startuml\n!include styles/common.puml\nAlice -> Bob\n@enduml");
  const { engine, calls } = fakeEngine(() => ({ svg: "<svg/>" }));
  await createPlantUmlDiagramRenderer(engine).render(element as unknown as HTMLElement, false);

  assert.equal(calls.length, 0);
  assert.equal(element.getAttribute("data-render-state"), "unavailable");
  assert.equal(element.querySelectorAll("img").length, 0);
  const message = element.querySelector(".myst-plantuml-error");
  assert.ok(message);
  assert.match(message.textContent, /built-in PlantUML engine/u);
  assert.match(message.textContent, /!include styles\/common\.puml/u);
  assert.match(message.textContent, /line 2/u);
  assert.match(message.textContent, /markdownOkfSchemaStudio\.plantuml\.useJar/u);
});

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
