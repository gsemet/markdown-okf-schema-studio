import * as assert from "node:assert/strict";
import { test } from "node:test";

import { formatStatusDiagnostic, setPreviewStatus } from "../../src/preview/previewStatus";
import {
  installWarningBanner,
  warningBannerState,
  warningBannerText,
} from "../../src/webview/warningBanner";
import { FakeDocument, FakeElement } from "./fakeDom";

const DOLLAR = "/work/chapter.md:3: Warning: `$...$` is used but this needs the MyST extension `dollarmath`.";
const COLON = "/work/chapter.md:6: Warning: `:::` is used but this needs the MyST extension `colon_fence`.";

test("CR 050: the banner shows only for a successful render with conf.py warnings", () => {
  assert.equal(warningBannerState("success", [DOLLAR]).visible, true);
  assert.equal(warningBannerState("success", [DOLLAR, COLON]).count, 2);
  assert.deepEqual(warningBannerState("success", []), { visible: false, key: "", count: 0 });
  for (const status of ["pending", "stale", "error", "missing-source", "recovery", null, undefined]) {
    assert.equal(warningBannerState(status, [DOLLAR]).visible, false, String(status));
  }
});

test("CR 050: the key names the warning set, whatever the order and the line of each warning", () => {
  const key = warningBannerState("success", [DOLLAR, COLON]).key;
  assert.match(key, /^[0-9a-z]+-[0-9a-f]{8}$/u);
  assert.equal(warningBannerState("success", [COLON, DOLLAR]).key, key, "order");
  assert.equal(warningBannerState("success", [DOLLAR.replace(":3:", ":9:"), COLON]).key, key, "a moved line");
  assert.equal(warningBannerState("success", [DOLLAR.replace(":3:", ":9:12:"), COLON]).key, key, "a column");
  assert.notEqual(warningBannerState("success", [DOLLAR]).key, key, "a warning less");
  assert.notEqual(warningBannerState("success", [DOLLAR, COLON.replace("colon_fence", "deflist")]).key, key, "another warning");
});

test("CR 050: a closed set stays closed; another set shows the banner again", () => {
  const key = warningBannerState("success", [DOLLAR, COLON]).key;
  assert.equal(warningBannerState("success", [DOLLAR, COLON], key).visible, false);
  assert.equal(warningBannerState("success", [DOLLAR], key).visible, true);
});

test("CR 050: the banner text is short and counts the warnings", () => {
  assert.equal(warningBannerText(1), "1 MyST syntax warning from conf.py");
  assert.equal(warningBannerText(3), "3 MyST syntax warnings from conf.py");
});

test("CR 050: the status region marks the conf.py warnings with their code", () => {
  assert.deepEqual(formatStatusDiagnostic({ message: "m", file: "a.md", line: 2, severity: "warning", code: "myst-extension" }),
    { severity: "warning", text: "a.md:2: m", code: "myst-extension" });
  assert.deepEqual(formatStatusDiagnostic({ message: "m" }), { severity: "error", text: "m" });
  const html = setPreviewStatus("<body><main></main></body>", "success", undefined, [
    { message: "needs <dollarmath>", file: "a.md", line: 2, severity: "warning", code: "myst-extension" },
    { message: "plain", severity: "warning" },
  ]);
  assert.match(html, /<li data-sphinx-preview-diagnostic-severity="warning" data-sphinx-preview-diagnostic-code="myst-extension">a\.md:2: needs &lt;dollarmath&gt;<\/li>/u);
  assert.match(html, /<li data-sphinx-preview-diagnostic-severity="warning">plain<\/li>/u);
});

/** A page with a status region holding these diagnostics (code per line). */
function page(status: string, lines: Array<[string, string | undefined]>): { document: FakeDocument; region: FakeElement } {
  const document = new FakeDocument();
  const region = document.createElement("aside");
  region.setAttribute("data-sphinx-preview-status", status);
  const list = document.createElement("ul");
  for (const [text, code] of lines) {
    const item = document.createElement("li");
    item.setAttribute("data-sphinx-preview-diagnostic-severity", "warning");
    if (code) item.setAttribute("data-sphinx-preview-diagnostic-code", code);
    item.textContent = text;
    list.appendChild(item);
  }
  region.appendChild(list);
  document.body.insertBefore(region, document.body.firstChild);
  return { document, region };
}

function install(document: FakeDocument, extra: Record<string, unknown> = {}) {
  const messages: Array<Record<string, unknown>> = [];
  const context = { documentId: "file:///chapter.md", revision: 4, requestId: 9, ...extra };
  const banner = installWarningBanner(document, { postMessage: (message) => messages.push(message as Record<string, unknown>) },
    context, warningBannerState, warningBannerText);
  return { banner, messages, context };
}

const bannersOf = (document: FakeDocument) => document.querySelectorAll("[data-sphinx-preview-warning-banner]");

test("CR 050: the page shows one banner for the myst-extension lines, after the status region", () => {
  const { document, region } = page("success", [[DOLLAR, "myst-extension"], [COLON, "myst-extension"], ["image refused", "resource-outside"]]);
  const { banner } = install(document);
  banner.update();
  const [element] = bannersOf(document);
  assert.ok(element, "a banner");
  assert.equal(bannersOf(document).length, 1);
  assert.equal(element.getAttribute("role"), "status");
  assert.equal(element.getAttribute("aria-live"), "polite");
  assert.equal(element.previousSibling, region, "right after the status region");
  assert.equal(element.querySelector("[data-sphinx-preview-warning-icon]")?.getAttribute("aria-hidden"), "true");
  assert.equal(element.querySelector("[data-sphinx-preview-warning-text]")?.textContent, "2 MyST syntax warnings from conf.py");
  const close = element.querySelector("[data-sphinx-preview-warning-close]")!;
  assert.equal(close.tagName, "button");
  assert.equal(close.getAttribute("type"), "button");
  assert.equal(close.getAttribute("aria-label"), "Close the warning");
  assert.ok(element.querySelector("[data-sphinx-preview-warning-problems]"), "the Problems button");
  assert.equal(element.getAttribute("style"), null, "no inline style");
  banner.update();
  assert.equal(bannersOf(document).length, 1, "an update with the same set keeps the one banner");
});

test("CR 050: no banner for other warnings or another status", () => {
  for (const [status, code] of [["success", "myst-diagnostic"], ["stale", "myst-extension"], ["error", "myst-extension"]]) {
    const { document } = page(status, [[DOLLAR, code]]);
    const { banner } = install(document);
    banner.update();
    assert.equal(bannersOf(document).length, 0, `${status} ${code}`);
  }
});

test("CR 050: Open Problems asks the host to open the Problems view", () => {
  const { document } = page("success", [[DOLLAR, "myst-extension"]]);
  const { banner, messages } = install(document);
  banner.update();
  (bannersOf(document)[0].querySelector("[data-sphinx-preview-warning-problems]") as FakeElement).listeners.get("click")![0]({});
  assert.deepEqual(messages, [{ type: "previewShowProblems", documentId: "file:///chapter.md", revision: 4, requestId: 9 }]);
});

test("CR 050: closing removes the banner, tells the host the key and keeps it closed until the set changes", () => {
  const { document, region } = page("success", [[DOLLAR, "myst-extension"], [COLON, "myst-extension"]]);
  const { banner, messages, context } = install(document);
  banner.update();
  const key = banner.state().key;
  context.revision = 5;
  (bannersOf(document)[0].querySelector("[data-sphinx-preview-warning-close]") as FakeElement).listeners.get("click")![0]({});
  assert.equal(bannersOf(document).length, 0, "gone");
  assert.deepEqual(messages, [{ type: "previewWarningBannerClosed", documentId: "file:///chapter.md", revision: 5, requestId: 9, key }]);
  banner.update();
  assert.equal(bannersOf(document).length, 0, "the same set after a patch stays closed");
  region.querySelector("li")!.remove();
  banner.update();
  assert.equal(bannersOf(document).length, 1, "a changed set shows it again");
});

test("CR 050: the key closed in an earlier load of the document keeps the banner closed", () => {
  const { document } = page("success", [[DOLLAR, "myst-extension"]]);
  const key = warningBannerState("success", [DOLLAR]).key;
  const { banner } = install(document, { dismissedWarningBanner: key });
  banner.update();
  assert.equal(bannersOf(document).length, 0);
});

test("CR 050: in Restricted Mode the banner has no Problems button and lists the warnings in its tooltip", () => {
  const { document } = page("success", [[DOLLAR, "myst-extension"], [COLON, "myst-extension"]]);
  const { banner } = install(document, { warningsInProblems: false });
  banner.update();
  const [element] = bannersOf(document);
  assert.equal(element.querySelector("[data-sphinx-preview-warning-problems]"), null);
  assert.equal(element.getAttribute("title"), `${DOLLAR}\n${COLON}`);
  assert.ok(element.querySelector("[data-sphinx-preview-warning-close]"));
});
