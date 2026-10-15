import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { chromium, type Browser, type Frame, type Page } from "playwright-core";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  REFRESH_COMMAND_ID,
  sendPreviewMessageForTests,
  setRenderDelayForTests,
} from "./extensionApi";
import { E2E_SCREENSHOT_ROOT } from "../reportPaths";

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function waitForCurrentPreview(document: vscode.TextDocument, previousRequestId?: number): Promise<void> {
  await waitFor("the preview to render the current document version", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString()
      && preview.phase === "ready"
      && preview.documentVersion === document.version
      && preview.requestId !== undefined
      && preview.requestId !== previousRequestId
      && /<section\b[^>]*data-okf-properties/u.test(preview.html)
      && /data-okf-field="related"[^]*?data-okf-link-status="valid"/u.test(preview.html)
      && /data-okf-field="metadata"[^]*?data-okf-link-status="valid"/u.test(preview.html);
  });
}

async function previewFrame(page: Page, expectedExcerpt?: string): Promise<Frame> {
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

function currentContext(document: vscode.TextDocument): {
  documentId: string;
  documentVersion: number;
  requestId: number;
} {
  const preview = getActivePreviewForTests();
  assert.ok(preview);
  assert.equal(preview.documentUri, document.uri.toString());
  assert.equal(preview.documentVersion, document.version);
  assert.ok(preview.requestId !== undefined);
  return {
    documentId: document.uri.toString(),
    documentVersion: preview.documentVersion as number,
    requestId: preview.requestId,
  };
}

function replaceDocument(document: vscode.TextDocument, text: string): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    text,
  );
  return edit;
}

async function captureDescriptionState(
  page: Page,
  frame: Frame,
  artifacts: string,
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
  await page.screenshot({ path: path.join(artifacts, `${filename}.png`) });
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
  fs.writeFileSync(path.join(artifacts, `${filename}.json`), JSON.stringify({
    summary: review,
    info: { id: filename, suite: "frontmatter", runId: process.env.STUDIO_E2E_RUN_ID ?? null,
      theme, layout, viewport: page.viewportSize(), frameWidth: width, host: "Real VS Code webview" },
    actions: [transition],
    capturedState: { collapsed, headers, fieldCount: fields.length },
    checks: ["Exact description text", "17 unique rows", "Visible description count", "Toggle accessibility and state",
      "Frame width, theme and overflow policy"],
    visualChecks: ["Text contrast", "No clipping within cells", "Column spacing"],
    limitations: "legacy_summary intentionally violates additionalProperties. Native title tooltips are not screenshot evidence.",
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(artifacts, `${filename}.md`),
    `# Description column: ${theme}, ${state}\n\n${review}\n\n${transition}\n\n`
    + `Setup: finding schema with 17 unique fields; legacy_summary intentionally violates additionalProperties. `
    + `Target metadata is Updated target description; outside-workspace links are explicitly permitted.\n\n`
    + `Capture: actual frame width ${width}px, ${layout} layout, top of document; pointer moved away and toolbar blurred; tooltip disappearance awaited.\n\n`
    + `Actions: expand, collapse, refresh (new completed request ID), expand again, in that order per theme/layout.\n\n`
    + `Expected exact descriptions: Document type.; Stable finding identity.; Review lifecycle state.; Supporting source document.\n\n`
    + "Asserted: exact description text, 17 unique rows, visible description count, toggle accessibility/state, frame width, theme and overflow policy. Visual review only: contrast, clipping within cells and spacing. Native title tooltips are not screenshot evidence.\n",
    "utf8");
  fs.appendFileSync(path.join(artifacts, "INDEX.md"), `- [${filename}](${filename}.md): [image](${filename}.png)\n`);
  console.log(`PASS frontmatter screenshot: ${filename}`);
}

async function captureLinkState(page: Page, frame: Frame, artifacts: string, name: string, expected: string, hovered = false): Promise<void> {
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
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
  fs.writeFileSync(path.join(artifacts, `${name}.json`), JSON.stringify({
    summary: expected,
    info: { id: name, suite: "frontmatter", runId: process.env.STUDIO_E2E_RUN_ID ?? null,
      viewport: page.viewportSize(), frameWidth: width, host: "Real VS Code webview" },
    capturedState: { hovered, outsideWorkspaceLinks: "permitted" },
    checks: ["Exact link text, metadata and badges asserted by the test"],
    visualChecks: ["Color, legibility and spacing", "Hover tooltip stays within the viewport"],
    limitations: "legacy_summary intentionally produces a schema validation error. Hover tooltips are production UI, not injected overlays.",
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(artifacts, `${name}.md`), `# ${name}\n\n${expected}\n\n`
    + `Real VS Code webview, ${width}px frame; ${hovered ? "pointer on the related link, accessible tooltip visible" : "pointer away, toolbar blurred and tooltip disappearance awaited"}. `
    + "Outside-workspace links permitted. legacy_summary intentionally produces a red schema validation error. "
    + "Exact link text/metadata/badges are asserted by the test; color, legibility and spacing require visual review. "
    + (hovered ? "The visible tooltip is production UI, not an injected screenshot overlay.\n" : "Hover appearance is reviewed in the separate hover checkpoint.\n"));
  fs.appendFileSync(path.join(artifacts, "INDEX.md"), `- [${name}](${name}.md): [image](${name}.png)\n`);
}

export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  const extensionRoot = path.resolve(__dirname, "../../..");
  fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
  const artifacts = fs.mkdtempSync(path.join(E2E_SCREENSHOT_ROOT, "frontmatter-e2e-"));
  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, "INDEX.md"), "# Frontmatter capture order\n\nIsolated run; entries below follow execution order. See manifest.json for result and limitations.\n\n");
  const manifest = {
    runId: process.env.STUDIO_E2E_RUN_ID ?? null,
    campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
    campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
    revision: process.env.STUDIO_AUDIT_REVISION ?? "unprovided (working tree)",
    command: process.env.STUDIO_AUDIT_COMMAND ?? "node out/test/integration/run-tests.js --trusted-only",
    startedAt: new Date().toISOString(), result: "running", captures: 0,
    suiteResult: "Parent must record trusted-suite exit after serializer and workspace disposal; this test cannot certify later operations.",
    reload: "Separate real-window campaign: see RELOAD-LATEST.md. Refresh captures here only prove toolbar refresh.",
    tooltip: "Custom accessible link tooltips have dedicated hover captures; native browser popups are not captured.",
  };
  fs.writeFileSync(path.join(artifacts, "manifest.json"), JSON.stringify(manifest, null, 2));
  await page.setViewportSize({ width: 2400, height: 1100 });
  await vscode.commands.executeCommand("workbench.action.closeSidebar");
  await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
  const projectRoot = extensionRoot;
  const fixtures = path.join(extensionRoot, "test", "integration", "fixtures");
  const directory = fs.mkdtempSync(path.join(fixtures, "frontmatter-edit-"));
  const schemaDirectory = path.join(directory, "_schema");
  const filePath = path.join(directory, "finding.md");
  const implementationPath = path.join(directory, "evidence/implementation.py");
  const testPath = path.join(directory, "evidence/test_implementation.py");
  const implementationTarget = path.relative(projectRoot, implementationPath).split(path.sep).join("/");
  const testTarget = path.relative(projectRoot, testPath).split(path.sep).join("/");
  const stemTarget = `studio-${path.basename(directory)}-stem`;
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-outside-root-"));
  const outsidePath = path.join(outsideRoot, "outside.md");
  const outsideTarget = path.relative(directory, outsidePath).split(path.sep).join("/");
  const source = [
    "---",
    "type: finding",
    "id: finding-frontmatter-001",
    "# Preserve this comment",
    "status: draft",
    "legacy_summary: Existing summary",
    "related: references/frontmatter-target.md#supported",
    "implemented_in_files:",
    `  - ${implementationTarget}`,
    "tested_in_files:",
    `  - ${testTarget}`,
    "count: 2",
    "annotation_exemption: false",
    "exemption_reason: \"-\"",
    `stem_target: ${stemTarget}`,
    "bundle_target: links/internal.md",
    "array_targets:",
    "  - references/array-first.md#first",
    "  - references/array-second.md#second",
    "non_markdown_target: assets/payload.txt",
    `outside_target: ${outsideTarget}`,
    "metadata:",
    "  owner: platform",
    "  revision: 1",
    "  target: references/frontmatter-target.md",
    "tags:",
    "  - alpha",
    "---",
    "# Body heading",
    "First line",
    "Second line",
    "",
    "| A | B |",
    "| --- | --- |",
    "| x | y |",
    "| p | q |",
    "",
  ].join("\n");
  const schema = [
    "type: object",
    "properties:",
    "  type:",
    "    const: finding",
    "    description: Document type.",
    "  id:",
    "    type: string",
    "    description: Stable finding identity.",
    "  status:",
    "    type: string",
    "    enum: [draft, active]",
    "    description: Review lifecycle state.",
    "  summary:",
    "    type: string",
    "    description: Summary provided by the renamed schema property.",
    "  related:",
    "    type: string",
    "    description: Supporting source document.",
    "    x-okf-link:",
    "      resolution: document-relative",
    "      syntax: plain",
    "      tooltip_shows_fields: [description]",
    "      preview_shows_fields: [description]",
    "  implemented_in_files:",
    "    type: array",
    "    items:",
    "      type: string",
    "      x-okf-link:",
    "        resolution: project-relative",
    "        syntax: plain",
    "        basename_marker: '@implements_req'",
    "        id_marker: id",
    "        show_line_number: true",
    "  tested_in_files:",
    "    type: array",
    "    items:",
    "      type: string",
    "      x-okf-link:",
    "        resolution: project-relative",
    "        syntax: plain",
    "        basename_marker: '@tests_req'",
    "        id_marker: id",
    "        show_line_number: true",
    "  count:",
    "    type: integer",
    "  annotation_exemption:",
    "    type: boolean",
    "  exemption_reason:",
    "    type: [string, \"null\"]",
    "    minLength: 1",
    "  tags:",
    "    type: [array, \"null\"]",
    "    items:",
    "      type: string",
    "  metadata:",
    "    type: object",
    "    properties:",
    "      owner:",
    "        type: string",
    "      revision:",
    "        type: integer",
    "      target:",
    "        type: string",
    "        x-okf-link: { resolution: document-relative, syntax: plain }",
    "    required: [owner, revision]",
    "    additionalProperties: false",
    "  stem_target:",
    "    type: string",
    "    x-okf-link: { resolution: filename-stem, syntax: plain }",
    "  bundle_target:",
    "    type: string",
    "    x-okf-link: { resolution: bundle-relative, syntax: plain }",
    "  array_targets:",
    "    type: array",
    "    items:",
    "      type: string",
    "      x-okf-link: { resolution: document-relative, syntax: plain }",
    "  non_markdown_target:",
    "    type: string",
    "    x-okf-link: { resolution: document-relative, syntax: plain }",
    "  outside_target:",
    "    type: string",
    "    x-okf-link: { resolution: document-relative, syntax: plain }",
    "required: [type, status, metadata]",
    "additionalProperties: false",
    "allOf:",
    "  - if:",
    "      properties:",
    "        annotation_exemption: { const: true }",
    "    then:",
    "      required: [exemption_reason]",
    "      properties:",
    "        exemption_reason: { type: string, minLength: 1 }",
    "",
  ].join("\n");
  fs.mkdirSync(schemaDirectory);
  fs.mkdirSync(path.join(directory, "references"));
  fs.mkdirSync(path.join(directory, "links"));
  fs.mkdirSync(path.join(directory, "assets"));
  fs.mkdirSync(path.join(directory, "evidence"));
  fs.writeFileSync(path.join(directory, "index.md"), "# Fixture bundle\n", "utf8");
  fs.writeFileSync(path.join(directory, "references/frontmatter-target.md"), "---\ndescription: Original target description\n---\n# Target\n\n## Supported\n", "utf8");
  fs.writeFileSync(path.join(directory, "references/array-first.md"), "# First\n", "utf8");
  fs.writeFileSync(path.join(directory, "references/array-second.md"), "# Second\n", "utf8");
  fs.writeFileSync(path.join(directory, "assets/payload.txt"), "plain text payload\n", "utf8");
  fs.writeFileSync(implementationPath, "# implementation setup\n# @implements_req finding-frontmatter-001\n", "utf8");
  fs.writeFileSync(testPath, "# test setup\n# @tests_req finding-frontmatter-001\n", "utf8");
  fs.writeFileSync(outsidePath, "# Outside session roots\n", "utf8");
  const expectedOutsidePath = fs.realpathSync(outsidePath);
  fs.writeFileSync(path.join(directory, `${stemTarget}.md`), "# Stem target\n", "utf8");
  fs.writeFileSync(path.join(directory, "links/inside.md"), "# Internal target\n", "utf8");
  try {
    fs.symlinkSync(path.join(directory, "links/inside.md"), path.join(directory, "links/internal.md"));
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
    throw new Error(`Symlink creation unavailable for trusted integration: ${String(error)}`);
  }
  fs.writeFileSync(path.join(schemaDirectory, "finding.schema.yaml"), schema, "utf8");
  fs.writeFileSync(filePath, source, "utf8");

  let duplicateRoot: string | undefined;
  let symlinkOutsideRoot: string | undefined;
  const frontmatterConfiguration = vscode.workspace.getConfiguration(
    "markdownOkfSchemaStudio.frontmatter",
  );
  const originalAllowOutsideWorkspaceLinks = frontmatterConfiguration.get<boolean>(
    "allowOutsideWorkspaceLinks",
    false,
  );

  try {
    await frontmatterConfiguration.update(
      "allowOutsideWorkspaceLinks",
      true,
      vscode.ConfigurationTarget.Workspace,
    );
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the trusted preview to render", () => {
      const preview = getActivePreviewForTests();
      return preview?.documentUri === document.uri.toString()
        && preview.phase === "ready"
        && preview.requestId !== undefined
        && /<section\b[^>]*data-okf-properties/u.test(preview.html)
        && /data-okf-field="related"[^]*?okf-frontmatter-link/u.test(preview.html);
    });
    await waitFor("the annotated frontmatter links to resolve", () => {
      const html = getActivePreviewForTests()?.html ?? "";
      return ["metadata", "implemented_in_files", "tested_in_files"].every((field) => {
        const row = html.match(new RegExp(`<tr\\b[^>]*data-okf-field="${field}"[^]*?<\\/tr>`, "u"))?.[0] ?? "";
        return row.includes('data-okf-link-status="valid"');
      });
    });
    const schemaPreview = getActivePreviewForTests();
    assert.ok(schemaPreview);
    assert.equal(schemaPreview.readOnly, false);
    assert.match(schemaPreview.html, /data-okf-field="status"/u);
    assert.match(schemaPreview.html, /data-okf-field="metadata"/u);
    assert.match(schemaPreview.html, /data-okf-field="related"[^]*?okf-frontmatter-link/u);
    const metadataRow = schemaPreview.html.match(/<tr\b[^>]*data-okf-field="metadata"[^]*?<\/tr>/u)?.[0] ?? "";
    assert.match(metadataRow, /data-okf-link-status="valid"/u);
    assert.match(schemaPreview.html, /class="okf-link-excerpt"[^>]*>Original target description<\/span>/u);
    for (const field of ["implemented_in_files", "tested_in_files"]) {
      const row = schemaPreview.html.match(new RegExp(`<tr\\b[^>]*data-okf-field="${field}"[^]*?<\\/tr>`, "u"))?.[0] ?? "";
      assert.match(row, /class="okf-link-line">line 2<\/span>/u);
    }
    for (const theme of ["white", "dark"] as const) {
      const frame = await previewFrame(page);
      for (let attempt = 0; attempt < 3 && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") !== theme; attempt += 1) {
        await frame.locator("[data-sphinx-preview-theme-toggle]").click();
      }
      const link = frame.locator('[data-okf-field="related"] a.okf-frontmatter-link');
      assert.match(await link.getAttribute("title") ?? "", /description: Original target description/u);
      assert.equal(await frame.locator('[data-okf-field="related"] .okf-link-excerpt').textContent(), "Original target description");
      assert.equal(await frame.locator('[data-okf-field="implemented_in_files"] .okf-link-line').textContent(), "line 2");
      assert.equal(await frame.locator('[data-okf-field="tested_in_files"] .okf-link-line').textContent(), "line 2");
      assert.equal(await frame.locator('[data-okf-field="legacy_summary"]').count(), 1);
      assert.ok(Number(await frame.locator('[data-okf-badge]').getAttribute("data-okf-errors")) > 0,
        "legacy_summary intentionally violates additionalProperties and produces a validation error");
      assert.match(await frame.locator('.okf-info-row.okf-error').allTextContents().then((texts) => texts.join("\n")), /must NOT have additional properties$/u);
      await captureLinkState(page, frame, artifacts, `links-${theme}-original`,
        "Setup: original target metadata. Excerpt and title contain Original target description. Both evidence links carry exactly line 2. Check muted italic excerpt and marker labels remain readable.");
      await link.hover();
      await captureLinkState(page, frame, artifacts, `links-${theme}-hover`,
        "Action: hover the related link. Expected: visible target path and description: Original target description, with readable text, preserved line breaks and no viewport clipping.", true);
    }
    const updatedTarget = () =>
      /class="okf-link-excerpt"[^>]*>Updated target description<\/span>/u.test(getActivePreviewForTests()?.html ?? "");
    // File watchers arm asynchronously and can miss the first write on loaded CI runners.
    for (let attempt = 1; ; attempt += 1) {
      fs.writeFileSync(path.join(directory, "references/frontmatter-target.md"), "---\ndescription: Updated target description\n---\n# Target\n\n## Supported\n", "utf8");
      try {
        await waitFor("linked target metadata to refresh after a saved change", updatedTarget, 10_000);
        break;
      } catch (error) {
        if (attempt >= 3) throw error;
      }
    }
    await waitForCurrentPreview(document);
    for (const theme of ["white", "dark"] as const) {
      const frame = await previewFrame(page, "Updated target description");
      for (let attempt = 0; attempt < 3 && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") !== theme; attempt += 1) {
        await frame.locator("[data-sphinx-preview-theme-toggle]").click();
      }
      assert.equal(await frame.locator('[data-okf-field="related"] .okf-link-excerpt').textContent(), "Updated target description");
      assert.match(await frame.locator('[data-okf-field="related"] a').getAttribute("title") ?? "", /description: Updated target description/u);
      await captureLinkState(page, frame, artifacts, `links-${theme}-saved-target`,
        "Action: save target description on disk and await linked-file enrichment. Original target description is replaced with exactly Updated target description in excerpt and native title without a full document render.");
    }
    const initialStemRow = schemaPreview.html.match(/<tr\b[^>]*data-okf-field="stem_target"[^]*?<\/tr>/u)?.[0] ?? "";
    const initialBundleRow = schemaPreview.html.match(/<tr\b[^>]*data-okf-field="bundle_target"[^]*?<\/tr>/u)?.[0] ?? "";
    assert.match(initialStemRow, /data-okf-link-status="valid"/u);
    assert.match(initialBundleRow, /data-okf-link-status="valid"/u);
    assert.match(schemaPreview.html, /data-okf-enums="\[&quot;draft&quot;,&quot;active&quot;\]"/u);
    assert.match(
      getActivePreviewForTests()?.html ?? "",
      /<thead><tr><th scope="col">Name<\/th><th scope="col"><span class="okf-column-heading">Value/u,
    );
    assert.match(
      getActivePreviewForTests()?.html ?? "",
      /<th scope="col"><span class="okf-column-heading">Description/u,
    );
    assert.match(
      getActivePreviewForTests()?.html ?? "",
      /<div\b[^>]*data-sphinx-preview-sticky-headings[^>]*>/u,
    );

    for (const layout of ["wide", "narrow"] as const) {
    await page.setViewportSize({ width: layout === "wide" ? 2400 : 1000, height: 1100 });
    for (const theme of ["white", "dark"] as const) {
      const frame = await previewFrame(page);
      for (let attempt = 0; attempt < 3
        && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") !== theme; attempt += 1) {
        await frame.locator("[data-sphinx-preview-theme-toggle]").click();
      }
      if (await frame.locator("[data-okf-description-toggle]:visible").getAttribute("aria-expanded") === "false") {
        await frame.locator("[data-okf-description-toggle]:visible").click();
      }
      await captureDescriptionState(page, frame, artifacts, theme, "expanded", layout);
      await frame.locator("[data-okf-description-toggle]:visible").click();
      await captureDescriptionState(page, frame, artifacts, theme, "collapsed", layout);
      const previousRequestId = currentContext(document).requestId;
      await frame.locator("[data-sphinx-preview-refresh]").click();
      await waitForCurrentPreview(document, previousRequestId);
      const refreshedFrame = await previewFrame(page);
      await refreshedFrame.locator('html[data-okf-descriptions-collapsed="true"]').waitFor();
      await captureDescriptionState(page, refreshedFrame, artifacts, theme, "collapsed-after-refresh", layout);
      await refreshedFrame.locator("[data-okf-description-toggle]:visible").click();
      await captureDescriptionState(page, refreshedFrame, artifacts, theme, "expanded-again", layout);
    }
    }
    await page.setViewportSize({ width: 2400, height: 1100 });
    const longDescription = "Saved target metadata with a deliberately long description. ".repeat(12).trim();
    fs.writeFileSync(path.join(directory, "references/frontmatter-target.md"), `---\ndescription: ${longDescription}\n---\n# Target\n\n## Supported\n`, "utf8");
    await waitFor("long target metadata refresh", () => getActivePreviewForTests()?.html.includes(longDescription) ?? false);
    await waitForCurrentPreview(document);
    for (const theme of ["white", "dark"] as const) {
      const frame = await previewFrame(page, longDescription);
      for (let attempt = 0; attempt < 3 && await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode") !== theme; attempt += 1) {
        await frame.locator("[data-sphinx-preview-theme-toggle]").click();
      }
      const excerpt = frame.locator('[data-okf-field="related"] .okf-link-excerpt');
      assert.equal(await excerpt.textContent(), longDescription);
      assert.equal(await excerpt.getAttribute("title"), longDescription);
      assert.equal(await excerpt.evaluate((element) => element.scrollWidth > element.clientWidth
        && getComputedStyle(element).textOverflow === "ellipsis"), true, "Long excerpt actually overflows with ellipsis");
      await captureLinkState(page, frame, artifacts, `links-${theme}-long-ellipsis`,
        "Action: save twelve repetitions of Saved target metadata with a deliberately long description. Assert full excerpt/title preserved and actual scrollWidth exceeds clientWidth with text-overflow: ellipsis. Visual review: truncation and contrast.");
    }
    const refreshedFrame = await previewFrame(page);
    await refreshedFrame.locator('[data-okf-field="related"] a[data-sphinx-preview-navigation^="okf-link:"]').click();
    await waitFor("the frontmatter Markdown link to open at its fragment", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === path.join(directory, "references/frontmatter-target.md")
      && vscode.window.activeTextEditor.selection.active.line === 5);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);

    const nestedFrame = await previewFrame(page);
    await nestedFrame.locator('[data-okf-field="metadata"] [data-sphinx-preview-navigation^="okf-link:"]').click();
    await waitFor("the nested frontmatter Markdown link to open in VS Code", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === path.join(directory, "references/frontmatter-target.md"));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);

    const implementationFrame = await previewFrame(page);
    await implementationFrame.locator(
      '[data-okf-field="implemented_in_files"] a[data-sphinx-preview-navigation^="okf-link:"]',
    ).click();
    await waitFor("the implementation evidence link to open at its marker", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === implementationPath
      && vscode.window.activeTextEditor.selection.active.line === 1);
    await page.screenshot({ path: path.join(artifacts, "marker-navigation-destination.png") });
    fs.writeFileSync(path.join(artifacts, "marker-navigation-destination.json"), JSON.stringify({
      summary: "Active source editor shows evidence/implementation.py at line 2, containing @implements_req finding-frontmatter-001.",
      info: { id: "marker-navigation-destination", suite: "frontmatter",
        runId: process.env.STUDIO_E2E_RUN_ID ?? null, viewport: page.viewportSize(), host: "Real VS Code workbench" },
      actions: ["Click implemented_in_files link"],
      checks: ["Exact active source path", "Selected marker line"],
      visualChecks: ["Destination editor and marker line visible", "Readable selection and line framing"],
      limitations: "The screenshot shows the destination; automation verifies navigation. Preview validation warnings are intentional fixture state.",
    }, null, 2) + "\n");
    fs.writeFileSync(path.join(artifacts, "marker-navigation-destination.md"), "# Marker navigation destination\n\nSetup: Real VS Code workbench, 2400 x 1100, schema-backed finding with implementation evidence.\nAction: Click implemented_in_files link.\nExpected state: Active source editor is evidence/implementation.py at zero-based line 1 (displayed line 2), containing @implements_req finding-frontmatter-001.\nVisual checks: Destination editor and marker line are visible, not merely link styling. Confirm line framing and readable selection.\nAsserted: Exact active source path and selected line.\nLimitations: The screenshot shows the destination; automation verifies the click and navigation. The preview may intentionally show fixture validation warnings.\n");
    fs.appendFileSync(path.join(artifacts, "INDEX.md"), "- [Marker navigation destination](marker-navigation-destination.md): [image](marker-navigation-destination.png)\n");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);

    const testFrame = await previewFrame(page);
    await testFrame.locator(
      '[data-okf-field="tested_in_files"] a[data-sphinx-preview-navigation^="okf-link:"]',
    ).click();
    await waitFor("the test evidence link to open at its marker", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === testPath
      && vscode.window.activeTextEditor.selection.active.line === 1);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);

    fs.writeFileSync(implementationPath, "# implementation setup\n# marker removed\n", "utf8");
    await waitFor("removed implementation marker badge", () => {
      const row = getActivePreviewForTests()?.html.match(/<tr\b[^>]*data-okf-field="implemented_in_files"[^]*?<\/tr>/u)?.[0] ?? "";
      return row.includes('data-okf-link-status="valid"') && !row.includes('class="okf-link-line"');
    });
    await waitForCurrentPreview(document);
    const noMarkerFrame = await previewFrame(page);
    assert.equal(await noMarkerFrame.locator('[data-okf-field="implemented_in_files"] .okf-link-line').count(), 0);
    assert.equal(await noMarkerFrame.locator('[data-okf-field="tested_in_files"] .okf-link-line').textContent(), "line 2");
    await captureLinkState(page, noMarkerFrame, artifacts, "links-marker-removed",
      "Action: remove implementation marker on disk and await linked-file enrichment. Implementation remains a valid link with zero line badges; test evidence still has exactly line 2.");

    for (const [index, expectedPath] of [
      path.join(directory, "references/array-first.md"),
      path.join(directory, "references/array-second.md"),
    ].entries()) {
      const arrayFrame = await previewFrame(page);
      const arrayLinks = arrayFrame.locator(
        '[data-okf-field="array_targets"] a[data-sphinx-preview-navigation^="okf-link:"]',
      );
      assert.equal(await arrayLinks.count(), 2);
      await arrayLinks.nth(index).click();
      await waitFor(`array frontmatter link ${index + 1} to open in VS Code`, () =>
        vscode.window.activeTextEditor?.document.uri.fsPath === expectedPath);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await waitForCurrentPreview(document);
    }

    const nonMarkdownFrame = await previewFrame(page);
    await nonMarkdownFrame.locator(
      '[data-okf-field="non_markdown_target"] a[data-sphinx-preview-navigation^="okf-link:"]',
    ).click();
    await waitFor("the non-Markdown frontmatter link to open in VS Code", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === path.join(directory, "assets/payload.txt"));
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);

    const outsideFrame = await previewFrame(page);
    await outsideFrame.locator(
      '[data-okf-field="outside_target"] a[data-sphinx-preview-navigation^="okf-link:"]',
    ).click();
    await waitFor("the outside-root document-relative link to open in VS Code", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === expectedOutsidePath);
    assert.equal(vscode.window.activeTextEditor?.selection.active.line, 0);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);

    const invalidLinkContext = currentContext(document);
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...invalidLinkContext,
      editId: "integration-invalid-file-link",
      fieldName: "related",
      fieldValue: "references/missing.md",
    });
    await waitFor("the invalid annotated link to be written", () =>
      document.getText().includes("related: references/missing.md"));
    await waitForCurrentPreview(document);
    await waitFor("the invalid annotated link to resolve", () => {
      const html = getActivePreviewForTests()?.html ?? "";
      const row = html.match(/<tr\b[^>]*data-okf-field="related"[^]*?<\/tr>/u)?.[0] ?? "";
      return row.includes('data-okf-link-status="invalid"') && row.includes('data-okf-link-code="E10"');
    });
    const invalidLinkPreview = getActivePreviewForTests()?.html ?? "";
    assert.match(invalidLinkPreview, /data-okf-field="related"[^]*?data-okf-link-status="invalid"/u);
    assert.match(invalidLinkPreview, /data-okf-link-code="E10"/u);

    const validLinkContext = currentContext(document);
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...validLinkContext,
      editId: "integration-valid-file-link",
      fieldName: "related",
      fieldValue: "references/frontmatter-target.md#supported",
    });
    await waitFor("the repaired annotated link to be written", () =>
      document.getText().includes("related: references/frontmatter-target.md#supported"));
    await waitForCurrentPreview(document);
    await waitFor("the repaired annotated link to resolve", () => {
      const html = getActivePreviewForTests()?.html ?? "";
      const row = html.match(/<tr\b[^>]*data-okf-field="related"[^]*?<\/tr>/u)?.[0] ?? "";
      return row.includes('data-okf-link-status="valid"');
    });
    const repairedLinkPreview = getActivePreviewForTests()?.html ?? "";
    assert.match(repairedLinkPreview, /data-okf-field="related"[^]*?data-okf-link-status="valid"/u);
    const repairedStemRow = repairedLinkPreview.match(/<tr\b[^>]*data-okf-field="stem_target"[^]*?<\/tr>/u)?.[0] ?? "";
    assert.match(repairedStemRow, /data-sphinx-preview-navigation="okf-link:/u);

    duplicateRoot = fs.mkdtempSync(path.join("/tmp", "studio-duplicate-root-"));
    const duplicatePath = path.join(duplicateRoot, `${stemTarget}.md`);
    fs.writeFileSync(duplicatePath, "# Duplicate stem target\n", "utf8");
    await sendPreviewMessageForTests({
      type: "previewLink",
      ...currentContext(document),
      request: `okf-link:${encodeURIComponent(JSON.stringify({ fieldPath: "stem_target" }))}`,
    });
    assert.equal(
      vscode.window.visibleTextEditors.some((editor) => editor.document.uri.fsPath === duplicatePath),
      false,
      "a filename-stem link that became ambiguous must remain blocked",
    );

    symlinkOutsideRoot = fs.mkdtempSync(path.join("/tmp", "studio-symlink-outside-"));
    const symlinkOutsidePath = path.join(symlinkOutsideRoot, "outside.md");
    fs.writeFileSync(symlinkOutsidePath, "# Outside symlink target\n", "utf8");
    const symlinkPath = path.join(directory, "links/internal.md");
    fs.unlinkSync(symlinkPath);
    fs.symlinkSync(symlinkOutsidePath, symlinkPath);
    await sendPreviewMessageForTests({
      type: "previewLink",
      ...currentContext(document),
      request: `okf-link:${encodeURIComponent(JSON.stringify({ fieldPath: "bundle_target" }))}`,
    });
    assert.equal(
      vscode.window.visibleTextEditors.some((editor) => editor.document.uri.fsPath === symlinkOutsidePath),
      false,
      "a bundle link whose symlink escaped at click time must remain blocked",
    );

    const initial = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewAnchorModeChanged",
      ...initial,
      anchorToEditor: false,
    });
    let syncSettings = getActivePreviewForTests();
    assert.equal(syncSettings?.scrollPreviewWithEditor, false);
    assert.equal(syncSettings?.scrollEditorWithPreview, true);
    const revealedBeforeDisabledScroll = syncSettings?.lastRevealedSourceLine;
    sendPreviewMessageForTests({ type: "previewScroll", ...initial, line: 10 });
    assert.equal(getActivePreviewForTests()?.lastRevealedSourceLine, revealedBeforeDisabledScroll);
    sendPreviewMessageForTests({
      type: "previewAnchorModeChanged",
      ...initial,
      anchorToEditor: true,
    });
    syncSettings = getActivePreviewForTests();
    assert.equal(syncSettings?.scrollPreviewWithEditor, true);
    assert.equal(syncSettings?.scrollEditorWithPreview, true);

    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...initial,
      editId: "integration-status-save",
      fieldName: "status",
      fieldValue: "active",
    });
    await waitFor("the schema-valid enum value to be written", () =>
      document.getText().includes("status: active"));
    assert.match(document.getText(), /# Preserve this comment\n/u);
    assert.match(document.getText(), /# Body heading\nFirst line\nSecond line\n/u);

    await waitForCurrentPreview(document);
    setRenderDelayForTests(1_000);
    try {
      const firstRaceContext = currentContext(document);
      await sendPreviewMessageForTests({
        type: "previewFrontmatterSave",
        ...firstRaceContext,
        editId: "integration-frontmatter-timer-race-first",
        fieldName: "status",
        fieldValue: "draft",
      });
      await waitFor("the first slow frontmatter edit to be written", () =>
        document.getText().includes("status: draft"));
      await waitFor("the first slow frontmatter render to start", () => {
        const preview = getActivePreviewForTests();
        return preview?.phase === "building" && preview.documentVersion === document.version;
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 850));

      const secondRaceText = document.getText().replace("status: draft", "status: active");
      assert.notEqual(secondRaceText, document.getText());
      assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, secondRaceText)), true);
      await waitFor("the second frontmatter edit to be written", () =>
        document.getText().includes("status: active"));
      await waitFor("the second lightweight frontmatter refresh during the queued render", () => {
        const preview = getActivePreviewForTests();
        const statusRow = preview?.html.match(/<tr\b[^>]*data-okf-field="status"[^]*?<\/tr>/u)?.[0] ?? "";
        return preview?.phase === "building"
          && preview.documentVersion === document.version
          && statusRow.includes("active");
      });
      await waitForCurrentPreview(document);

      for (const value of [true, false]) {
        const booleanContext = currentContext(document);
        await sendPreviewMessageForTests({
          type: "previewFrontmatterSave",
          ...booleanContext,
          editId: `integration-boolean-save-${value}`,
          fieldName: "annotation_exemption",
          fieldValue: value,
        });
        await waitFor("the schema-valid boolean value to be written", () =>
          document.getText().includes(`annotation_exemption: ${value}`));
        await waitFor("the lightweight refresh to display the saved boolean", () => {
          const preview = getActivePreviewForTests();
          return preview?.phase !== "ready"
            && (preview?.html.includes(`<span class="okf-boolean-value">${value}</span>`) ?? false);
        });
        assert.equal(
          getActivePreviewForTests()?.html.match(/<section\b[^>]*\bdata-okf-properties/gu)?.length,
          1,
          "each lightweight checkbox refresh should leave exactly one properties table",
        );
        await waitForCurrentPreview(document);
        const booleanPreview = getActivePreviewForTests()?.html ?? "";
        assert.equal(
          booleanPreview.match(/<section\b[^>]*\bdata-okf-properties/gu)?.length,
          1,
          "each completed checkbox render should leave exactly one properties table",
        );
        assert.ok(booleanPreview.includes(`<span class="okf-boolean-value">${value}</span>`));
        assert.match(booleanPreview, /<tr\b[^>]*data-okf-field="exemption_reason"[^>]*data-okf-nullable="true"/u);
        const beforeNullSave = document.getText();
        await sendPreviewMessageForTests({
          type: "previewFrontmatterSave",
          ...currentContext(document),
          editId: `integration-conditional-null-save-${value}`,
          fieldName: "exemption_reason",
          fieldValue: null,
        });
        if (value) {
          assert.equal(document.getText(), beforeNullSave, "an active string-only condition must reject null");
        } else {
          await waitFor("the nullable reason to be saved", () => document.getText().includes("exemption_reason: null"));
          await waitForCurrentPreview(document);
        }
      }
    } finally {
      setRenderDelayForTests(0);
    }

    await waitForCurrentPreview(document);
    const beforeRequiredRemoval = document.getText();
    const requiredRemovalContext = currentContext(document);
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...requiredRemovalContext,
      editId: "integration-required-status-remove",
      frontmatterAction: "remove",
      fieldName: "status",
    });
    assert.equal(document.getText(), beforeRequiredRemoval);

    const addFieldContext = currentContext(document);
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...addFieldContext,
      editId: "integration-summary-add",
      frontmatterAction: "add",
      fieldName: "summary",
      fieldValue: "",
    });
    await waitFor("the schema-valid frontmatter field to be added", () =>
      document.getText().includes("summary:"));
    await waitForCurrentPreview(document);

    const removeFieldContext = currentContext(document);
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...removeFieldContext,
      editId: "integration-summary-remove",
      frontmatterAction: "remove",
      fieldName: "summary",
    });
    await waitFor("the frontmatter field to be removed", () =>
      !/^summary:/mu.test(document.getText()));
    await waitForCurrentPreview(document);

    const beforeBadAfterField = document.getText();
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...currentContext(document),
      editId: "integration-summary-add-bad-after",
      frontmatterAction: "add",
      fieldName: "summary",
      fieldValue: "",
      afterField: "status\nowner",
    });
    assert.equal(document.getText(), beforeBadAfterField, "an afterField with a line break must be rejected");

    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...currentContext(document),
      editId: "integration-summary-add-after-status",
      frontmatterAction: "add",
      fieldName: "summary",
      fieldValue: "",
      afterField: "status",
    });
    await waitFor("the field to be added after status", () =>
      /^status: .*\nsummary:/mu.test(document.getText()));
    await waitForCurrentPreview(document);
    await sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...currentContext(document),
      editId: "integration-summary-remove-again",
      frontmatterAction: "remove",
      fieldName: "summary",
    });
    await waitFor("the positioned field to be removed", () =>
      !/^summary:/mu.test(document.getText()));
    await waitForCurrentPreview(document);

    const renameContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...renameContext,
      editId: "integration-summary-key-rename",
      fieldName: "legacy_summary",
      newFieldName: "summary",
      fieldValue: "Existing summary",
    });
    await waitFor("the frontmatter key to be renamed", () =>
      document.getText().includes("summary: Existing summary")
        && !document.getText().includes("legacy_summary:"));
    await waitForCurrentPreview(document);
    const renamedPreview = getActivePreviewForTests()?.html ?? "";
    assert.match(renamedPreview, /data-okf-field="summary"/u);
    assert.ok(
      renamedPreview.includes("Summary provided by the renamed schema property."),
      "the renamed field should use the destination property's schema description",
    );

    const current = currentContext(document);
    const beforeRejectedEdits = document.getText();
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...current,
      editId: "integration-invalid-enum",
      fieldName: "status",
      fieldValue: "paused",
    });
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...initial,
      editId: "integration-stale-version",
      fieldName: "status",
      fieldValue: "draft",
    });
    assert.equal(document.getText(), beforeRejectedEdits);

    const tagsContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...tagsContext,
      editId: "integration-tags-save",
      fieldName: "tags",
      fieldValueFormat: "yaml",
      fieldValue: "- beta\n- gamma\n",
    });
    await waitFor("the schema-valid YAML array to be written", () =>
      document.getText().includes("  - beta\n  - gamma\n"));
    await waitForCurrentPreview(document);

    const directArrayContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...directArrayContext,
      editId: "integration-direct-array-save",
      fieldName: "tags",
      fieldValue: ["delta", "epsilon"],
    });
    await waitFor("the direct array value to be written", () =>
      document.getText().includes("  - delta\n  - epsilon\n"));
    await waitForCurrentPreview(document);

    const nullableTagsContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...nullableTagsContext,
      editId: "integration-nullable-tags-save",
      fieldName: "tags",
      fieldValue: null,
    });
    await waitFor("the nullable array value to be written as null", () =>
      document.getText().includes("tags: null"));
    await waitForCurrentPreview(document);

    const beforeRejectedArray = document.getText();
    const invalidArrayContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...invalidArrayContext,
      editId: "integration-invalid-array-item",
      fieldName: "tags",
      fieldValueFormat: "yaml",
      fieldValue: "- 1\n",
    });
    assert.equal(document.getText(), beforeRejectedArray);

    const metadataContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...metadataContext,
      editId: "integration-metadata-save",
      fieldName: "metadata",
      fieldValueFormat: "yaml",
      fieldValue: "owner: platform\nrevision: 3\n",
    });
    await waitFor("the schema-valid YAML object to be written", () =>
      document.getText().includes("  owner: platform\n  revision: 3\n"));
    await waitForCurrentPreview(document);

    const beforeRejectedObject = document.getText();
    const invalidObjectContext = currentContext(document);
    sendPreviewMessageForTests({
      type: "previewFrontmatterSave",
      ...invalidObjectContext,
      editId: "integration-invalid-object-property",
      fieldName: "metadata",
      fieldValueFormat: "yaml",
      fieldValue: "owner: platform\nrevision: wrong\n",
    });
    assert.equal(document.getText(), beforeRejectedObject);

    const bodyEditContext = currentContext(document);
    const sourceLines = document.getText().split(/\r?\n/u);
    const bodyStartLine = sourceLines.indexOf("First line") + 1;
    const bodyEndLine = bodyStartLine + 1;
    const bodyBlock = getActivePreviewForTests()?.html.match(
      new RegExp(
        `data-sphinx-source-line="${bodyStartLine}"[^>]*data-sphinx-source-end-line="${bodyEndLine}"`,
        "u",
      ),
    );
    assert.ok(bodyStartLine > 0, "the body block remains in the source document");
    assert.ok(bodyBlock, "the rendered body block maps to its current source lines");
    sendPreviewMessageForTests({
      type: "previewEditSave",
      ...bodyEditContext,
      editId: "integration-body-edit",
      line: bodyStartLine,
      endLine: bodyEndLine,
      originalText: "First line\nSecond line\n",
      editedText: "Edited first line\nEdited second line\n",
    });
    await waitFor("the mapped multiline Markdown block to be replaced", () =>
      document.getText().includes("Edited first line\nEdited second line\n"));
    assert.match(document.getText(), /status: active/u);
    assert.match(document.getText(), /# Preserve this comment/u);

    await waitForCurrentPreview(document);
    const autosaveContext = currentContext(document);
    const autosaveEditId = "integration-body-autosave";
    const autosaveOriginalText = "Edited first line\nEdited second line\n";
    sendPreviewMessageForTests({
      type: "previewEditOpen",
      ...autosaveContext,
      editId: autosaveEditId,
      line: bodyStartLine,
      endLine: bodyEndLine,
    });
    sendPreviewMessageForTests({
      type: "previewEditSave",
      ...autosaveContext,
      editId: autosaveEditId,
      line: bodyStartLine,
      endLine: bodyEndLine,
      originalText: autosaveOriginalText,
      editedText: "Autosaved first line\nAutosaved second line\n",
      final: false,
    });
    await waitFor("the first autosaved block text", () =>
      document.getText().includes("Autosaved first line\nAutosaved second line\n"));
    assert.equal(getActivePreviewForTests()?.documentVersion, autosaveContext.documentVersion);
    assert.notEqual(document.version, autosaveContext.documentVersion);

    sendPreviewMessageForTests({
      type: "previewEditSave",
      ...autosaveContext,
      editId: autosaveEditId,
      line: bodyStartLine,
      endLine: bodyEndLine,
      originalText: autosaveOriginalText,
      editedText: "Autosaved final line\nAutosaved second line\n",
      final: false,
    });
    await waitFor("the latest autosaved block text", () =>
      document.getText().includes("Autosaved final line\nAutosaved second line\n"));
    assert.equal(getActivePreviewForTests()?.documentVersion, autosaveContext.documentVersion);

    sendPreviewMessageForTests({
      type: "previewEditSave",
      ...autosaveContext,
      editId: autosaveEditId,
      line: bodyStartLine,
      endLine: bodyEndLine,
      originalText: autosaveOriginalText,
      editedText: "Autosaved final line\nAutosaved second line\n",
      final: true,
    });
    await waitForCurrentPreview(document);
    assert.match(document.getText(), /Autosaved final line\nAutosaved second line\n/u);

    const latest = currentContext(document);
    const beforeMismatchedBlockEdit = document.getText();
    sendPreviewMessageForTests({
      type: "previewEditSave",
      ...latest,
      editId: "integration-block-mismatch",
      line: bodyStartLine,
      endLine: bodyEndLine,
      originalText: "Not the current source",
      editedText: "Must not be written",
    });
    assert.equal(document.getText(), beforeMismatchedBlockEdit);

    const tableContext = currentContext(document);
    const tableEditId = "integration-multi-cell-table";
    const tableOriginal = "| A | B |\n| --- | --- |\n| x | y |\n| p | q |\n";
    const tableStartLine = document.getText().split(/\r?\n/u).indexOf("| A | B |") + 1;
    assert.ok(tableStartLine > 0);
    await sendPreviewMessageForTests({
      type: "previewEditOpen",
      ...tableContext,
      editId: tableEditId,
      line: tableStartLine,
      endLine: tableStartLine + 3,
    });
    const tableStages = [
      "| A | B |\n| --- | --- |\n| edited x | y |\n| p | q |\n",
      "| A | B |\n| --- | --- |\n| edited x | y |\n| p | edited q |\n",
      "| A | edited B |\n| --- | --- |\n| edited x | y |\n| p | edited q |\n",
    ];
    for (const editedText of tableStages) {
      await sendPreviewMessageForTests({
        type: "previewEditSave",
        ...tableContext,
        editId: tableEditId,
        line: tableStartLine,
        endLine: tableStartLine + 3,
        originalText: tableOriginal,
        editedText,
        final: false,
      });
      await waitFor("the cumulative multi-cell table autosave", () => document.getText().includes(editedText));
      assert.equal(getActivePreviewForTests()?.documentVersion, tableContext.documentVersion);
    }
    await sendPreviewMessageForTests({
      type: "previewEditSave",
      ...tableContext,
      editId: tableEditId,
      line: tableStartLine,
      endLine: tableStartLine + 3,
      originalText: tableOriginal,
      editedText: tableStages[tableStages.length - 1],
      final: true,
    });
    await waitForCurrentPreview(document);
    for (const value of ["edited x", "edited q", "edited B"]) {
      assert.ok(getActivePreviewForTests()?.html.includes(value), `the final preview must retain ${value}`);
    }
    // Block insertion protocol (T27): previewEditOpen/Save/Cancel carry `insertAfterLine`.
    const insertAfterLine = tableStartLine + 3;
    const insertSeparators = (before: string, text: string): string => {
      const lines = before.split("\n");
      const offset = lines.slice(0, insertAfterLine).join("\n").length;
      const following = lines[insertAfterLine];
      return before.slice(0, offset) + "\n\n" + text
        + (following !== undefined && following.trim() !== "" ? "\n" : "") + before.slice(offset);
    };
    {
      const before = document.getText();
      const insertContext = currentContext(document);
      const insertEditId = "integration-insert-block";
      const insertBase = {
        ...insertContext,
        editId: insertEditId,
        line: Math.max(1, insertAfterLine),
        endLine: Math.max(1, insertAfterLine),
        insertAfterLine,
      };
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...insertBase });
      assert.equal(document.getText(), before, "opening an insertion must not change the document");
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...insertBase, originalText: "", editedText: "New block", final: false,
      });
      await waitFor("the inserted block to appear", () =>
        document.getText() === insertSeparators(before, "New block"));
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...insertBase, originalText: "", editedText: "New block more", final: true,
      });
      await waitFor("the final inserted block text", () =>
        document.getText() === insertSeparators(before, "New block more"));
      assert.equal(document.getText().split("New block").length - 1, 1, "the block is inserted once");
      await waitForCurrentPreview(document);

      const withBlock = document.getText();
      const cancelContext = currentContext(document);
      const cancelBase = {
        ...cancelContext,
        editId: "integration-insert-cancel",
        line: Math.max(1, insertAfterLine),
        endLine: Math.max(1, insertAfterLine),
        insertAfterLine,
      };
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...cancelBase });
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...cancelBase, originalText: "", editedText: "Temporary block", final: false,
      });
      await waitFor("the temporary inserted block", () =>
        document.getText() === insertSeparators(withBlock, "Temporary block"));
      await sendPreviewMessageForTests({ type: "previewEditCancel", ...cancelBase });
      await waitFor("the cancelled insertion to be removed", () => document.getText() === withBlock);
      await waitForCurrentPreview(document);

      const emptyContext = currentContext(document);
      const emptyBase = {
        ...emptyContext,
        editId: "integration-insert-empty",
        line: Math.max(1, insertAfterLine),
        endLine: Math.max(1, insertAfterLine),
        insertAfterLine,
      };
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...emptyBase });
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...emptyBase, originalText: "", editedText: "  \n", final: true,
      });
      assert.equal(document.getText(), withBlock, "empty insertion text inserts nothing");
    }
    // Edit lock and save-triggered renders (STAB-02, PERF-06, STAB-03): a reload must not leave the
    // preview unable to open another block, and a plain save must not render again.
    {
      await waitForCurrentPreview(document);
      const lockLines = document.getText().split(/\r?\n/u);
      const blockAStart = lockLines.indexOf("Autosaved final line") + 1;
      const blockBStart = lockLines.indexOf("| A | edited B |") + 1;
      assert.ok(blockAStart > 0 && blockBStart > 0, "both blocks used by the lock scenarios exist");
      const blockAText = "Autosaved final line\nAutosaved second line\n";
      const blockBText = "| A | edited B |\n| --- | --- |\n| edited x | y |\n| p | edited q |\n";
      const blockA = { line: blockAStart, endLine: blockAStart + 1 };
      const blockB = { line: blockBStart, endLine: blockBStart + 3 };

      // 1. Open a block, autosave once, let the preview render again, then open another block.
      const lockContext = currentContext(document);
      const lockEditId = "integration-lock-a";
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...lockContext, editId: lockEditId, ...blockA });
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...lockContext, editId: lockEditId, ...blockA,
        originalText: blockAText, editedText: "Lock first line\nAutosaved second line\n", final: false,
      });
      await waitFor("the autosave of the first locked block", () =>
        document.getText().includes("Lock first line\nAutosaved second line\n"));
      await vscode.commands.executeCommand(REFRESH_COMMAND_ID);
      await waitForCurrentPreview(document, lockContext.requestId);
      // The reloaded page reports ready for its own render; the real webview does this by itself.
      await sendPreviewMessageForTests({ type: "previewReady", ...currentContext(document) });
      const secondContext = currentContext(document);
      const secondEditId = "integration-lock-b";
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...secondContext, editId: secondEditId, ...blockB });
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...secondContext, editId: secondEditId, ...blockB,
        originalText: blockBText, editedText: blockBText.replace("edited x", "lock x"), final: true,
      });
      await waitFor("the second block to be editable after a reload", () =>
        document.getText().includes("| lock x | y |"));
      await waitForCurrentPreview(document);

      // 2. Saving an unchanged buffer creates no new render request.
      const probeText = `${document.getText().replace(/\n*$/u, "")}\n\nSave probe.\n`;
      assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, probeText)), true);
      await waitForCurrentPreview(document);
      const beforeSave = getActivePreviewForTests();
      assert.ok(beforeSave);
      assert.equal(await document.save(), true);
      await waitFor("the file watcher to report the save", () =>
        (getActivePreviewForTests()?.activePathChanges ?? 0) > beforeSave.activePathChanges);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const afterSave = getActivePreviewForTests();
      assert.equal(afterSave?.requestId, beforeSave.requestId, "a save of the rendered buffer must not render again");
      assert.equal(afterSave?.renderedStages, beforeSave.renderedStages);

      // 3. A save while a block edit is open does not render until the edit ends.
      const savingContext = currentContext(document);
      const savingEditId = "integration-lock-save";
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...savingContext, editId: savingEditId, ...blockA });
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...savingContext, editId: savingEditId, ...blockA,
        originalText: "Lock first line\nAutosaved second line\n",
        editedText: "Saving first line\nAutosaved second line\n", final: false,
      });
      await waitFor("the autosave of the saving block", () =>
        document.getText().includes("Saving first line\nAutosaved second line\n"));
      const changesBeforeSave = getActivePreviewForTests()?.activePathChanges ?? 0;
      assert.equal(await document.save(), true);
      await waitFor("the file watcher to report the save during the edit", () =>
        (getActivePreviewForTests()?.activePathChanges ?? 0) > changesBeforeSave);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      assert.equal(getActivePreviewForTests()?.requestId, savingContext.requestId,
        "the save-triggered render waits for the open edit");
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...savingContext, editId: savingEditId, ...blockA,
        originalText: "Lock first line\nAutosaved second line\n",
        editedText: "Saving first line\nAutosaved second line\n", final: true,
      });
      await waitForCurrentPreview(document, savingContext.requestId);

      // 4. A changed `{include}` target re-renders, but only after an open block edit ends.
      const includePath = path.join(directory, "lock-include.md");
      fs.writeFileSync(includePath, "# Lock include\n\nInitial lock include text\n", "utf8");
      const withInclude = `${document.getText().replace(/\n*$/u, "")}\n\n\`\`\`{include} lock-include.md\n\`\`\`\n`;
      assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, withInclude)), true);
      await waitFor("the include to be rendered", () =>
        getActivePreviewForTests()?.html.includes("Initial lock include text") ?? false);
      await waitForCurrentPreview(document);
      // An included block maps to the `{include}` directive lines and carries the marker.
      const includeDirectiveLine = withInclude.split("\n").indexOf("```{include} lock-include.md") + 1;
      const includedBlock = getActivePreviewForTests()?.html.match(
        /<p\b[^>]*>Initial lock include text<\/p>/u,
      )?.[0] ?? "";
      assert.ok(
        includedBlock.includes(`data-sphinx-source-line="${includeDirectiveLine}"`)
          && includedBlock.includes(`data-sphinx-source-end-line="${includeDirectiveLine + 1}"`)
          && includedBlock.includes('data-sphinx-preview-included="true"'),
        `the included block maps to the directive lines: ${includedBlock}`,
      );
      const includeContext = currentContext(document);
      const includeEditId = "integration-lock-include";
      const includeOriginal = "Saving first line\nAutosaved second line\n";
      const includeEdited = "Include edit first line\nAutosaved second line\n";
      await sendPreviewMessageForTests({ type: "previewEditOpen", ...includeContext, editId: includeEditId, ...blockA });
      // The host takes the lock with the first save of the edit.
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...includeContext, editId: includeEditId, ...blockA,
        originalText: includeOriginal, editedText: includeEdited, final: false,
      });
      await waitFor("the autosave of the include scenario block", () =>
        document.getText().includes(includeEdited));
      const includeLockedRequestId = getActivePreviewForTests()?.requestId;
      fs.writeFileSync(includePath, "# Lock include\n\nChanged lock include text\n", "utf8");
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
      assert.equal(getActivePreviewForTests()?.requestId, includeLockedRequestId,
        "the include change waits for the open edit");
      await sendPreviewMessageForTests({
        type: "previewEditSave", ...includeContext, editId: includeEditId, ...blockA,
        originalText: includeOriginal, editedText: includeEdited, final: true,
      });
      await waitFor("the changed include to render after the edit ends", () =>
        getActivePreviewForTests()?.html.includes("Changed lock include text") ?? false);
    }
    // The copy button of a code block asks the host to put the raw code on the clipboard.
    const copyText = "const answer = 42;\n\tindented \u00e9\n";
    await vscode.env.clipboard.writeText("");
    await sendPreviewMessageForTests({
      type: "previewCopyText",
      ...currentContext(document),
      text: copyText,
    });
    assert.equal(await vscode.env.clipboard.readText(), copyText);
    const referenceDirectory = path.join(directory, "references");
    fs.mkdirSync(referenceDirectory, { recursive: true });
    const referencePath = path.join(referenceDirectory, "PROPERTIES.md");
    fs.writeFileSync(referencePath, "# Properties\n\n## Supported fields\n");
    sendPreviewMessageForTests({ type: "previewLink", ...currentContext(document), request: "references/PROPERTIES.md#supported-fields" });
    await waitFor("the relative Markdown link to open at its fragment", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === referencePath
      && vscode.window.activeTextEditor.selection.active.line === 2);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await waitForCurrentPreview(document);
    const wikiName = `studio-${path.basename(directory)}`;
    const wikiPath = path.join(referenceDirectory, `${wikiName}.md`);
    fs.writeFileSync(wikiPath, "# Discovered note\n");
    sendPreviewMessageForTests({ type: "previewLink", ...currentContext(document), request: `wiki:${wikiName}` });
    await waitFor("the discovered wikilink to open in VS Code", () =>
      vscode.window.activeTextEditor?.document.uri.fsPath === wikiPath);
  } finally {
    manifest.result = "incomplete";
    manifest.captures = fs.readdirSync(artifacts).filter((file) => file.endsWith(".png")).length;
    fs.writeFileSync(path.join(artifacts, "manifest.json"), JSON.stringify(manifest, null, 2));
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
    if (duplicateRoot) fs.rmSync(duplicateRoot, { recursive: true, force: true });
    if (symlinkOutsideRoot) fs.rmSync(symlinkOutsideRoot, { recursive: true, force: true });
    await frontmatterConfiguration.update(
      "allowOutsideWorkspaceLinks",
      originalAllowOutsideWorkspaceLinks,
      vscode.ConfigurationTarget.Workspace,
    );
  }
  manifest.result = "previewEditing passed including cleanup; trusted-suite result still requires parent exit";
  fs.writeFileSync(path.join(artifacts, "manifest.json"), JSON.stringify(manifest, null, 2));
}
