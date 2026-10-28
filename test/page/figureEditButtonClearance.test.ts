import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installFigureEditButton } from "../../src/page/modules/figurePanel";

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
test("the Edit figure button of a figure under the sticky controls is placed below them", () => {
  const created: Array<{ style: Map<string, string> }> = [];
  const document = {
    body: { appendChild: () => undefined },
    createElement: () => {
      const style = new Map<string, string>();
      const element = {
        style: { setProperty: (name: string, value: string) => style.set(name, value) },
        setAttribute: () => undefined,
        removeAttribute: () => undefined,
        addEventListener: () => undefined,
        style_: style,
      };
      created.push({ style });
      return element;
    },
  } as unknown as Document;
  const window = { addEventListener: () => undefined } as unknown as Window & typeof globalThis;
  const button = installFigureEditButton(document, window, {
    isEditMode: () => true,
    open: () => undefined,
    usableTop: () => 110,
  });
  const figure = {
    tagName: "FIGURE",
    getBoundingClientRect: () => ({ top: 60, bottom: 400, left: 20, right: 600, width: 580, height: 340 }),
  } as unknown as Element;
  button.sync(figure);
  assert.equal(created[0].style.get("top"), "112px");
  // A figure with no room below the controls keeps the button inside its own box.
  const small = {
    tagName: "FIGURE",
    getBoundingClientRect: () => ({ top: 60, bottom: 120, left: 20, right: 600, width: 580, height: 60 }),
  } as unknown as Element;
  button.sync(small);
  assert.equal(created[0].style.get("top"), "86px");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
test("a scroll after the hover keeps the Edit figure button on the hovered figure", () => {
  const hidden = new Set<string>(["hidden"]);
  const style = new Map<string, string>();
  const document = {
    body: { appendChild: () => undefined },
    createElement: () => ({
      style: { setProperty: (name: string, value: string) => style.set(name, value) },
      setAttribute: (name: string) => hidden.add(name),
      removeAttribute: (name: string) => hidden.delete(name),
      hasAttribute: (name: string) => hidden.has(name),
      addEventListener: () => undefined,
    }),
  } as unknown as Document;
  const handlers: Array<() => void> = [];
  const window = {
    addEventListener: (type: string, handler: () => void) => { if (type === "scroll") handlers.push(handler); },
  } as unknown as Window & typeof globalThis;
  const button = installFigureEditButton(document, window, { isEditMode: () => true, open: () => undefined });
  let top = 300;
  const figure = {
    tagName: "FIGURE",
    getBoundingClientRect: () => ({ top, bottom: top + 200, left: 20, right: 600, width: 580, height: 200 }),
  } as unknown as Element;
  button.sync(figure);
  // The page scrolls after the pointer arrived: no mouseover follows, the hover stays on the figure.
  top = 140;
  for (const handler of handlers) handler();
  assert.equal(hidden.has("hidden"), false, "the button stays shown");
  assert.equal(style.get("top"), "146px", "and follows the figure");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-153
test("the Edit figure button of a figure shorter than the preview controls sits left of them (CR 161)", () => {
  const style = new Map<string, string>();
  const document = {
    body: { appendChild: () => undefined },
    createElement: () => ({
      style: { setProperty: (name: string, value: string) => style.set(name, value) },
      setAttribute: () => undefined,
      removeAttribute: () => undefined,
      addEventListener: () => undefined,
    }),
  } as unknown as Document;
  const window = { addEventListener: () => undefined } as unknown as Window & typeof globalThis;
  // The five-row controls of a 420 px pane: 304..406 across, 12..178 down; the figure is 93 px high.
  const controls = { top: 12, bottom: 178, left: 304, right: 406 };
  const button = installFigureEditButton(document, window, {
    isEditMode: () => true,
    open: () => undefined,
    usableTop: () => 182,
    obstacle: () => controls,
  });
  const figure = {
    tagName: "FIGURE",
    getBoundingClientRect: () => ({ top: 60, bottom: 153, left: 34, right: 386, width: 352, height: 93 }),
  } as unknown as Element;
  button.sync(figure);
  assert.equal(style.get("top"), "119px", "still inside the figure");
  const left = Number(style.get("left")?.replace("px", ""));
  assert.ok(left + 96 <= controls.left, `the button (left ${left}) ends before the controls (${controls.left})`);
  // A figure with room below the controls keeps the button at its top right.
  const tall = {
    tagName: "FIGURE",
    getBoundingClientRect: () => ({ top: 60, bottom: 400, left: 34, right: 386, width: 352, height: 340 }),
  } as unknown as Element;
  button.sync(tall);
  assert.equal(style.get("left"), "290px");
});
