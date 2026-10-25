/**
 * Review annotations on the page (requirements REVIEW-022, REVIEW-026, REVIEW-148, REVIEW-213):
 * the keyboard on a thread highlight, the placement of the thread popover, the pruning of the saved
 * comment chips and the placement of the change bars after a resize.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installChipToggle } from "../../../src/page/modules/chipToggle";
import { installCommentThreads } from "../../../src/page/modules/commentThreads";
import { installIncomingChanges } from "../../../src/page/modules/incomingChanges";
import { FakeDocument, FakeElement, provideGlobalElement } from "./fakeDom";

const thread = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  anchor: { line: 1, endLine: 1, quote: "needle", prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-10-21T10:00:00Z",
  comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why this?" }],
  ...overrides,
});

function threadsPage(window: { innerWidth: number; innerHeight: number }) {
  const document = new FakeDocument();
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, window as never);
  const popover = () => document.querySelector("[data-okf-comment-popover]");
  return { document, comments, popover };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-021
test("Enter and Space on a focused highlight or badge toggle its popover, another key does nothing", () => {
  const { document, comments, popover } = threadsPage({ innerWidth: 800, innerHeight: 600 });
  document.add("p", { "data-line": "1" }, document.content, "a needle and more");
  const split = document.add("p", { "data-line": "3" }, document.content, "a nee");
  document.add("em", {}, split, "dle b");
  comments.setThreads([
    thread(),
    thread({ id: "t2", anchor: { line: 3, endLine: 3, quote: "needle", prefix: "", suffix: "" } }),
  ]);
  const mark = document.querySelector("[data-okf-comment-thread]")!;
  const badge = document.querySelector("[data-okf-comment-badge]")!;
  assert.ok(mark && badge, "one highlight and one badge");

  const other = mark.fire("keydown", { key: "a" });
  assert.equal(popover(), null, "another key leaves the popover closed");
  assert.deepEqual(other, { prevented: 0, stopped: 0 });

  const enter = mark.fire("keydown", { key: "Enter" });
  assert.ok(popover(), "Enter opens the popover");
  assert.deepEqual(enter, { prevented: 1, stopped: 1 }, "and the key does nothing else");
  mark.fire("keydown", { key: "Enter" });
  assert.equal(popover(), null, "Enter again closes it");

  mark.fire("keydown", { key: " " });
  assert.ok(popover(), "Space opens the popover");
  mark.fire("keydown", { key: "b" });
  assert.ok(popover(), "another key does not change the open popover");
  mark.fire("keydown", { key: " " });
  assert.equal(popover(), null);

  badge.fire("keydown", { key: "Enter" });
  assert.equal(popover()?.getAttribute("data-okf-comment-popover"), "t2", "the badge opens its thread");
});

/** Opens the popover of a highlight whose box starts at `left` and returns its styles. */
function openAt(window: { innerWidth: number; innerHeight: number }, left: number) {
  const { document, comments, popover } = threadsPage(window);
  document.add("p", { "data-line": "1" }, document.content, "a needle and more");
  comments.setThreads([thread()]);
  const mark = document.querySelector("[data-okf-comment-thread]")!;
  mark.getBoundingClientRect = () => ({ left, top: 40, right: left + 40, bottom: 60, width: 40, height: 20 });
  mark.fire("click");
  const styles = popover()!.styles;
  return { width: styles.get("width"), left: styles.get("left") };
}

test("the popover is at most 360 px wide and stays 8 px inside the pane edges", () => {
  assert.deepEqual(openAt({ innerWidth: 800, innerHeight: 600 }, 100), { width: "360px", left: "100px" });
  assert.deepEqual(openAt({ innerWidth: 800, innerHeight: 600 }, 700), { width: "360px", left: "432px" },
    "a highlight near the right edge moves the left edge so that the popover ends 8 px before the edge");
  assert.deepEqual(openAt({ innerWidth: 800, innerHeight: 600 }, -50), { width: "360px", left: "8px" });
  // A pane narrower than 376 px: the width is the pane width minus 16 px, never below 200 px.
  assert.deepEqual(openAt({ innerWidth: 300, innerHeight: 600 }, 200), { width: "284px", left: "8px" });
  assert.deepEqual(openAt({ innerWidth: 216, innerHeight: 600 }, 150), { width: "200px", left: "8px" });
  assert.equal(openAt({ innerWidth: 150, innerHeight: 600 }, 50).width, "200px");
});

/** A minimal element for the chip toggle: attributes, classes, children and `closest`. */
class ChipElement {
  attrs = new Map<string, string>();
  children: ChipElement[] = [];
  parentElement: ChipElement | null = null;
  hidden = false;
  constructor(public tagName: string, public classes: string[] = []) {}
  get classList() { return { contains: (name: string) => this.classes.includes(name) }; }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  append<T extends ChipElement>(child: T): T { child.parentElement = this; this.children.push(child); return child; }
  closest(selector: string): ChipElement | null {
    for (let node: ChipElement | null = this; node; node = node.parentElement) {
      if (selector.startsWith("[") && node.attrs.has(selector.slice(1, -1))) return node;
    }
    return null;
  }
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-143
test("the saved state drops the key of a comment the content no longer holds", () => {
  const root = new ChipElement("html");
  const block = root.append(new ChipElement("div"));
  block.setAttribute("data-line", "5");
  const comment = block.append(new ChipElement("div", ["okf-comment"]));
  const chip = comment.append(new ChipElement("span", ["okf-chip"]));
  const body = comment.append(new ChipElement("div", ["okf-comment-body"]));
  body.hidden = true;
  let state: Record<string, unknown> | undefined = { expandedChips: ["5:0", "9:0"] };
  const document = {
    documentElement: root,
    addEventListener: () => undefined,
    querySelectorAll: (selector: string) => (selector === ".okf-comment" ? [comment] : []),
  };
  const vscode = { getState: () => state, setState: (next: Record<string, unknown>) => { state = next; } };
  const toggle = installChipToggle(document as never, vscode as never, {}, () => undefined);

  toggle.apply();
  assert.deepEqual(toggle.expanded(), ["5:0"], "the key without a comment (9:0) is gone, the present one stays");
  assert.deepEqual((state as { expandedChips: string[] }).expandedChips, ["5:0"], "the pruned set is saved");
  assert.equal(chip.getAttribute("aria-expanded"), "true");
  assert.equal(body.hidden, false);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-207
test("the change bars are placed again on a window resize and after a content change", () => {
  const document = new FakeDocument();
  const resizeListeners: Array<() => void> = [];
  (document as unknown as { documentElement: unknown }).documentElement = document;
  (document as unknown as { defaultView: unknown }).defaultView = {
    addEventListener: (type: string, listener: () => void) => { if (type === "resize") resizeListeners.push(listener); },
  };
  const marks = installIncomingChanges(document as never);
  assert.equal(resizeListeners.length, 1, "the page listens for the resize of the window");

  const block = document.add("p", { "data-line": "3" });
  let box = { top: 110, height: 40 };
  block.getBoundingClientRect = () => ({ left: 0, top: box.top, right: 100, bottom: box.top + box.height, width: 100, height: box.height });
  marks.setRanges([{ start: 3, end: 3 }]);
  const bar = () => document.body.querySelector("[data-sphinx-preview-change-layer]")!.querySelectorAll("span")[0];
  // The root box starts at 10 in the fake: the bar is relative to it.
  assert.deepEqual([bar().styles.get("top"), bar().styles.get("height")], ["100px", "40px"]);

  box = { top: 310, height: 60 };
  resizeListeners[0]!();
  assert.deepEqual([bar().styles.get("top"), bar().styles.get("height")], ["300px", "60px"], "each bar follows its block on resize");

  box = { top: 410, height: 20 };
  marks.apply();
  assert.deepEqual([bar().styles.get("top"), bar().styles.get("height")], ["400px", "20px"], "and after a content patch");
});
