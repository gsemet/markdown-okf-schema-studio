import * as assert from "node:assert/strict";
import { test } from "node:test";

import { FrameLookupLog, frameUrlSkipReason, scanWebviewFrames, webviewFrames } from "../shared/webviewFrames";

/** The two frames VS Code makes for one webview: the host frame and the frame that holds the content. */
const HOST_URL = "vscode-webview://1abc/index.html?id=2def&extensionId=GaetanSemet.markdown-okf-schema-studio&platform=electron";
const CONTENT_URL = "vscode-webview://1abc/fake.html?id=2def";
const WORKBENCH_URL = "vscode-file://vscode-app/out/vs/code/electron-browser/workbench/workbench.html";

interface FakeFrame {
  url(): string;
  locator(selector: string): void;
}

/** A frame that records the name of every member read on it. */
function fakeFrame(url: string): { frame: FakeFrame; calls: string[] } {
  const calls: string[] = [];
  const frame = new Proxy({} as FakeFrame, {
    get: (_target, property) => {
      calls.push(String(property));
      return property === "url" ? () => url : () => undefined;
    },
  });
  return { frame, calls };
}

test("CR-509: only a VS Code webview URL can be the Studio frame", () => {
  assert.equal(frameUrlSkipReason(HOST_URL), undefined);
  assert.equal(frameUrlSkipReason(CONTENT_URL), undefined);
  assert.equal(frameUrlSkipReason("vscode-webview://1abc/another.html"), undefined, "no webview URL is narrowed out");
  assert.equal(frameUrlSkipReason(""), "empty URL (no document committed)");
  assert.equal(frameUrlSkipReason("about:blank"), "about:blank");
  assert.equal(frameUrlSkipReason(WORKBENCH_URL), "not a vscode-webview:// URL");
  assert.equal(frameUrlSkipReason("https://example.invalid/vscode-webview://"), "not a vscode-webview:// URL");
});

test("CR-509: a lookup reads nothing but url() on a blank, about:blank or non-webview frame", async () => {
  const skipped = [fakeFrame(""), fakeFrame("about:blank"), fakeFrame(WORKBENCH_URL)];
  const host = fakeFrame(HOST_URL);
  const content = fakeFrame(CONTENT_URL);
  const frames = [...skipped, host, content].map((fake) => fake.frame);
  const scan = await scanWebviewFrames(frames, async (frame) => {
    frame.locator("#sphinx-myst-preview-content");
    return frame === content.frame ? undefined : "no preview content";
  });
  assert.equal(scan.found, content.frame);
  for (const fake of skipped) assert.deepEqual([...new Set(fake.calls)], ["url"]);
  assert.ok(host.calls.includes("locator") && content.calls.includes("locator"), "both webview frames are inspected");
  assert.deepEqual(scan.seen, [
    "\"\" skipped: empty URL (no document committed)",
    "\"about:blank\" skipped: about:blank",
    `"${WORKBENCH_URL}" skipped: not a vscode-webview:// URL`,
    `"${HOST_URL}" kept: no preview content`,
    `"${CONTENT_URL}" kept: the current Studio frame`,
  ]);
});

test("CR-509: the webview frames of a page are picked by url() alone", () => {
  const blank = fakeFrame("");
  const content = fakeFrame(CONTENT_URL);
  const picked = webviewFrames([blank.frame, content.frame]);
  assert.equal(picked.length, 1);
  assert.equal(picked[0], content.frame);
  assert.deepEqual([...new Set(blank.calls)], ["url"]);
});

test("CR-509: a wait that timed out lists the frames of its own last lookup that found nothing", () => {
  const log = new FrameLookupLog();
  const wait = log.mark();
  assert.equal(log.describeSince(wait), "", "no lookup during the wait");
  log.record({ found: undefined, seen: ["first"] });
  log.record({ found: undefined, seen: ["\"\" skipped: empty URL", "\"x\" kept: hidden"] });
  assert.equal(log.describeSince(wait),
    " Frames of the last Studio frame lookup: \"\" skipped: empty URL; \"x\" kept: hidden.");
  assert.equal(log.describeSince(log.mark()), "", "the lookup ran before this wait");
  log.record({ found: "frame", seen: ["\"x\" kept: the current Studio frame"] });
  assert.equal(log.describeSince(wait), "", "the last lookup found the frame");
  log.record({ found: undefined, seen: [] });
  assert.equal(log.describeSince(wait), " Frames of the last Studio frame lookup: none.");
});
