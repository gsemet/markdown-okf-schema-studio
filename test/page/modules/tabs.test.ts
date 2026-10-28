import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installTabs } from "../../../src/page/modules/tabs";
import { FakeDocument, FakeElement, provideGlobalElement } from "./fakeDom";

provideGlobalElement(FakeElement);

class Node_ extends FakeElement {
  hidden = false;
  focused = 0;
  focus(): void { this.focused += 1; (this.ownerDocument as Doc).activeElement = this; }
}

class Doc extends FakeDocument {
  activeElement: FakeElement | null = null;
  override createElement(tag: string) { const element = new Node_(tag); element.ownerDocument = this; return element; }
  getElementById(id: string): Node_ | null {
    return (this.descendants().find((element) => element.getAttribute("id") === id) as Node_ | undefined) ?? null;
  }
}

interface Built { set: Node_; tabs: Node_[]; panels: Node_[] }

/** A tab set of the markup the renderer writes: `titles` tabs, tab `selected` shown. */
function buildSet(document: Doc, prefix: string, titles: string[], selected: number, group = "tab", keys: Array<string | undefined> = []): Built {
  const set = document.add("div", { class: "myst-tab-set", "data-myst-tab-group": group }) as Node_;
  const list = document.add("div", { class: "myst-tab-list", role: "tablist" }, set);
  const tabs: Node_[] = [];
  const panels: Node_[] = [];
  titles.forEach((title, index) => {
    const tab = document.add("button", {
      class: "myst-tab", role: "tab", id: `${prefix}-tab-${index}`, "aria-controls": `${prefix}-panel-${index}`,
      "aria-selected": index === selected ? "true" : "false", tabindex: index === selected ? "0" : "-1",
      ...(keys[index] ? { "data-myst-tab-sync": keys[index]! } : {}),
    }, list, title) as Node_;
    tabs.push(tab);
  });
  titles.forEach((title, index) => {
    const panel = document.add("div", {
      class: "myst-tab-panel", role: "tabpanel", id: `${prefix}-panel-${index}`, "aria-labelledby": `${prefix}-tab-${index}`,
    }, set, `Panel ${title}`) as Node_;
    panel.hidden = index !== selected;
    panels.push(panel);
  });
  return { set, tabs, panels };
}

function key(tab: Node_, name: string, extra: Record<string, unknown> = {}) {
  return tab.fire("keydown", { key: name, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...extra });
}

const states = (built: Built) => built.tabs.map((tab, index) =>
  `${tab.getAttribute("aria-selected")}/${tab.getAttribute("tabindex")}/${built.panels[index].hidden ? "hidden" : "shown"}`);

function setup(titles = ["A", "B", "C"], selected = 0) {
  const document = new Doc();
  const built = buildSet(document, "t", titles, selected);
  const tabs = installTabs(document as never);
  return { document, built, tabs };
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("ArrowRight and ArrowLeft move the selection and the focus, and wrap around", () => {
  const { built } = setup();
  const first = key(built.tabs[0], "ArrowRight");
  assert.equal(first.prevented, 1);
  assert.deepEqual(states(built), ["false/-1/hidden", "true/0/shown", "false/-1/hidden"]);
  assert.equal(built.tabs[1].focused, 1);
  key(built.tabs[1], "ArrowRight");
  key(built.tabs[2], "ArrowRight");
  assert.deepEqual(states(built), ["true/0/shown", "false/-1/hidden", "false/-1/hidden"], "wraps from the last to the first");
  assert.equal(built.tabs[0].focused, 1);
  key(built.tabs[0], "ArrowLeft");
  assert.deepEqual(states(built), ["false/-1/hidden", "false/-1/hidden", "true/0/shown"], "wraps from the first to the last");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("Home and End select the first and the last tab", () => {
  const { built } = setup(["A", "B", "C", "D"], 1);
  key(built.tabs[1], "End");
  assert.deepEqual(states(built), ["false/-1/hidden", "false/-1/hidden", "false/-1/hidden", "true/0/shown"]);
  assert.equal(built.tabs[3].focused, 1);
  key(built.tabs[3], "Home");
  assert.deepEqual(states(built), ["true/0/shown", "false/-1/hidden", "false/-1/hidden", "false/-1/hidden"]);
  assert.equal(built.tabs[0].focused, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("other keys, modified keys and other targets leave the tabs alone", () => {
  const { built, document } = setup();
  assert.equal(key(built.tabs[0], "ArrowDown").prevented, 0);
  assert.equal(key(built.tabs[0], "a").prevented, 0);
  assert.equal(key(built.tabs[0], "ArrowRight", { shiftKey: true }).prevented, 0);
  assert.equal(key(built.tabs[0], "ArrowRight", { altKey: true }).prevented, 0);
  assert.equal(key(built.tabs[0], "ArrowRight", { ctrlKey: true }).prevented, 0);
  assert.equal(key(built.tabs[0], "ArrowRight", { metaKey: true }).prevented, 0);
  assert.equal(key(built.tabs[0], "ArrowRight", { isComposing: true }).prevented, 0);
  assert.deepEqual(states(built), ["true/0/shown", "false/-1/hidden", "false/-1/hidden"]);
  const text = document.add("p", {}, built.set.querySelectorAll(".myst-tab-panel")[0] as Node_, "x");
  assert.equal(text.fire("keydown", { key: "ArrowRight" }).prevented, 0);
  assert.deepEqual(states(built), ["true/0/shown", "false/-1/hidden", "false/-1/hidden"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("a click selects the tab and shows its panel only", () => {
  const { built } = setup();
  built.tabs[2].fire("click");
  assert.deepEqual(states(built), ["false/-1/hidden", "false/-1/hidden", "true/0/shown"]);
  assert.equal(built.tabs[2].focused, 0, "a click does not move the focus by script");
  built.panels[2].fire("click");
  assert.deepEqual(states(built), ["false/-1/hidden", "false/-1/hidden", "true/0/shown"], "a click on a panel changes nothing");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("a tab set nested in a panel keeps its own selection", () => {
  const document = new Doc();
  const outer = buildSet(document, "o", ["One", "Two"], 0);
  const inner = buildSet(document, "i", ["X", "Y"], 0);
  outer.panels[0].appendChild(inner.set);
  installTabs(document as never);
  key(inner.tabs[0], "ArrowRight");
  assert.deepEqual(states(inner), ["false/-1/hidden", "true/0/shown"]);
  assert.deepEqual(states(outer), ["true/0/shown", "false/-1/hidden"], "the outer set is unchanged");
  key(outer.tabs[0], "End");
  assert.deepEqual(states(outer), ["false/-1/hidden", "true/0/shown"]);
  assert.deepEqual(states(inner), ["false/-1/hidden", "true/0/shown"], "the inner set keeps its choice");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("tabs with the same sync key in the same group follow each other, another group does not", () => {
  const document = new Doc();
  const first = buildSet(document, "a", ["Python", "Node"], 0, "language", ["py", "node"]);
  const second = buildSet(document, "b", ["Node", "Python", "Go"], 2, "language", ["node", "py", "go"]);
  const other = buildSet(document, "c", ["Python", "Node"], 0, "other", ["py", "node"]);
  installTabs(document as never);
  first.tabs[1].fire("click");
  assert.deepEqual(states(first), ["false/-1/hidden", "true/0/shown"]);
  assert.deepEqual(states(second), ["true/0/shown", "false/-1/hidden", "false/-1/hidden"]);
  assert.deepEqual(states(other), ["true/0/shown", "false/-1/hidden"], "another sync group is untouched");
  assert.equal(second.tabs[0].focused, 0, "the followers do not take the focus");
  key(second.tabs[0], "ArrowRight");
  assert.deepEqual(states(first), ["true/0/shown", "false/-1/hidden"], "py is selected everywhere in the group");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-099
test("apply puts the choices back on content that a patch rendered again", () => {
  const document = new Doc();
  const before = buildSet(document, "t", ["A", "B", "C"], 0);
  const tabs = installTabs(document as never);
  key(before.tabs[0], "End");
  // A content patch: the same markup again, in its rendered default state.
  document.content.childNodes.slice().forEach((child) => document.content.removeChild(child));
  const after = buildSet(document, "t", ["A", "B", "C"], 0);
  assert.deepEqual(states(after), ["true/0/shown", "false/-1/hidden", "false/-1/hidden"]);
  tabs.apply();
  assert.deepEqual(states(after), ["false/-1/hidden", "false/-1/hidden", "true/0/shown"]);
  // A set that lost tabs keeps its default.
  document.content.childNodes.slice().forEach((child) => document.content.removeChild(child));
  const fewer = buildSet(document, "t", ["A", "B"], 0);
  tabs.apply();
  assert.deepEqual(states(fewer), ["true/0/shown", "false/-1/hidden"]);
});
