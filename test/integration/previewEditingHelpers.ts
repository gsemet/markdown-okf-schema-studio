import * as assert from "node:assert/strict";
import { type Frame, type Page } from "playwright-core";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
import { RealWindowEvidence } from "./evidence";
import { captureByLegacy } from "../shared/captureRegistry";
export async function waitFor(description: string, predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

export async function waitForCurrentPreview(document: vscode.TextDocument, previousRequestId?: number, htmlPattern?: RegExp): Promise<void> {
  await waitFor("the preview to render the current document version", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString()
      && preview.phase === "ready"
      && preview.documentVersion === document.version
      && preview.requestId !== undefined
      && preview.requestId !== previousRequestId
      && preview.shownRequestId === preview.requestId
      && /<section\b[^>]*data-okf-properties/u.test(preview.html)
      && /data-okf-field="related"[^]*?data-okf-link-status="valid"/u.test(preview.html)
      && /data-okf-field="metadata"[^]*?data-okf-link-status="valid"/u.test(preview.html)
      && (htmlPattern?.test(preview.html) ?? true);
  });
}

export async function previewFrame(page: Page, expectedExcerpt?: string): Promise<Frame> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      try {
        const preview = getActivePreviewForTests();
        const nonce = preview?.html.match(/\bnonce="([^"]+)"/u)?.[1];
        if (await frame.locator("#sphinx-myst-preview-content").count()
          && await (await frame.frameElement()).isVisible()
          && await frame.evaluate(() => document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce) === nonce
          && await frame.locator("html").getAttribute("data-sphinx-preview-document-id") === preview?.documentUri
          && await frame.locator("html").getAttribute("data-sphinx-preview-document-version") === String(preview?.documentVersion)
          && await frame.locator("html").getAttribute("data-sphinx-preview-request-id") === String(preview?.requestId)
          && (!expectedExcerpt || await frame.locator('[data-okf-field="related"] .okf-link-excerpt').textContent() === expectedExcerpt)) return frame;
      } catch (error) {
        if (!/frame.*detach|execution context was destroyed/iu.test(String(error))) throw error;
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for the rendered Studio webview.");
}

export function currentContext(document: vscode.TextDocument): {
  documentId: string;
  revision: number;
  requestId: number;
} {
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  assert.equal(preview.documentUri, document.uri.toString());
  assert.equal(preview.documentVersion, document.version);
  assert.ok(preview.requestId !== undefined);
  return {
    documentId: document.uri.toString(),
    revision: preview.documentVersion as number,
    requestId: preview.requestId,
  };
}

export function replaceDocument(document: vscode.TextDocument, text: string): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    text,
  );
  return edit;
}

/** Registry id of a frontmatter capture known by its former file stem. */
export function frontmatterId(legacy: string): string {
  const entry = captureByLegacy("frontmatter", legacy);
  assert.ok(entry, `no registered frontmatter capture was named "${legacy}"`);
  return entry.id;
}

export async function captureDescriptionState(
  evidence: RealWindowEvidence,
  page: Page,
  frame: Frame,
  theme: "white" | "dark",
  state: "expanded" | "collapsed" | "collapsed-after-refresh" | "expanded-again",
  layout: "wide" | "narrow" = "wide",
): Promise<void> {
  const collapsed = state.startsWith("collapsed");
  const toggle = frame.locator("[data-okf-description-toggle]:visible");
  assert.equal(await toggle.getAttribute("aria-expanded"), String(!collapsed));
  await waitFor("the host to record Description visibility", () =>
    getActivePreviewForTests()?.descriptionsCollapsed === collapsed);
  assert.equal(await frame.locator("td.okf-doc").first().isVisible(), !collapsed);
  assert.equal(await frame.locator(".okf-properties-docs thead th").last().isVisible(), !collapsed);
  const rows = frame.locator(".okf-properties-docs tbody tr[data-okf-field]");
  const fields = await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-okf-field")));
  assert.equal(fields.length, 17);
  assert.equal(new Set(fields).size, fields.length, "Each field has exactly one row");
  for (const [field, description] of Object.entries({
    type: "Document type.", id: "Stable finding identity.", status: "Review lifecycle state.",
    related: "Supporting source document.",
  })) {
    assert.equal(await frame.locator(`[data-okf-field="${field}"] td.okf-doc`).textContent(), description);
  }
  assert.equal(await frame.locator("td.okf-doc:visible").count(), collapsed ? 0 : fields.length);
  assert.match(await toggle.getAttribute("aria-label") ?? "", /description/iu);
  assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode"), theme);
  await frame.evaluate(() => window.scrollTo(0, 0));
  const frameBounds = await (await frame.frameElement()).boundingBox();
  assert.ok(frameBounds);
  await page.mouse.move(frameBounds.x + 4, frameBounds.y + 4);
  await frame.locator("[data-sphinx-preview-toolbar] button").evaluateAll((buttons) =>
    buttons.forEach((button) => (button as HTMLButtonElement).blur()));
  await frame.waitForFunction(() => Array.from(document.querySelectorAll("[data-sphinx-preview-toolbar] button[data-tooltip], .sphinx-preview-table-menu button[data-tooltip], .sphinx-preview-frontmatter-menu button[data-tooltip]")).every((element) => {
    const tooltip = getComputedStyle(element, "::after");
    return tooltip.content === "none" || tooltip.content === "normal" || tooltip.visibility === "hidden"
      || Number(tooltip.opacity) === 0;
  }));
  const width = await frame.evaluate(() => innerWidth);
  assert.ok(layout === "narrow" ? width < 640 : width >= 640, `Actual ${layout} webview width: ${width}`);
  const toggleBounds = await toggle.boundingBox();
  assert.ok(toggleBounds && toggleBounds.width > 0 && toggleBounds.height > 0);
  const toggleFits = await toggle.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth;
  });
  assert.equal(toggleFits, true, "The accessible description toggle fits the frame");
  const headers = await frame.locator(".okf-properties-docs thead th").evaluateAll((cells) =>
    cells.filter((cell) => getComputedStyle(cell).display !== "none").map((cell) => {
      const bounds = cell.getBoundingClientRect();
      return { text: cell.textContent, visible: bounds.left >= 0 && bounds.right <= innerWidth
        && bounds.top >= 0 && bounds.bottom <= innerHeight };
    }));
  if (layout === "wide") assert.ok(headers.every((header) => header.visible), `Table headers must fit the capture viewport: ${JSON.stringify(headers)}`);
  if (layout === "narrow") {
    assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true,
      "Narrow layout must contain horizontal overflow rather than scroll the whole page");
  }
  const filename = `description-${theme}-${state}${layout === "narrow" ? "-narrow" : ""}`;
  const id = frontmatterId(filename);
  await evidence.shoot(page, frame, id);
  const review = collapsed
    ? "Description header and cells are hidden. Name and Value remain readable, and the expand icon stays visible."
    : "Description header and cells are visible. Check column spacing, text contrast, and the collapse icon beside the frontmatter title.";
  const transition = state === "collapsed-after-refresh"
    ? "The preview was refreshed while collapsed; the choice must remain collapsed."
    : state === "expanded-again"
      ? "The column was expanded after refresh; descriptions must return without duplicated rows."
      : state === "collapsed"
        ? "The collapse control was clicked from the expanded state; only Name and Value should remain."
        : "Description was explicitly expanded before this capture; every field description should be visible.";
  evidence.record(id, {
    note: review,
    json: {
      summary: review,
      info: { theme, layout, viewport: page.viewportSize(), frameWidth: width, host: "Real VS Code webview" },
      actions: [transition],
      capturedState: { collapsed, headers, fieldCount: fields.length },
      checks: ["Exact description text", "17 unique rows", "Visible description count", "Toggle accessibility and state",
        "Frame width, theme and overflow policy"],
      visualChecks: ["Text contrast", "No clipping within cells", "Column spacing"],
      limitations: "legacy_summary intentionally violates additionalProperties. Native title tooltips are not screenshot evidence.",
    },
    markdown: `${transition}\n\n`
      + `Description column: ${theme}, ${state}.\n\n`
      + `Setup: finding schema with 17 unique fields; legacy_summary intentionally violates additionalProperties. `
      + `Target metadata is Updated target description; outside-workspace links are explicitly permitted.\n\n`
      + `Capture: actual frame width ${width}px, ${layout} layout, top of document; pointer moved away and toolbar blurred; tooltip disappearance awaited.\n\n`
      + `Actions: expand, collapse, refresh (new completed request ID), expand again, in that order per theme/layout.\n\n`
      + `Expected exact descriptions: Document type.; Stable finding identity.; Review lifecycle state.; Supporting source document.\n\n`
      + "Asserted: exact description text, 17 unique rows, visible description count, toggle accessibility/state, frame width, theme and overflow policy. Visual review only: contrast, clipping within cells and spacing. Native title tooltips are not screenshot evidence.\n",
  });
  console.log(`PASS frontmatter screenshot: ${id}`);
}

export async function captureLinkState(
  evidence: RealWindowEvidence, page: Page, frame: Frame, name: string, expected: string, hovered = false,
): Promise<void> {
  if (!hovered) {
  await frame.evaluate(() => window.scrollTo(0, 0));
  const frameBounds = await (await frame.frameElement()).boundingBox();
  assert.ok(frameBounds);
  await page.mouse.move(frameBounds.x + 4, frameBounds.y + 4);
  await frame.locator("[data-sphinx-preview-toolbar] button").evaluateAll((buttons) =>
    buttons.forEach((button) => (button as HTMLButtonElement).blur()));
  await frame.waitForFunction(() => Array.from(document.querySelectorAll("[data-sphinx-preview-toolbar] button[data-tooltip], .sphinx-preview-table-menu button[data-tooltip], .sphinx-preview-frontmatter-menu button[data-tooltip]")).every((element) => {
    const style = getComputedStyle(element, "::after");
    return style.content === "none" || style.content === "normal" || style.visibility === "hidden" || Number(style.opacity) === 0;
  }));
  } else {
    const tooltip = frame.locator(".sphinx-preview-link-tooltip[role=tooltip]");
    assert.ok(await tooltip.isVisible());
    assert.match(await tooltip.textContent() ?? "", /description: Original target description/u);
    assert.ok(await tooltip.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight;
    }), "Hover tooltip is contained in the captured viewport");
  }
  const width = await frame.evaluate(() => innerWidth);
  const id = frontmatterId(name);
  // The saved-target captures are clipped to the changed excerpt (the Related row).
  await evidence.shoot(page, frame, id, frame.locator('[data-okf-field="related"]').first());
  evidence.record(id, {
    note: expected,
    json: {
      summary: expected,
      info: { viewport: page.viewportSize(), frameWidth: width, host: "Real VS Code webview" },
      capturedState: { hovered, outsideWorkspaceLinks: "permitted" },
      checks: ["Exact link text, metadata and badges asserted by the test"],
      visualChecks: ["Color, legibility and spacing", "Hover tooltip stays within the viewport"],
      limitations: "legacy_summary intentionally produces a schema validation error. Hover tooltips are production UI, not injected overlays.",
    },
    markdown: `Real VS Code webview, ${width}px frame; ${hovered ? "pointer on the related link, accessible tooltip visible" : "pointer away, toolbar blurred and tooltip disappearance awaited"}. `
      + "Outside-workspace links permitted. legacy_summary intentionally produces a red schema validation error. "
      + "Exact link text/metadata/badges are asserted by the test; color, legibility and spacing require visual review. "
      + (hovered ? "The visible tooltip is production UI, not an injected screenshot overlay.\n" : "Hover appearance is reviewed in the separate hover checkpoint.\n"),
  });
}
