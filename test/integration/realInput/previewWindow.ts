import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  type Frame,
  type Page,
} from "playwright-core";

import { cutLabels, measureMermaidImageLabels } from "../../shared/mermaidImageLabels";
import {
  COMMAND_ID,
  deserializePreviewPanelForTests,
  getActivePreviewForTests,
  getActivePreviewPanelForTests,
  PANEL_VIEW_TYPE,
  previewGroupUnlocksSettledForTests,
} from "../extensionApi";
import {
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  lines,
  MOD,
  openSidePreview,
  openStudioEditor,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";
import { captureAfter, realInputId, SMOKE, withDocument, withSmokeDocument } from "./common";
import { run } from "./run";

/** RI-T31: moving focus between the editor and the preview does not move the preview. */
export async function scenarioFocusChangeKeepsPreviewStill(page: Page, evidence: Evidence): Promise<void> {
  const TRACKER_CELL = "table tbody tr:first-child td:nth-child(2)";
  const chapter = fs.readFileSync(
    path.resolve(__dirname, "../../../..", "test", "visual", "fixtures", "05-long-chapter.md"), "utf8");
  await withDocument("realinput-t31", chapter, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    const scrollY = (): Promise<number> => withCurrentFrame(page, (frame) => frame.evaluate(() => window.scrollY));
    const wheelPreview = async (delta: number): Promise<void> => {
      const box = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
      assert.ok(box, "the preview frame has a bounding box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, delta);
      await new Promise((resolve) => setTimeout(resolve, 800));
    };
    await wheelPreview(1200);
    const y0 = await scrollY();
    assert.ok(y0 > 300, "the preview scrolled before the focus change (scrollY " + y0 + ")");

    // Case A: click into the source editor, then type.
    const restoreCallsBefore = getActivePreviewForTests()?.restorePreviewStateCalls;
    assert.ok(restoreCallsBefore !== undefined, "the restore-call counter is exposed");
    // The visible editor viewport, not `.view-lines`: that element is as tall as the whole document
    // and moves with the editor's scroll, so a fraction of it can land on the title bar or a tab.
    const editorBox = await page.locator(".monaco-editor:visible").first().boundingBox();
    assert.ok(editorBox, "the source editor has a bounding box");
    await page.mouse.click(editorBox.x + editorBox.width / 3, editorBox.y + editorBox.height * 0.3);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const y1 = await scrollY();
    await typeText(page, "x");
    await waitForRender(document);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const y2 = await scrollY();
    console.log("RI-T31 case A: Y0=" + y0 + " Y1=" + y1 + " Y2=" + y2);
    assert.ok(Math.abs(y1 - y0) <= 4, "clicking the editor moved the preview from " + y0 + " to " + y1);
    assert.ok(Math.abs(y2 - y0) <= 4, "typing in the editor moved the preview from " + y0 + " to " + y2);
    assert.strictEqual(getActivePreviewForTests()?.restorePreviewStateCalls, restoreCallsBefore,
      "a focus-only view state change must not run restorePreviewState");

    // Case B: click a table cell in edit mode. The in-flow toolbar legitimately scrolls the page
    // (R7), so the clicked cell's viewport top is the measure, not scrollY.
    await setEditMode(page, true);
    await waitFor("the observability table cell", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator(TRACKER_CELL).count() === 1;
    });
    await wheelPreview(400);
    const cellTop = (): Promise<number | undefined> => withCurrentFrame(page, async (frame) => {
      const box = await frame.locator(TRACKER_CELL).boundingBox();
      const host = await (await frame.frameElement()).boundingBox();
      return box === null || host === null ? undefined : box.y - host.y;
    });
    const cellPoint = (): Promise<{ x: number; y: number } | undefined> => withCurrentFrame(page, async (frame) => {
      const box = await frame.locator(TRACKER_CELL).boundingBox();
      return box === null ? undefined : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    const tableTop = (): Promise<number | undefined> => withCurrentFrame(page, async (frame) => {
      const box = await frame.locator("table").first().boundingBox();
      const host = await (await frame.frameElement()).boundingBox();
      return box === null || host === null ? undefined : box.y - host.y;
    });
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const top = await tableTop();
      const point = await cellPoint();
      const viewport = page.viewportSize();
      if (top !== undefined && top >= 250 && point !== undefined && viewport !== null
        && point.y < viewport.height - 80) break;
      const delta = top !== undefined && top < 250 ? Math.min(-100, top - 300) : 400;
      await wheelPreview(delta);
    }
    const top0 = await cellTop();
    const point = await cellPoint();
    assert.ok(top0 !== undefined && point !== undefined, "the table cell is on screen");
    await page.mouse.click(point.x, point.y);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const top1 = await cellTop();
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const top2 = await cellTop();
    console.log("RI-T31 case B cell top: before=" + top0 + " after100ms=" + top1 + " editorOpen=" + top2);
    assert.ok(top1 !== undefined && Math.abs(top1 - top0) <= 4,
      "clicking a table cell moved it on screen from " + top0 + " to " + top1);
    assert.ok(top2 !== undefined && Math.abs(top2 - top0) <= 4,
      "opening the cell editor moved the cell on screen from " + top0 + " to " + top2);
    await captureAfter(evidence, page, "lifecycle-sync/r03-focus-change-keeps-scroll",
      "The preview was scrolled, then the editor was clicked and typed in, then a table cell was "
      + "clicked; the page scroll and the cell's position on screen stayed within 4 px.");
  });
}

/** RI-T31b: a hidden preview that becomes visible again catches up with the moved editor. */
export async function scenarioHiddenPreviewCatchesUp(page: Page, evidence: Evidence): Promise<void> {
  const sections: string[] = [];
  for (let index = 0; index < 300; index += 1) {
    sections.push("## Section " + index, "", "Paragraph " + index + " line one", "continues on line two.", "");
  }
  await withDocument("realinput-t31b", sections.join("\n"), async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    const panel = getActivePreviewPanelForTests();
    assert.ok(panel, "the side preview panel exists");
    await waitFor("the preview to be visible", () => panel.visible);
    const sourceEditor = vscode.window.visibleTextEditors.find((editor) =>
      editor.document.uri.toString() === document.uri.toString() && editor.viewColumn === vscode.ViewColumn.One);
    assert.ok(sourceEditor, "the source editor is in the left group");
    const editorTop = (): number => sourceEditor.visibleRanges[0]?.start.line ?? -1;

    // Hide the preview by opening another editor in its group.
    const otherPath = path.join(path.dirname(document.uri.fsPath), "other.txt");
    fs.writeFileSync(otherPath, "Other\n");
    const other = await vscode.workspace.openTextDocument(vscode.Uri.file(otherPath));
    await vscode.window.showTextDocument(other, { viewColumn: panel.viewColumn, preserveFocus: true });
    await waitFor("the preview panel to be hidden", () => !panel.visible);

    // Scroll the source editor by about 200 lines while the preview is hidden.
    const before = editorTop();
    sourceEditor.revealRange(new vscode.Range(before + 200, 0, before + 200, 0), vscode.TextEditorRevealType.AtTop);
    await waitFor("the source editor to scroll", () => editorTop() >= before + 150);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const restoreCallsBefore = getActivePreviewForTests()?.restorePreviewStateCalls;
    assert.ok(restoreCallsBefore !== undefined, "the restore-call counter is exposed");
    // Reveal the panel again; it must catch up with the editor.
    panel.reveal(panel.viewColumn, true);
    await waitFor("the preview panel to be visible again", () => panel.visible);
    await waitFor("restorePreviewState to run on the hidden to visible transition",
      () => (getActivePreviewForTests()?.restorePreviewStateCalls ?? 0) >= restoreCallsBefore + 1);
    // The preview's anchor block: the last block starting at or above the reading line. The editor's
    // top line must lie within 2 lines of that block's span.
    const anchorDistance = (): Promise<number> => withCurrentFrame(page, (frame) => frame.evaluate((line) => {
      const blocks = Array.from(window.document.querySelectorAll<HTMLElement>("[data-sphinx-source-line]"))
        .map((element) => ({ element, start: Number(element.dataset.sphinxSourceLine) }))
        .sort((left, right) => left.start - right.start);
      const band = window.document.querySelector<HTMLElement>("[data-sphinx-preview-sticky-headings]");
      const controls = parseFloat(getComputedStyle(window.document.documentElement)
        .getPropertyValue("--sphinx-preview-controls-height")) || 0;
      const readingLine = band && !band.hidden ? band.getBoundingClientRect().bottom : controls;
      let index = -1;
      for (let i = 0; i < blocks.length; i += 1) {
        if (blocks[i].element.getBoundingClientRect().top <= readingLine + 1) index = i;
      }
      if (index < 0) return Number.POSITIVE_INFINITY;
      const start = blocks[index].start;
      const end = (blocks[index + 1]?.start ?? start + 1) - 1;
      return line < start ? start - line : line > end ? line - end : 0;
    }, editorTop() + 1));
    let distance = Number.POSITIVE_INFINITY;
    await waitFor("the revealed preview anchors within 2 lines of the editor top", async () => {
      distance = await anchorDistance();
      return distance <= 2;
    });
    console.log("RI-T31b: editor top line " + (editorTop() + 1) + ", anchor distance " + distance);
    assert.ok(editorTop() >= before + 150, "the editor stayed scrolled");
    await captureAfter(evidence, page, "lifecycle-sync/r04-hidden-preview-catches-up",
      "The preview was hidden behind another tab, the editor scrolled about 200 lines, and the "
      + "revealed preview shows the editor's top line.");
  });
}

export async function scenarioTitleBarButton(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t36", async (document) => {
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitFor("no preview before the click", () => getActivePreviewForTests() === undefined);
    const button = page.locator(".editor-actions .codicon-book").first();
    await waitFor("the Studio title-bar action", async () => await button.count() > 0);
    await button.click();
    await waitForRender(document);
    await waitFor("the side preview panel", () => getActivePreviewPanelForTests() !== undefined);
    await captureAfter(evidence, page, "toolbar-navigation/r01-title-bar-button",
      "A Markdown file is active in the text editor; a click on the book icon in the editor title "
      + "bar opened the Studio preview beside it.");
  });
}

/** RI-T38: the anchor button needs a paired text editor; edit mode is remembered per workspace. */
export async function scenarioToolbarState(page: Page, evidence: Evidence): Promise<void> {
  const demo = [
    "# Fleet dispatch review",
    "",
    "````{admonition} Dispatch readiness",
    ":class: tip",
    "",
    "Confirm **vehicle availability** and the latest operating limits before dispatch.",
    "",
    "- Review the route and charging plan.",
    "- Record the operator approval in the dispatch log.",
    "",
    "```{warning}",
    "If telemetry is stale, **hold dispatch** until the vehicle reports a fresh status.",
    "```",
    "````",
    "",
    "```mermaid",
    "flowchart LR",
    "  Review[Review telemetry] --> Ready{Ready?}",
    "  Ready -->|Yes| Dispatch[Dispatch fleet]",
    "  Ready -->|No| Hold[Hold and inspect]",
    "```",
    "",
    "```{figure} fleet-loop.svg",
    ":width: 360px",
    ":alt: Fleet operating loop: plan, dispatch, observe, and correct.",
    "",
    "Fleet operating loop, rendered from a local SVG.",
    "```",
    "",
  ].join("\n");
  await withDocument("realinput-t38", demo, async (document) => {
    fs.copyFileSync(
      path.resolve(__dirname, "../../../..", "test", "visual", "external-img", "fleet-loop.svg"),
      path.join(path.dirname(document.uri.fsPath), "fleet-loop.svg"),
    );
    await openStudioEditor(document.uri);
    await waitForRender(document);
    assert.equal(
      vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === document.uri.toString()),
      false,
      "no text editor shows the document",
    );
    const anchorButton = (frame: Frame) => frame.locator("[data-sphinx-preview-anchor]");
    await waitFor("the anchor button to be disabled", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await anchorButton(current).isDisabled();
    });
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await anchorButton(frame).getAttribute("title"), "No text editor shows this file");
    });
    await captureAfter(evidence, page, "toolbar-navigation/r02-anchor-disabled-open-with",
      "The Open With editor is alone: the anchor button is disabled with its tooltip.");

    await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
    await waitFor("the anchor button to be enabled", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await anchorButton(current).isEnabled();
    });
    await captureAfter(evidence, page, "toolbar-navigation/r03-anchor-enabled-with-editor",
      "A text editor now shows the file beside the Open With editor: the anchor button is enabled.");
    await closeAllEditors();

    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await closeAllEditors();
    await openSidePreview(document);
    await waitForRender(document);
    await waitFor("edit mode to be on in the reopened preview", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined
        && await current.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on";
    });
    const workbench = vscode.workspace.getConfiguration("workbench");
    const originalTheme = workbench.inspect<string>("colorTheme")?.workspaceValue;
    const palettes = {
      dark: ["rgb(30, 30, 30)", "rgb(37, 37, 38)", "rgb(212, 212, 212)", "rgb(14, 99, 156)"],
      white: ["rgb(255, 255, 255)", "rgb(243, 243, 243)", "rgb(51, 51, 51)", "rgb(0, 95, 184)"],
      cream: ["rgb(245, 241, 232)", "rgb(251, 248, 241)", "rgb(74, 70, 61)", "rgb(154, 74, 42)"],
    };
    try {
      for (const host of ["Dark", "Light"] as const) {
        await workbench.update("colorTheme", `Default ${host} Modern`, vscode.ConfigurationTarget.Workspace);
        await waitFor(`the ${host} host theme to reach the webview`, async () => {
          const current = await findCurrentFrame(page);
          return current !== undefined && await current.locator("body").evaluate(
            (body, kind) => body.classList.contains(`vscode-${kind}`), host.toLowerCase());
        });
        for (const mode of ["current", "dark", "white", "cream"] as const) {
          await withCurrentFrame(page, async (frame) => {
            const toggle = frame.locator("[data-sphinx-preview-theme-toggle]");
            for (let attempt = 0; attempt < 4; attempt += 1) {
              if (await toggle.getAttribute("data-theme-mode") === mode) break;
              await toggle.click();
            }
          });
          await page.mouse.move(10, 10);
          await waitFor(`${mode} toolbar colors on the ${host} host`, async () => {
            const current = await findCurrentFrame(page);
            if (current === undefined) return false;
            return current.evaluate(({ mode, palettes }) => {
              if (window.document.documentElement.getAttribute("data-sphinx-preview-theme-mode") !== mode) return false;
              const toolbar = window.document.querySelector<HTMLElement>("[data-sphinx-preview-toolbar]");
              const active = toolbar?.querySelector<HTMLElement>('button[aria-pressed="true"]');
              if (!toolbar || !active) return false;
              const bodyStyle = getComputedStyle(window.document.body);
              const toolbarStyle = getComputedStyle(toolbar);
              const activeStyle = getComputedStyle(active);
              const actual = [bodyStyle.backgroundColor, toolbarStyle.backgroundColor,
                toolbarStyle.color, activeStyle.backgroundColor];
              if (mode !== "current") {
                const borders = { dark: "rgb(69, 69, 69)", white: "rgb(200, 200, 200)", cream: "rgb(214, 205, 189)" };
                const panels = [toolbar, ...window.document.querySelectorAll<HTMLElement>(".admonition")];
                return actual.every((color, index) => color === palettes[mode][index])
                  && panels.every((panel) => {
                    const style = getComputedStyle(panel);
                    return [style.borderTopColor, style.borderRightColor, style.borderBottomColor]
                      .every((color) => color === borders[mode]);
                  });
              }
              const probe = window.document.createElement("span");
              window.document.body.append(probe);
              const expected = ["--vscode-editor-background", "--vscode-editorWidget-background",
                "--vscode-icon-foreground", "--vscode-button-background"].map((variable) => {
                probe.style.color = `var(${variable})`;
                return getComputedStyle(probe).color;
              });
              probe.remove();
              return actual.every((color, index) => color === expected[index]);
            }, { mode, palettes });
          });
          await captureAfter(evidence, page, realInputId(`38-toolbar-${host.toLowerCase()}-${mode}`),
            `${mode} preview mode updates the document and floating toolbar on the ${host} VS Code theme.`);
        }
      }
    } finally {
      await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Workspace);
    }
    // The boxes start below the expanded toolbar, so the demo needs more than the 900 px of the run.
    await page.setViewportSize({ width: 1400, height: 1040 });
    try {
      await withCurrentFrame(page, async (frame) => {
        const themeButton = frame.locator("[data-sphinx-preview-theme-toggle]");
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (await themeButton.getAttribute("data-theme-mode") === "white") break;
          await themeButton.click();
        }
        // The theme button fades the colours (CR 046): read them once the switch has ended.
        await frame.locator("html:not([data-sphinx-preview-theme-switching])").waitFor();
        assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode"), "white");
        assert.equal(await frame.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor),
          "rgb(255, 255, 255)");
        assert.equal(await frame.locator(".admonition.tip").count(), 1);
        assert.equal(await frame.locator(".admonition.warning").count(), 1);
        await waitFor("the demo Mermaid and SVG images to load", async () => {
          const diagram = frame.locator("img.myst-mermaid-image");
          const svg = frame.locator('img[alt="Fleet operating loop: plan, dispatch, observe, and correct."]');
          return await diagram.count() === 1 && await svg.count() === 1
            && await diagram.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
            && await svg.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0);
        }).catch(async (error: unknown) => {
          console.error("Demo asset state:", await frame.locator("img").evaluateAll((images) =>
            images.map((image) => ({
              alt: image.getAttribute("alt"),
              className: image.className,
              complete: (image as HTMLImageElement).complete,
              naturalWidth: (image as HTMLImageElement).naturalWidth,
              source: image.getAttribute("src")?.slice(0, 180),
            }))));
          console.error("Demo Mermaid errors:", await frame.locator(".myst-mermaid-error").allTextContents());
          throw error;
        });
        assert.equal(await frame.locator(".myst-mermaid-error").count(), 0);
        // A label box narrower than its text cuts the text's last characters. Each label is HTML in a
        // foreignObject: its text must fit its foreignObject and, for a node, the node shape, as the
        // shown SVG image draws it (no page style sheet, no page font), not as the page would.
        const src = await frame.locator("img.myst-mermaid-image").getAttribute("src") ?? "";
        const labels = await frame.evaluate(measureMermaidImageLabels, src);
        assert.deepEqual(labels.map((label) => label.label).sort(),
          ["Dispatch fleet", "Hold and inspect", "No", "Ready?", "Review telemetry", "Yes"],
          `every flowchart label was found in the image: ${JSON.stringify(labels)}`);
        assert.deepEqual(cutLabels(labels), [], `every label fits its box in the image: ${JSON.stringify(labels)}`);
        for (const selector of [".admonition.tip", "img.myst-mermaid-image",
          'img[alt="Fleet operating loop: plan, dispatch, observe, and correct."]']) {
          // The layout settles after the resize: wait for the box to fit, then report where it was.
          let seen = "not measured";
          await waitFor(`${selector} must be fully visible in the demo capture`, async () => {
            const bounds = await frame.locator(selector).evaluate((element) => {
              const rect = element.getBoundingClientRect();
              return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, innerHeight: window.innerHeight };
            });
            seen = `top ${bounds.top}, bottom ${bounds.bottom}, window.innerHeight ${bounds.innerHeight}`;
            return bounds.width > 0 && bounds.height > 0 && bounds.top >= 0 && bounds.bottom <= bounds.innerHeight;
          }).catch((error: unknown) => {
            throw new Error(`${selector} is not fully visible in the demo capture: ${seen}`, { cause: error });
          });
        }
      });
      await page.mouse.move(10, 10);
      await captureAfter(evidence, page, "lifecycle-sync/r08-edit-mode-remembered",
        "A white-background preview restores edit mode and renders a nested MyST admonition, "
        + "a Mermaid dispatch flowchart, and a local SVG fleet operating loop.");
    } finally {
      await page.setViewportSize({ width: 1400, height: 900 });
    }
  });

  // A previewState message carries editMode: true; the host must accept it (scrollTop is recorded).
  const chapter = fs.readFileSync(
    path.resolve(__dirname, "../../../..", "test", "visual", "fixtures", "05-long-chapter.md"), "utf8");
  await withDocument("realinput-t38-state", chapter, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const box = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
    assert.ok(box, "the preview frame has a bounding box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1200);
    await waitFor("the host to record the preview scroll position in edit mode",
      () => (getActivePreviewForTests()?.scrollTop ?? 0) > 0);
  });
}

/** RI-T39: files opened while the side preview has focus land in another group. */
export async function scenarioPreviewGroupLock(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t39", {
    "smoke.md": SMOKE,
    "other-t39.md": "# Other T39\n\nSecond fixture.\n",
    "third-t39.md": "# Third T39\n\nThird fixture.\n",
    "fourth-t39.md": "# Fourth T39\n\nFourth fixture.\n",
  });
  const groupCount = (): number => vscode.window.tabGroups.all.length;
  const groupOf = (column: vscode.ViewColumn | undefined) =>
    vscode.window.tabGroups.all.find((group) => group.viewColumn === column);
  const editorColumnOf = (uri: vscode.Uri): vscode.ViewColumn | undefined => {
    const key = uri.toString();
    for (const group of vscode.window.tabGroups.all) {
      if (group.tabs.some((tab) => tab.input instanceof vscode.TabInputText
        && tab.input.uri.toString() === key && tab.isActive)) return group.viewColumn;
    }
    return undefined;
  };
  const quickOpen = async (name: string, uri: vscode.Uri): Promise<void> => {
    await press(page, `${MOD}+P`);
    await typeText(page, name);
    try {
      await waitFor("Quick Open to list the file", async () =>
        (await page.locator(".quick-input-widget .monaco-list-row", { hasText: name }).count()) > 0, 5_000);
    } catch (error) {
      const typed = await page.locator(".quick-input-box input").first().inputValue().catch(() => "<no input>");
      const rows = await page.locator(".quick-input-list .monaco-list-row").allInnerTexts().catch(() => []);
      throw new Error(String(error) + " Input: " + typed + " Rows: " + rows.join(" | ").slice(0, 300));
    }
    await press(page, "Enter");
    await waitFor("the file to open in a text editor", () => editorColumnOf(uri) !== undefined);
  };
  const closeTextTab = async (uri: vscode.Uri): Promise<void> => {
    const key = uri.toString();
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === key) {
          await vscode.window.tabGroups.close(tab);
        }
      }
    }
  };
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    const other = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("other-t39.md")));
    const third = vscode.Uri.file(fixture.path("third-t39.md"));
    const fourthDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("fourth-t39.md")));
    const fourth = fourthDocument.uri;
    try {
      // The previous scenario's preview group unlock has finished (closeAllEditors waits for it).
      await previewGroupUnlocksSettledForTests();
      // (a) Leak canary: before any preview exists, Quick Open must reuse the source group.
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      const sourceColumn = editorColumnOf(document.uri);
      assert.ok(sourceColumn !== undefined, "smoke.md is open in a group");
      const groupsBefore = groupCount();
      await quickOpen("other-t39.md", other.uri);
      assert.equal(editorColumnOf(other.uri), sourceColumn,
        "canary: Quick Open reused the source group (a locked group leaked from an earlier scenario)");
      assert.equal(groupCount(), groupsBefore, "canary: Quick Open did not create a group");
      await closeTextTab(other.uri);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

      await openSidePreview(document);
      await waitForRender(document);
      const panel = getActivePreviewPanelForTests();
      assert.ok(panel, "the side preview panel exists");
      const previewColumn = panel.viewColumn;
      assert.ok(previewColumn !== undefined, "the side preview has a column");
      assert.notEqual(previewColumn, sourceColumn);
      assert.equal(groupCount(), 2, "source group plus preview group");
      const previewIsActiveTab = (): boolean => {
        const tab = groupOf(previewColumn)?.activeTab;
        return tab !== undefined && tab.input instanceof vscode.TabInputWebview;
      };

      // Give the preview focus with a real click.
      const box = await withCurrentFrame(page, async (frame) => (await frame.frameElement()).boundingBox());
      assert.ok(box, "the preview frame has a bounding box");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await waitFor("the preview to have focus before Quick Open", () => panel.active);

      // Case A: Quick Open from the focused preview.
      await quickOpen("other-t39.md", other.uri);
      assert.equal(editorColumnOf(other.uri), sourceColumn, "Quick Open opened the file in the source group");
      assert.equal(groupCount(), 2, "Quick Open did not create a third group");
      assert.ok(previewIsActiveTab(), "the preview is still the active tab of its group");
      await waitFor("the preview to follow the opened Markdown file",
        () => getActivePreviewForTests()?.documentUri === other.uri.toString());
      await captureAfter(evidence, page, "toolbar-navigation/r04-quick-open-beside-preview",
        "Quick Open from the focused preview opened the file in the source group; the preview stayed visible.");

      // Case B: the Explorer entry runs the command with a URI while the preview has focus.
      panel.reveal(previewColumn, false);
      await waitFor("the preview to have focus again", () => panel.active);
      await vscode.commands.executeCommand(COMMAND_ID, third);
      await waitFor("the third file to open in a text editor", () => editorColumnOf(third) !== undefined);
      assert.notEqual(editorColumnOf(third), previewColumn, "the Explorer entry did not open in the preview's group");
      assert.ok(previewIsActiveTab(), "the preview is still the active tab after the Explorer entry");
      assert.equal(groupCount(), 2, "the Explorer entry did not create a group");

      // (d) Unlock after close.
      const previewTab = groupOf(previewColumn)?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
      assert.ok(previewTab, "the preview tab exists");
      await vscode.window.tabGroups.close(previewTab);
      await waitFor("the preview to close", () => getActivePreviewPanelForTests() === undefined);
      // The unlock runs one tick after dispose and moves focus briefly: wait until it has finished.
      await previewGroupUnlocksSettledForTests();
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
      const countBeforeReuse = groupCount();
      await quickOpen("fourth-t39.md", fourth);
      assert.equal(editorColumnOf(fourth), sourceColumn);
      assert.ok(groupCount() <= countBeforeReuse, "Quick Open after closing the preview created no group");

      // Last-group case: the preview's group is the only one left when the preview closes.
      await closeAllEditors();
      await openSidePreview(document);
      await waitForRender(document);
      const lastPanel = getActivePreviewPanelForTests();
      assert.ok(lastPanel, "a second side preview exists");
      for (const uri of [document.uri, other.uri, third, fourth]) await closeTextTab(uri);
      await waitFor("only the preview group to remain", () => groupCount() === 1);
      const lastTab = vscode.window.tabGroups.all[0]?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
      assert.ok(lastTab, "the preview is the last tab");
      await vscode.window.tabGroups.close(lastTab);
      await waitFor("the second preview to close", () => getActivePreviewPanelForTests() === undefined);
      // The unlock runs one tick after dispose: wait until it has finished.
      await previewGroupUnlocksSettledForTests();
      await vscode.window.showTextDocument(document);
      await waitFor("the file to open", () => editorColumnOf(document.uri) !== undefined);
      assert.equal(groupCount(), 1, "a file opened after the last preview closed stayed in the single group");

      // (f) A user lock on a group to the right of the preview survives the preview closing.
      await closeAllEditors();
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await openSidePreview(document);
      await waitForRender(document);
      await vscode.window.showTextDocument(fourthDocument, vscode.ViewColumn.Three);
      assert.equal(groupCount(), 3, "source, preview and the user's group");
      try {
        await vscode.commands.executeCommand("workbench.action.focusThirdEditorGroup");
        await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
        const middleTab = groupOf(vscode.ViewColumn.Two)?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
        assert.ok(middleTab, "the preview is in the middle group");
        await vscode.window.tabGroups.close(middleTab);
        await waitFor("the middle preview to close", () => getActivePreviewPanelForTests() === undefined);
        await waitFor("the preview group to close", () => groupCount() === 2);
        const activeAfterClose = vscode.window.tabGroups.activeTabGroup.viewColumn;
        for (let i = 0; i < 12; i += 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
          assert.equal(vscode.window.tabGroups.activeTabGroup.viewColumn, activeAfterClose,
            "closing the preview did not move focus into the user's locked group");
        }
        await vscode.commands.executeCommand("workbench.action.focusSecondEditorGroup");
        await quickOpen("other-t39.md", other.uri);
        // A locked group refuses new editors, so the file lands in the other group.
        assert.equal(editorColumnOf(other.uri), vscode.ViewColumn.One,
          "the user's lock survived: Quick Open from the locked group opened elsewhere");
        assert.equal(groupCount(), 2, "no group was created");
      } finally {
        try {
          await vscode.commands.executeCommand("workbench.action.focusSecondEditorGroup");
          await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
        } catch {
          // Best effort.
        }
      }

      // Restored previews: the workbench restores the group's lock; closing the preview must release it.
      await closeAllEditors();
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      const restoredPanel = vscode.window.createWebviewPanel(PANEL_VIEW_TYPE, "Restored preview",
        vscode.ViewColumn.Beside, { enableScripts: true, localResourceRoots: [] });
      await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
      await deserializePreviewPanelForTests(restoredPanel, {
        documentId: document.uri.toString(),
        sourceFile: document.uri.fsPath,
        sourceLine: 1,
        scrollTop: 0,
        descriptionsCollapsed: false,
      });
      await waitFor("the restored preview to render", () =>
        getActivePreviewForTests()?.documentUri === document.uri.toString());
      for (const uri of [document.uri, other.uri, third, fourth]) await closeTextTab(uri);
      await waitFor("only the restored preview group to remain", () => groupCount() === 1);
      const restoredTab = vscode.window.tabGroups.all[0]?.tabs.find((tab) => tab.input instanceof vscode.TabInputWebview);
      assert.ok(restoredTab, "the restored preview is the last tab");
      await vscode.window.tabGroups.close(restoredTab);
      await waitFor("the restored preview to close", () => getActivePreviewPanelForTests() === undefined);
      await previewGroupUnlocksSettledForTests();
      await vscode.window.showTextDocument(document);
      await waitFor("the file to open", () => editorColumnOf(document.uri) !== undefined);
      assert.equal(groupCount(), 1, "a restored preview releases its lock too");
    } finally {
      try {
        const panel = getActivePreviewPanelForTests();
        if (panel !== undefined) {
          panel.reveal(panel.viewColumn, false);
          await waitFor("the preview to have focus", () => panel.active, 2_000);
        }
      } catch {
        // Best effort: the backstop below must still run.
      }
      try {
        await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
      } catch {
        // Best effort: unlocking must not hide the scenario's own result.
      }
      await closeAllEditors();
      // closeAllEditors has waited for the unlock of the preview's group before the next suite.
    }
  } finally {
    fixture.dispose();
  }
}

// CR 025: typed text must reach the source document before the preview leaves it. Each scenario
// types and then switches document at once (a few keystrokes at 5 ms, far below the 400 ms
// autosave), so the text exists only in the page when the switch starts.
