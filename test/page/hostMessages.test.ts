import * as assert from "node:assert/strict";
import { test } from "node:test";

import { readBootContext } from "../../src/page/bootContext";
import { createPageHostMessages } from "../../src/page/hostMessages";
import { createVsCodeTransport, type HostTransport } from "../../src/page/hostTransport";
import { RUNTIME_CONTEXT_ATTRIBUTE, serializeRuntimeContext } from "../../src/core/protocol/bootContext";

function pushTransport(): { transport: HostTransport; send(data: unknown): void } {
  let listener: ((data: unknown) => void) | undefined;
  return {
    transport: { postMessage: () => undefined, getState: () => undefined, setState: () => undefined, onMessage: (next) => { listener = next; } },
    send: (data) => listener?.(data),
  };
}

test("a host message addressed to the page reaches its handler; any other goes to unhandled", () => {
  const messages = createPageHostMessages();
  const { transport, send } = pushTransport();
  const page = { documentId: "file:///a.md", revision: 2, requestId: 5 };
  const themes: number[] = [];
  const unhandled: unknown[] = [];
  messages.router.on("themeChanged", (message) => { themes.push(message.themeKind); });
  messages.listen(transport, page, (message) => unhandled.push(message));
  send({ type: "themeChanged", documentId: "file:///a.md", revision: 2, requestId: 5, themeKind: 2 });
  const stale = { type: "themeChanged", documentId: "file:///a.md", revision: 1, requestId: 4, themeKind: 1 };
  send(stale);
  send("not a message");
  assert.deepEqual(themes, [2]);
  assert.deepEqual(unhandled, [stale, "not a message"]);
});

test("the page is read at each message, so a moved render identity applies at once", () => {
  const messages = createPageHostMessages();
  const { transport, send } = pushTransport();
  const page = { documentId: "file:///a.md", revision: 2, requestId: 5 };
  const themes: number[] = [];
  messages.router.on("themeChanged", (message) => { themes.push(message.themeKind); });
  messages.listen(transport, page, () => undefined);
  page.revision = 3;
  send({ type: "themeChanged", documentId: "file:///a.md", revision: 2, requestId: 5, themeKind: 1 });
  send({ type: "themeChanged", documentId: "file:///a.md", revision: 3, requestId: 5, themeKind: 2 });
  assert.deepEqual(themes, [2]);
});

test("the VS Code transport passes the webview API through and unwraps window message events", () => {
  const posted: unknown[] = [];
  let saved: unknown = { a: 1 };
  let onWindowMessage: ((event: Event) => void) | undefined;
  const transport = createVsCodeTransport(
    { postMessage: (message) => posted.push(message), getState: () => saved, setState: (state) => { saved = state; } },
    { addEventListener: ((type: string, listener: (event: Event) => void) => { if (type === "message") onWindowMessage = listener; }) as Window["addEventListener"] },
  );
  const received: unknown[] = [];
  transport.onMessage((data) => received.push(data));
  onWindowMessage?.({ data: { type: "x" } } as unknown as Event);
  transport.postMessage({ type: "previewReady" });
  transport.setState({ b: 2 });
  assert.deepEqual(received, [{ type: "x" }]);
  assert.deepEqual(posted, [{ type: "previewReady" }]);
  assert.deepEqual(transport.getState(), { b: 2 });
});

test("the boot context round-trips through its inert JSON element; a page without one reads {}", () => {
  const context = { documentId: "file:///a</script>.md", revision: 1, requestId: 2, activeSourceFile: "/a.md" };
  const text = serializeRuntimeContext(context);
  assert.doesNotMatch(text, /</u);
  const page = {
    querySelector: (selector: string) => selector === `script[${RUNTIME_CONTEXT_ATTRIBUTE}]` ? { textContent: text } : null,
  } as unknown as Document;
  assert.deepEqual(readBootContext(page), context);
  assert.deepEqual(readBootContext({ querySelector: () => null } as unknown as Document), {});
});
