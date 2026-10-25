/**
 * Requirement tests of the diagram modules of the page: the comment button in a figure
 * (`commentCompose.ts`) and the bound of the built-in PlantUML result cache (`plantumlDiagram.ts`).
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installCommentCompose } from "../../../src/page/modules/commentCompose";
import {
  createPlantUmlDiagramRenderer,
  type PlantUmlRenderToString,
} from "../../../src/page/modules/plantumlDiagram";
import { FakeDocument, FakeElement, FakeText, provideGlobalElement } from "./fakeDom";

function composePage() {
  const document = new FakeDocument();
  let selection: unknown;
  const window = {
    innerWidth: 800,
    innerHeight: 600,
    getSelection: () => selection,
    addEventListener: () => undefined,
    setTimeout: (callback: () => void, delay: number) => {
      if (delay === 0) { callback(); }
      return 0;
    },
    clearTimeout: () => undefined,
  };
  provideGlobalElement(FakeElement);
  installCommentCompose(document as never, window as never, {
    post: () => undefined,
    busy: () => false,
    beforeOpen: () => undefined,
  });
  const select = (node: FakeText, start: number, end: number, text: string): void => {
    selection = {
      rangeCount: 1,
      isCollapsed: false,
      toString: () => text,
      removeAllRanges: () => { selection = undefined; },
      getRangeAt: () => ({
        startContainer: node, startOffset: start, endContainer: node, endOffset: end,
        getBoundingClientRect: () => ({ left: 20, top: 40, right: 120, bottom: 60 }),
      }),
    };
    document.fire("selectionchange");
  };
  return { document, select, button: () => document.querySelector("[data-okf-comment-create]") };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038
test("a selection inside a Mermaid or PlantUML figure offers no comment; one in a paragraph does", () => {
  for (const figureClass of ["myst-mermaid-figure", "myst-plantuml-figure"]) {
    const { document, select, button } = composePage();
    const figure = document.add("figure", { class: figureClass, "data-line": "5", "data-end-line": "9" });
    const label = document.add("p", { "data-line": "6" }, figure, "Alice says hello");
    select(label.childNodes[0] as FakeText, 0, 5, "Alice");
    assert.equal(button(), null, `${figureClass}: no comment button`);
  }

  const { document, select, button } = composePage();
  const paragraph = document.add("p", { "data-line": "3", "data-end-line": "3" }, document.content, "Please say hello");
  select(paragraph.childNodes[0] as FakeText, 11, 16, "hello");
  assert.ok(button(), "an ordinary paragraph offers the button");
});

test("the built-in result cache keeps 64 results and drops the least recently used", async () => {
  const document = new FakeDocument();
  let runs = 0;
  const engine: PlantUmlRenderToString = (_lines, onSuccess) => {
    runs += 1;
    queueMicrotask(() => onSuccess("<svg/>"));
  };
  const renderer = createPlantUmlDiagramRenderer(engine);
  const draw = async (index: number): Promise<void> => {
    const element = document.add("div", { class: "myst-plantuml-diagram" });
    element.textContent = `@startuml\nA -> B: ${index}\n@enduml`;
    await renderer.render(element as unknown as HTMLElement, false);
  };

  for (let index = 0; index < 64; index += 1) await draw(index);
  assert.equal(runs, 64);
  await draw(0);
  assert.equal(runs, 64, "the 64th result is still cached");

  // 0 was used again, so the least recently used result is 1.
  await draw(64);
  assert.equal(runs, 65);
  await draw(0);
  assert.equal(runs, 65, "a result used after newer ones stays");
  await draw(1);
  assert.equal(runs, 66, "the unused oldest result was dropped: the engine runs again");
});
