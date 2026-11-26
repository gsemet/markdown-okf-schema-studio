/**
 * Acceptance of the trust-security use cases in a trusted window: one test per use-case path, each
 * from its starting state to its final result, driven through the product itself.
 */
import * as assert from "node:assert/strict";
import * as path from "node:path";
import type { Browser, Page, Request } from "playwright-core";
import * as vscode from "vscode";

import type { WindowKind } from "../../shared/acceptanceCampaign";
import { attribute, findElements, parseHtml, textContent } from "../../core/render/dom";
import { getActivePreviewForTests } from "../extensionApi";
import { currentPreviewFrame, withCurrentFrame } from "../realInput/harness";
import { step } from "../stepWatchdog";
import { waitForFirstClickReady } from "../windowFocus";
import {
  prepareWorkbench,
  previewState,
  showsCurrentRender,
  waitForState,
  withFixturePreview,
} from "./support";

export const windowKind: WindowKind = "trusted";

const GROUP = "trust-security";
const CONTENT = "#sphinx-myst-preview-content";
/** The host every network address of `hostile.md` names; it never resolves. */
const REMOTE_HOST = "example.invalid";

/** True when `folder` is `root` or lies below it. */
function contains(root: string, folder: string): boolean {
  const relative = path.relative(root, folder);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/**
 * Path "show an image of the document": a document refers to an image beside it, the page holds a
 * webview address of that file inside an allowed folder, and the page shows the image from there.
 */
// @accepts_req StRS-MDOKFSTUDIO-TRUST-004#S1
async function showsALocalImage(page: Page): Promise<void> {
  const alt = "A diagram kept next to the document";
  await withFixturePreview(GROUP, ["local-image.md", "diagram.svg"], async (source) => {
    assert.ok(source.getText().includes("(diagram.svg)"), "the document refers to the image beside it");
    const folder = path.dirname(source.uri.fsPath);
    const file = `${path.basename(folder)}/diagram.svg`;
    const preview = getActivePreviewForTests();
    assert.ok(preview, "the preview is gone");

    const images = findElements(parseHtml(preview.html), (element) =>
      element.tagName === "img" && attribute(element, "alt") === alt);
    assert.equal(images.length, 1, `the page holds ${images.length} images of the document, not one`);
    const address = attribute(images[0], "src") ?? "";
    assert.notEqual(address, "diagram.svg", "the page holds the path of the document, not a webview address");
    assert.ok(decodeURIComponent(address).includes(file), `the address of the image is not the file ${file}: ${address}`);
    // The allowed folders of a trusted window are the workspace folder and the bundle, not the
    // folder of the document itself: one of them has to contain it.
    const roots = preview.localResourceRoots.map((root) => root.fsPath);
    assert.ok(roots.some((root) => contains(root, folder)),
      `no allowed folder of the page holds the folder of the document ${folder}: ${JSON.stringify(roots)}`);

    const shown = await waitForState("the image to be decoded in the page", () =>
      withCurrentFrame(page, (frame) => frame.evaluate((wanted) => {
        const image = Array.from(document.querySelectorAll<HTMLImageElement>("#sphinx-myst-preview-content img"))
          .find((candidate) => candidate.alt === wanted);
        return image === undefined
          ? undefined
          : { complete: image.complete, width: image.naturalWidth, source: image.currentSrc };
      }, alt)), (image) => image !== undefined && image.complete && image.width > 0);
    assert.ok(decodeURIComponent(shown?.source ?? "").includes(file), `the page shows another file: ${shown?.source}`);
  });
}

/** The page the host assigned: only the Studio's scripts, nothing active, nothing loaded remotely. */
function assertInertPage(html: string): void {
  const page = parseHtml(html);
  const policies = findElements(page, (element) =>
    element.tagName === "meta" && attribute(element, "http-equiv") === "Content-Security-Policy");
  assert.equal(policies.length, 1, `the page carries ${policies.length} content security policies, not one`);
  const policy = attribute(policies[0], "content") ?? "";
  for (const directive of ["default-src 'none'", "connect-src 'none'", "frame-src 'none'", "object-src 'none'"]) {
    assert.ok(policy.includes(directive), `the policy lacks ${directive}: ${policy}`);
  }
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|(?:^|\s)\*(?:\s|;|$)/u);
  const nonce = /'nonce-([^']+)'/u.exec(policy)?.[1];
  assert.ok(nonce, `the policy carries no nonce: ${policy}`);

  // The scripts of the document are gone: each script left is one of the Studio's.
  const scripts = findElements(page, (element) => element.tagName === "script"
    && attribute(element, "type") !== "application/json");
  assert.ok(scripts.length > 0, "the page runs no script of the Studio");
  for (const script of scripts) {
    const source = attribute(script, "src");
    assert.equal(attribute(script, "nonce"), nonce, `a script lacks the page nonce: ${source ?? textContent(script)}`);
    assert.ok(source, `an inline script reached the page: ${textContent(script).slice(0, 200)}`);
    assert.ok(!source.includes(REMOTE_HOST), `a script of the document reached the page: ${source}`);
  }

  // The raw HTML is inert.
  const names = (elements: ReturnType<typeof findElements>): string[] => elements.map((element) => element.tagName);
  assert.deepEqual(names(findElements(page, (element) =>
    ["iframe", "object", "embed", "frame", "form"].includes(element.tagName))), [], "a frame, object or form is left");
  assert.deepEqual(names(findElements(page, (element) =>
    element.attrs.some((entry) => /^on/iu.test(entry.name)))), [], "an on* attribute is left");
  assert.deepEqual(names(findElements(page, (element) =>
    element.tagName === "style" && textContent(element).includes("hostile-style"))), [], "the document's style is left");
  assert.deepEqual(names(findElements(page, (element) =>
    element.tagName === "meta" && attribute(element, "http-equiv")?.toLowerCase() === "refresh")), [], "a refresh is left");
  assert.deepEqual(names(findElements(page, (element) =>
    element.tagName === "a" && /^\s*javascript:/iu.test(attribute(element, "href") ?? ""))), [], "a javascript: link is left");
  const remote = findElements(page, (element) => element.attrs.some((entry) =>
    entry.value.includes(REMOTE_HOST) && (["src", "data", "srcset", "poster", "action"].includes(entry.name)
      || (entry.name === "href" && element.tagName === "link"))));
  assert.deepEqual(names(remote), [], "the page loads from a network address");
}

/**
 * Path "preview a document that carries scripts and unsafe HTML": the document holds a script and
 * raw HTML, the page has neither its scripts nor anything active, and shows the document without
 * running foreign code or loading from the network.
 */
// @accepts_req StRS-MDOKFSTUDIO-TRUST-006#S1
async function showsAHostileDocumentInert(browser: Browser, page: Page): Promise<void> {
  const sentence = "The reader still sees this sentence.";
  const requests: string[] = [];
  const record = (request: Request): void => {
    if (request.url().includes(REMOTE_HOST)) requests.push(request.url());
  };
  const context = browser.contexts()[0];
  assert.ok(context, "the workbench has no browser context");
  context.on("request", record);
  try {
    await withFixturePreview(GROUP, ["hostile.md"], async (source) => {
      for (const part of ["<script>", "<iframe ", "onerror=", "javascript:", `https://${REMOTE_HOST}/`]) {
        assert.ok(source.getText().includes(part), `the hostile fixture lacks ${part}`);
      }
      const preview = getActivePreviewForTests();
      assert.ok(preview, "the preview is gone");
      assertInertPage(preview.html);

      const live = await waitForState("the document in the page", () =>
        withCurrentFrame(page, (frame) => frame.evaluate((host) => {
          const content = document.getElementById("sphinx-myst-preview-content");
          const elements = Array.from(content?.querySelectorAll("*") ?? []);
          const loads = (element: Element): boolean => ["src", "data", "srcset", "poster", "action"]
            .some((name) => element.getAttribute(name)?.includes(host) === true)
            || (element.tagName === "LINK" && element.getAttribute("href")?.includes(host) === true);
          return {
            text: content?.textContent ?? "",
            hostileRan: String((window as unknown as { hostileRan?: unknown }).hostileRan),
            documentScripts: Array.from(document.scripts).filter((script) => script.type !== "application/json"
              && (script.src.includes(host) || (script.textContent ?? "").includes("hostileRan"))).length,
            active: elements.filter((element) => element.matches("iframe, object, embed, frame, form"))
              .map((element) => element.tagName),
            handlers: elements.filter((element) => Array.from(element.attributes)
              .some((entry) => entry.name.startsWith("on"))).map((element) => element.tagName),
            remote: Array.from(document.querySelectorAll("*")).filter(loads).map((element) => element.tagName),
          };
        }, REMOTE_HOST)), (state) => state.text.includes(sentence));
      const { text, ...found } = live;
      assert.ok(text.includes(sentence));
      assert.deepEqual(found, { hostileRan: "undefined", documentScripts: 0, active: [], handlers: [], remote: [] },
        "the page shows foreign code or a network load");
      assert.deepEqual(requests, [], "the window asked the network for a resource of the document");
    });
  } finally {
    context.off("request", record);
  }
}

/**
 * Path "the page asks the host to act": the Copy button of a code block, clicked by the reader,
 * sends its message to the host, whose handler of that type writes the clipboard and answers.
 */
// @accepts_req StRS-MDOKFSTUDIO-TRUST-009#S1
async function sendsAPageMessageToItsHandler(page: Page): Promise<void> {
  const code = "const answer = 42;\nconsole.log(answer);\n";
  const button = "[data-sphinx-preview-code-copy]";
  await withFixturePreview(GROUP, ["copy-code.md"], async () => {
    const previous = await vscode.env.clipboard.readText();
    await vscode.env.clipboard.writeText("studio acceptance: nothing was copied");
    try {
      await waitForFirstClickReady(page);
      await withCurrentFrame(page, (frame) => frame.locator(`${CONTENT} pre`).first().hover());
      await waitForState("the Copy button over the code block", () =>
        withCurrentFrame(page, (frame) => frame.locator(button).isVisible()), (visible) => visible);
      await withCurrentFrame(page, (frame) => frame.locator(button).click());
      await waitForState("the host to write the code to the clipboard and the page to say Copied", async () => ({
        clipboard: await vscode.env.clipboard.readText(),
        label: await withCurrentFrame(page, (frame) => frame.locator(button).getAttribute("aria-label")),
      }), (state) => state.clipboard === code && state.label === "Copied");
    } finally {
      await vscode.env.clipboard.writeText(previous);
    }
  });
}

async function appendParagraph(document: vscode.TextDocument, text: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, document.positionAt(document.getText().length), `\n${text}\n`);
  assert.equal(await vscode.workspace.applyEdit(edit), true, "the document refused the edit");
}

/** The page shows the current version of `document` and the host has no further update pending. */
async function waitForSettledPage(document: vscode.TextDocument, patchesBefore = -1) {
  const state = await waitForState(
    "the page to show the current version with no update pending",
    previewState,
    (current) => showsCurrentRender(document, current) && current?.deferredWorkPending === false
      && current.contentPatches > patchesBefore,
    30_000,
  );
  assert.ok(state);
  return state;
}

/**
 * Path "the host answers the page": the host sends a content patch for a new version of the
 * document, and the page accepts it: the same page shows the new text, without being loaded again.
 */
// @accepts_req StRS-MDOKFSTUDIO-TRUST-009#S2
async function acceptsAContentPatchOfTheHost(page: Page): Promise<void> {
  const added = "A paragraph that arrives in a content patch.";
  await withFixturePreview(GROUP, ["host-patch.md"], async (document) => {
    // A first edit absorbs the renders that follow the opening, so the counters below are the measured edit's.
    await appendParagraph(document, "A first paragraph, before the measured one.");
    const before = await waitForSettledPage(document);
    const frame = await currentPreviewFrame(page);
    await frame.evaluate(() => {
      (window as unknown as { studioAcceptanceMark?: string }).studioAcceptanceMark = "kept";
    });

    await appendParagraph(document, added);
    const after = await waitForSettledPage(document, before.contentPatches);
    await waitForState("the added paragraph in the same page", () => frame.locator(CONTENT).innerText(),
      (text) => text.includes(added));
    assert.equal(after.htmlAssignments, before.htmlAssignments,
      `the page was assigned again instead of patched: ${JSON.stringify({ before, after })}`);
    assert.equal(frame.isDetached(), false, "the page was replaced");
    assert.equal(await frame.evaluate(() =>
      (window as unknown as { studioAcceptanceMark?: string }).studioAcceptanceMark), "kept", "the page was loaded again");
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-request-id"), String(after.requestId),
      "the page does not carry the render of the patch");
  });
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true, "this acceptance file runs in a trusted window");
  const { browser, page } = await prepareWorkbench();
  try {
    await step("trust-004-s1-local-image", () => showsALocalImage(page));
    await step("trust-006-s1-hostile-document", () => showsAHostileDocumentInert(browser, page));
    await step("trust-009-s1-page-message", () => sendsAPageMessageToItsHandler(page));
    await step("trust-009-s2-content-patch", () => acceptsAContentPatchOfTheHost(page));
  } finally {
    await browser.close();
  }
}
