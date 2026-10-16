import * as assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { chromium, Frame, Page } from "playwright-core";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";

async function waitFor(label: string, predicate: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch { }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function command(page: Page, label: string): Promise<void> {
  await page.keyboard.press("Escape");
  const sourceTab = page.locator('.tab[data-resource-name="reload-evidence.md"]');
  await sourceTab.click();
  assert.equal(await sourceTab.getAttribute("aria-selected"), "true");
  await page.locator(".monaco-editor:visible").first().click();
  await page.keyboard.press("F1");
  const input = page.locator(".quick-input-widget:visible input");
  await input.fill(`>${label}`);
  await page.locator(".quick-input-list .monaco-list-row").first().waitFor();
  await waitFor(`the selected command ${label}`, async () =>
    (await page.locator(".quick-input-list .monaco-list-row").first().textContent())?.includes(label) === true);
  await page.keyboard.press("Enter");
}

export async function runReloadCampaign(executable: string, extensionRoot: string, workspaceRoot: string): Promise<void> {
  const temporary = fs.mkdtempSync("/tmp/studio-reload-");
  fs.mkdirSync(E2E_REPORT_ROOT, { recursive: true });
  fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
  const output = fs.mkdtempSync(path.join(E2E_SCREENSHOT_ROOT, "reload-e2e-"));
  const sourcePath = path.join(temporary, "reload-evidence.md");
  const schemaDirectory = path.join(temporary, "_schema");
  fs.mkdirSync(schemaDirectory);
  fs.writeFileSync(path.join(schemaDirectory, "finding.schema.yaml"), "type: object\nproperties:\n  type:\n    type: string\n    const: finding\n    description: Document kind\n  description:\n    type: string\n    description: Durable evidence summary\n");
  fs.writeFileSync(sourcePath, "---\ntype: finding\ndescription: Reload persistence evidence\n---\n# Reload evidence\n\nPersistent Description preference.\n");
  fs.writeFileSync(path.join(temporary, "index.md"), "# Reload fixture bundle\n");
  const workspaceFile = path.join(temporary, "reload.code-workspace");
  fs.writeFileSync(workspaceFile, JSON.stringify({ folders: [{ path: workspaceRoot }, { path: temporary }], settings: { "workbench.startupEditor": "none" } }));
  const port = await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const address = server.address() as net.AddressInfo; server.close(() => resolve(address.port)); });
  });
  const child = spawn(executable, ["--no-sandbox", "--disable-updates", "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust", `--user-data-dir=${path.join(temporary, "profile")}`, `--extensions-dir=${path.join(temporary, "extensions")}`, `--extensionDevelopmentPath=${extensionRoot}`, `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", workspaceFile, "--goto", sourcePath], { stdio: "ignore" });
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;
  let passed = false;
  try {
    await waitFor("the isolated VS Code browser", async () => { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); return true; });
    assert.ok(browser);
    await waitFor("the workbench page", () => browser!.contexts()[0].pages().some(candidate => candidate.url().includes("workbench")));
    const workbench = browser.contexts()[0].pages().find(candidate => candidate.url().includes("workbench"));
    assert.ok(workbench);
    const page: Page = workbench;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(".monaco-workbench").waitFor();
    await command(page, "Markdown OKF-Schema Studio: Open Preview to Side");
    async function frameForDocument(previousNonce?: string): Promise<Frame> {
      let result: Frame | undefined;
      await waitFor("the current document preview", async () => {
        for (const candidate of page.frames()) {
          if (await candidate.locator("[data-okf-description-toggle]").count() === 0) continue;
          const identity = await candidate.evaluate(() => ({ documentId: document.documentElement.getAttribute("data-sphinx-preview-document-id"), nonce: document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce }));
          if (!identity.documentId?.endsWith("/reload-evidence.md") || !identity.nonce || identity.nonce === previousNonce) continue;
          if (!await (await candidate.frameElement()).isVisible()) continue;
          result = candidate;
          return true;
        }
        return false;
      });
      assert.ok(result);
      return result;
    }
    async function capture(name: string, frame: Frame, action: string): Promise<void> {
      await frame.locator('html[data-okf-descriptions-collapsed="true"]').waitFor();
      assert.equal(await frame.locator("[data-okf-description-toggle]:visible").getAttribute("aria-expanded"), "false");
      assert.equal(await frame.locator("td.okf-doc:visible").count(), 0);
      await frame.locator(".okf-properties-docs").waitFor();
      const bounds = await (await frame.frameElement()).boundingBox();
      assert.ok(bounds);
      await page.mouse.move(bounds.x + 4, bounds.y + 4);
      await frame.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
      await page.screenshot({ path: path.join(output, `${name}.png`) });
      fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify({
        summary: "Reload evidence document and its properties remain visible; Description is collapsed. Name and Value remain readable.",
        info: { id: name, suite: "reload", runId: process.env.STUDIO_E2E_RUN_ID ?? null,
          viewport: page.viewportSize(), host: "Real VS Code preview; default host theme" },
        actions: [action],
        checks: ["Source identity", "Visible current frame", "Collapsed toggle", "Zero visible Description cells"],
        visualChecks: ["No missing content or blank preview", "No clipping, unexpected tooltips or overlapping controls"],
        limitations: "The image shows the final state; the external browser controller verifies the lifecycle action. No application restart or injected state is claimed.",
      }, null, 2) + "\n");
    }
    let frame = await frameForDocument();
    if (await frame.locator("[data-okf-description-toggle]:visible").getAttribute("aria-expanded") === "true") await frame.locator("[data-okf-description-toggle]:visible").click();
    for (let step = 0; step < 3; step += 1) await frame.locator("[data-sphinx-preview-zoom-in]").click();
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-zoom"), "130");
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-incoming"), "on");
    await frame.locator("[data-sphinx-preview-diff-toggle]").click();
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-incoming"), "off");
    await capture("01-before-window-reload", frame, "Collapse Description and zoom to 130 % before invoking Developer: Reload Window.");
    const nonce = await frame.evaluate(() => document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce);
    await command(page, "Developer: Reload Window");
    frame = await frameForDocument(nonce);
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-zoom"), "130", "zoom survives the window reload");
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-incoming"), "off", "the Diff off state survives the window reload");
    assert.equal(await frame.locator("[data-sphinx-preview-diff-toggle]").getAttribute("aria-pressed"), "false");
    await capture("02-after-window-reload", frame, "Invoke Developer: Reload Window; wait for a restored visible preview with a new script nonce.");
    const restoredNonce = await frame.evaluate(() => document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce);
    const previewTab = page.locator('.tab[data-resource-name^="webview-markdown-okf-schema-studio.preview-"]')
      .filter({ has: page.locator('.tab-label[aria-label="Studio · reload-evidence.md"]') });
    await previewTab.hover();
    await previewTab.locator('.tab-actions [role="button"][aria-label^="Close"]').click();
    await previewTab.waitFor({ state: "detached" });
    assert.equal(await page.locator('.tab[data-resource-name="reload-evidence.md"]').count(), 1);
    await command(page, "Markdown OKF-Schema Studio: Open Preview to Side");
    frame = await frameForDocument(restoredNonce);
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-zoom"), "130", "zoom survives closing and reopening");
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-incoming"), "off", "the Diff off state survives closing and reopening");
    for (let step = 0; step < 3; step += 1) await frame.locator("[data-sphinx-preview-zoom-out]").click();
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-zoom"), "100");
    await capture("03-after-close-reopen", frame, "Close the restored preview and open a new preview for the same document.");
    fs.writeFileSync(path.join(output, "INDEX.md"), "# Reload and Reopen Review\n\n1. [Before window reload](01-before-window-reload.png) / [notes](01-before-window-reload.json)\n2. [After actual window reload](02-after-window-reload.png) / [notes](02-after-window-reload.json)\n3. [After close and reopen](03-after-close-reopen.png) / [notes](03-after-close-reopen.json)\n");
    passed = true;
    fs.writeFileSync(path.join(E2E_REPORT_ROOT, "RELOAD-LATEST.md"), `# Latest Reload Evidence\n\n[Ordered captures](screenshots/${path.basename(output)}/INDEX.md)\n\n[Suite result](screenshots/${path.basename(output)}/manifest.json)\n`);
  } finally {
    fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify({ suiteResult: passed ? "passed" : "failed", command: process.argv.join(" "),
      runId: process.env.STUDIO_E2E_RUN_ID ?? null,
      campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
      startedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: extensionRoot, encoding: "utf8" }).trim(),
      dirty: execFileSync("git", ["status", "--porcelain"], { cwd: extensionRoot, encoding: "utf8" }).trim().length > 0,
      completedAt: new Date().toISOString() }, null, 2));
    await browser?.close();
    child.kill();
    await new Promise<void>(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else child.once("exit", () => resolve()); });
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
