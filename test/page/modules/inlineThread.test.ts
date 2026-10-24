import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as vm from "node:vm";

import { installInlineThreads } from "../../../src/page/modules/inlineThread";

type Handler = (event: any) => void;

class FakeElement {
  attrs = new Map<string, string>();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  className = "";
  value = "";
  disabled = false;
  textContent = "";
  listeners = new Map<string, Handler[]>();
  constructor(public tagName: string, classes: string[] = []) { this.className = classes.join(" "); }
  get classList() { return { contains: (name: string) => this.className.split(" ").includes(name) }; }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  append(...nodes: FakeElement[]) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild<T extends FakeElement>(node: T): T { node.parentElement = this; this.children.push(node); return node; }
  addEventListener(type: string, handler: Handler) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]); }
  focus() { /* the fake has no focus */ }
  click() { this.fire("click"); }
  fire(type: string, event: Record<string, unknown> = {}) {
    const calls = { prevented: 0, stopped: 0 };
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ preventDefault: () => calls.prevented++, stopPropagation: () => calls.stopped++, ...event });
    }
    return calls;
  }
  descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
  querySelector(selector: string) {
    const attribute = selector.slice(1, -1);
    return this.descendants().find((element) => element.attrs.has(attribute)) ?? null;
  }
}

function thread(root: FakeElement, attrs: Record<string, string> = { "data-line": "5", "data-end-line": "9" }) {
  const wrapper = root.appendChild(new FakeElement("div", ["okf-comment"]));
  wrapper.setAttribute("data-okf-comment-kind", "thread");
  for (const [name, value] of Object.entries(attrs)) wrapper.setAttribute(name, value);
  wrapper.appendChild(new FakeElement("span", ["okf-chip"]));
  const body = wrapper.appendChild(new FakeElement("div", ["okf-comment-body"]));
  return { wrapper, body };
}

function setup(options: { enabled?: boolean; blocked?: string } = {}) {
  const root = new FakeElement("main");
  const asked: Array<{ type: string; payload: Record<string, unknown> }> = [];
  let answer: ((result: { ok?: boolean; reason?: string }) => void) | undefined;
  const document = {
    createElement: (tag: string) => new FakeElement(tag),
    querySelectorAll: (selector: string) => {
      assert.equal(selector, '.okf-comment[data-okf-comment-kind="thread"]');
      return root.descendants().filter((element) => element.getAttribute("data-okf-comment-kind") === "thread");
    },
  };
  const deps = {
    enabled: options.enabled !== false,
    blockedReason: () => options.blocked,
    ask: (type: string, payload: Record<string, unknown>, done: typeof answer) => { asked.push({ type, payload }); answer = done; },
  };
  const threads = vm.runInNewContext(`(${installInlineThreads.toString()})(document, deps)`, { document, deps }) as ReturnType<typeof installInlineThreads>;
  return { root, threads, asked, answer: (result: { ok?: boolean; reason?: string }) => answer!(result) };
}

const part = (body: FakeElement, attribute: string) => body.querySelector(`[${attribute}]`)!;
const field = (body: FakeElement) => body.descendants().find((element) => element.tagName === "textarea")!;

test("an open thread gets a reply box and a Delete button once, and apply is idempotent", () => {
  const { root, threads } = setup();
  const { body } = thread(root);
  threads.apply();
  threads.apply();
  assert.equal(body.descendants().filter((element) => element.attrs.has("data-okf-thread-actions")).length, 1);
  assert.equal(part(body, "data-okf-thread-reply").textContent, "Reply");
  assert.equal(part(body, "data-okf-thread-delete").textContent, "Delete thread");
});

test("a read-only page (untrusted workspace) shows the messages without controls", () => {
  const { root, threads } = setup({ enabled: false });
  const { body } = thread(root);
  threads.apply();
  assert.equal(body.children.length, 0);
});

test("Reply sends the trimmed text with the source lines and clears the box on success", () => {
  const { root, threads, asked, answer } = setup();
  const { body } = thread(root);
  threads.apply();
  field(body).value = "  my answer \n second line ";
  const calls = part(body, "data-okf-thread-reply") as FakeElement;
  calls.click();
  assert.deepEqual(JSON.parse(JSON.stringify(asked)), [{ type: "previewThreadReply", payload: { line: 5, endLine: 9, text: "my answer \n second line" } }]);
  assert.equal(calls.disabled, true, "disabled while the host works");
  answer({ ok: true });
  assert.equal(calls.disabled, false);
  assert.equal(field(body).value, "");
});

test("an empty reply is not sent, and a refusal keeps the text and says why", () => {
  const { root, threads, asked, answer } = setup();
  const { body } = thread(root);
  threads.apply();
  const status = part(body, "data-okf-thread-actions").descendants().find((element) => element.className === "okf-thread-status")!;
  part(body, "data-okf-thread-reply").click?.call(part(body, "data-okf-thread-reply"));
  assert.equal(asked.length, 0);
  assert.equal(status.textContent, "Write a reply first.");
  field(body).value = "text";
  (part(body, "data-okf-thread-reply") as FakeElement).click();
  answer({ ok: false, reason: "The thread is no longer in the source." });
  assert.equal(field(body).value, "text");
  assert.equal(status.textContent, "The thread is no longer in the source.");
});

test("Delete thread asks the host with the source lines only", () => {
  const { root, threads, asked } = setup();
  const { body } = thread(root);
  threads.apply();
  (part(body, "data-okf-thread-delete") as FakeElement).click();
  assert.deepEqual(JSON.parse(JSON.stringify(asked)), [{ type: "previewThreadDelete", payload: { line: 5, endLine: 9 } }]);
});

test("Cmd or Ctrl+Enter in the box replies, and keys in the box never reach the page", () => {
  const { root, threads, asked } = setup();
  const { body } = thread(root);
  threads.apply();
  field(body).value = "go";
  const plain = field(body).fire("keydown", { key: "Enter" });
  assert.equal(plain.stopped, 1);
  assert.equal(asked.length, 0);
  field(body).fire("keydown", { key: "Enter", metaKey: true });
  assert.equal(asked.length, 1);
});

test("an open edit blocks the change with its reason, and a thread without lines is not sent", () => {
  const blocked = setup({ blocked: "Save or cancel the open edit first." });
  const first = thread(blocked.root);
  blocked.threads.apply();
  field(first.body).value = "x";
  (part(first.body, "data-okf-thread-reply") as FakeElement).click();
  assert.equal(blocked.asked.length, 0);
  assert.equal(part(first.body, "data-okf-thread-actions").descendants().find((e) => e.className === "okf-thread-status")!.textContent, "Save or cancel the open edit first.");

  const bare = setup();
  const second = thread(bare.root, {});
  bare.threads.apply();
  (part(second.body, "data-okf-thread-delete") as FakeElement).click();
  assert.equal(bare.asked.length, 0);
});
