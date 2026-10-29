import * as assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, Frame, Page } from "playwright-core";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";
import { captureByLegacy } from "../shared/captureRegistry";
import { freePort } from "../shared/runIsolation";
import { writeTestProfileSettings } from "../shared/testProfile";
import { RealWindowEvidence } from "./evidence";
import { activateMacProcess, frontmostPid, macFocusDiagnostics } from "./macWindow";

async function waitFor(label: string, predicate: () => boolean | Promise<boolean>,
  explain?: () => Promise<string>): Promise<void> {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch { }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}${explain ? `. ${await explain()}` : ""}`);
}

/**
 * What the campaign window showed when a wait failed: the window focus as VS Code and macOS report
 * it, the open tabs, the quick input, workbench toasts, the frames that hold a preview, and a
 * screenshot of the window (CI guidelines rule 12).
 */
async function workbenchReport(page: Page, pid: number | undefined): Promise<string> {
  let state: unknown;
  try {
    state = await page.evaluate(() => ({
      titlebar: Array.from(document.querySelectorAll(".part.titlebar")).map(element => String(element.className)),
      tabs: Array.from(document.querySelectorAll(".tab")).map(element =>
        `${element.getAttribute("data-resource-name") ?? "?"}${element.getAttribute("aria-selected") === "true" ? " (selected)" : ""}`),
      quickInput: Array.from(document.querySelectorAll<HTMLInputElement>(".quick-input-widget input"))
        .map(input => ({ visible: input.offsetParent !== null, value: input.value })),
      activeElement: document.activeElement ? `${document.activeElement.tagName.toLowerCase()}.${String(document.activeElement.className).split(/\s+/u).join(".")}` : null,
      messages: Array.from(document.querySelectorAll(
        ".notifications-toasts .notification-list-item-message, .monaco-dialog-box .dialog-message-text",
      )).map(element => (element.textContent ?? "").trim()).filter(text => text !== ""),
    }));
  } catch (error) {
    state = `unavailable: ${String(error)}`;
  }
  const previews: unknown[] = [];
  for (const frame of page.frames()) {
    try {
      if (await frame.locator("[data-okf-description-toggle]").count() === 0) continue;
      previews.push(await frame.evaluate(() => ({ documentId: document.documentElement.getAttribute("data-sphinx-preview-document-id"),
        nonce: document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? null })));
    } catch (error) {
      previews.push(`unavailable: ${String(error)}`);
    }
  }
  const screenshot = path.join(E2E_REPORT_ROOT, "reload-failure.png");
  let shot = screenshot;
  try { await page.screenshot({ path: screenshot }); } catch (error) { shot = `unavailable: ${String(error)}`; }
  return JSON.stringify({ windowPid: pid ?? null, frontmostPid: process.platform === "darwin" ? frontmostPid() : null,
    ...(process.platform === "darwin" ? macFocusDiagnostics() : {}), page: state, previews, screenshot: shot });
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

/**
 * The campaign drives its window with keys (Escape, F1, Enter), which on macOS reach nothing in a
 * window that was never the active window (windowFocus.ts explains why). This window has no test
 * extension host to ask, so the signal is the one the workbench itself shows: its title bar drops
 * the `inactive` class when VS Code receives the window focus, while macOS reports the window's
 * main process (`pid`) as the frontmost app. When the window is behind, ask macOS to bring it to
 * the front and wait for both; fail with the diagnostics when they never come (a locked screen).
 */
async function ensureCampaignWindowFocused(page: Page, pid: number | undefined): Promise<void> {
  if (process.platform !== "darwin") return;
  assert.ok(pid !== undefined, "the reload campaign window has no process id");
  const focused = async (): Promise<boolean> => frontmostPid() === pid
    && await page.locator(".part.titlebar").count() === 1
    && await page.locator(".part.titlebar.inactive").count() === 0;
  if (await focused()) return;
  // osascript runs from this runner, so macOS asks the Automation permission for the app that
  // started the tests (the terminal or editor running npm).
  const requester = process.env.TERM_PROGRAM ? `the app that runs npm (${process.env.TERM_PROGRAM})`
    : "the app that runs npm (your terminal or editor)";
  const activation = activateMacProcess(pid, requester);
  console.log(`Reload campaign: the window was not the active window; macOS activation ${activation}.`);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await focused()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const titlebar = await page.locator(".part.titlebar").evaluateAll(elements =>
    elements.map(element => String(element.className)));
  throw new Error(`The reload campaign window never became the active window (macOS activation ${activation}).`
    + " The real-window tests need an unlocked session. "
    + JSON.stringify({ windowPid: pid, frontmostPid: frontmostPid(), titlebar, ...macFocusDiagnostics() }));
}

/** `onSpawn` hands the window process, its user-data directory and CDP port to the hang watchdog. */
// @tests_req StRS-MDOKFSTUDIO-LIFE-014
// @tests_req SwRS-MDOKFSTUDIO-LIFE-170
export async function runReloadCampaign(executable: string, extensionRoot: string, workspaceRoot: string,
  onSpawn?: (child: ChildProcess, userDataDirectory: string, port: number) => void): Promise<void> {
  const temporary = fs.mkdtempSync("/tmp/studio-reload-");
  fs.mkdirSync(E2E_REPORT_ROOT, { recursive: true });
  fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
  // The suite writes its own INDEX.md; the shared writer handles the captures and the manifest list.
  const evidence = new RealWindowEvidence("reload", { indexTitle: false });
  const output = evidence.directory;
  const sourcePath = path.join(temporary, "reload-evidence.md");
  const schemaDirectory = path.join(temporary, "_schema");
  fs.mkdirSync(schemaDirectory);
  fs.writeFileSync(path.join(schemaDirectory, "finding.schema.yaml"), "type: object\nproperties:\n  type:\n    type: string\n    const: finding\n    description: Document kind\n  description:\n    type: string\n    description: Durable evidence summary\n");
  fs.writeFileSync(sourcePath, "---\ntype: finding\ndescription: Reload persistence evidence\n---\n# Reload evidence\n\nPersistent Description preference.\n");
  fs.writeFileSync(path.join(temporary, "index.md"), "# Reload fixture bundle\n");
  const workspaceFile = path.join(temporary, "reload.code-workspace");
  fs.writeFileSync(workspaceFile, JSON.stringify({ folders: [{ path: workspaceRoot }, { path: temporary }], settings: { "workbench.startupEditor": "none" } }));
  writeTestProfileSettings(path.join(temporary, "profile")); // focus thieves off (testProfile.ts)
  const port = await freePort();
  const child = spawn(executable, ["--no-sandbox", "--disable-updates", "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust", `--user-data-dir=${path.join(temporary, "profile")}`, `--extensions-dir=${path.join(temporary, "extensions")}`, `--extensionDevelopmentPath=${extensionRoot}`, `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", workspaceFile, "--goto", sourcePath], { stdio: "ignore" });
  onSpawn?.(child, path.join(temporary, "profile"), port);
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
    await ensureCampaignWindowFocused(page, child.pid);
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
      }, () => workbenchReport(page, child.pid));
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
      const entry = captureByLegacy("reload", name);
      assert.ok(entry, `no registered reload capture was named "${name}"`);
      await evidence.shoot(page, frame, entry.id);
      const summary = "Reload evidence document and its properties remain visible; Description is collapsed. Name and Value remain readable.";
      evidence.record(entry.id, {
        note: summary,
        json: {
          summary,
          info: { viewport: page.viewportSize(), host: "Real VS Code preview; default host theme" },
          actions: [action],
          checks: ["Source identity", "Visible current frame", "Collapsed toggle", "Zero visible Description cells"],
          visualChecks: ["No missing content or blank preview", "No clipping, unexpected tooltips or overlapping controls"],
          limitations: "The image shows the final state; the external browser controller verifies the lifecycle action. No application restart or injected state is claimed.",
        },
        markdown: `Action: ${action}\n`,
      });
    }
    let frame = await frameForDocument();
    // A fresh workspace opens with the floating toolbar collapsed: show the view controls first,
    // and the expanded toolbar is a stored choice that the reloads below keep.
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-toolbar-state"), "collapsed", "a fresh workspace starts with the toolbar collapsed");
    await frame.locator("[data-sphinx-preview-toolbar-collapse]").click();
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-toolbar-state"), "expanded");
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
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-toolbar-state"), "expanded", "the expanded toolbar survives the window reload");
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
    // The palette mode is a workspace choice: it survives a window reload and a reopened panel.
    async function openParagraphEditor(target: Frame): Promise<void> {
      if (await target.locator("html").getAttribute("data-sphinx-preview-edit-mode") !== "on") {
        await target.locator("[data-sphinx-preview-edit-toggle]").click();
      }
      await target.locator("main > p[data-sphinx-source-line]").first().click();
      await target.locator(".sphinx-preview-edit-palette select").waitFor();
    }
    async function paletteMode(target: Frame): Promise<string> {
      return await target.locator(".sphinx-preview-edit-palette").getAttribute("data-palette-mode") ?? "";
    }
    await openParagraphEditor(frame);
    assert.equal(await paletteMode(frame), "gfm", "a workspace with no choice starts in GFM");
    await frame.locator(".sphinx-preview-edit-palette select").selectOption("strict");
    assert.equal(await paletteMode(frame), "strict");
    assert.equal(await frame.locator("main .sphinx-preview-block-editor").count(), 1, "choosing a mode keeps the editor open");
    await frame.locator("main .sphinx-preview-block-editor textarea").press("Escape");
    await frame.locator(".sphinx-preview-edit-palette").waitFor({ state: "detached" });
    const modeNonce = await frame.evaluate(() => document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce);
    await command(page, "Developer: Reload Window");
    frame = await frameForDocument(modeNonce);
    await openParagraphEditor(frame);
    assert.equal(await paletteMode(frame), "strict", "the palette mode survives the window reload");
    await frame.locator("main .sphinx-preview-block-editor textarea").press("Escape");
    await frame.locator(".sphinx-preview-edit-palette").waitFor({ state: "detached" });
    const reloadedNonce = await frame.evaluate(() => document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce);
    const modeTab = page.locator('.tab[data-resource-name^="webview-markdown-okf-schema-studio.preview-"]')
      .filter({ has: page.locator('.tab-label[aria-label="Studio · reload-evidence.md"]') });
    await modeTab.hover();
    await modeTab.locator('.tab-actions [role="button"][aria-label^="Close"]').click();
    await modeTab.waitFor({ state: "detached" });
    await command(page, "Markdown OKF-Schema Studio: Open Preview to Side");
    frame = await frameForDocument(reloadedNonce);
    await openParagraphEditor(frame);
    assert.equal(await paletteMode(frame), "strict", "a new panel starts in the stored palette mode");
    await frame.locator("main .sphinx-preview-block-editor textarea").press("Escape");
    evidence.assertComplete();
    fs.writeFileSync(path.join(output, "INDEX.md"), "# Reload and Reopen Review\n\n1. [Before window reload](lifecycle-sync/r16-before-window-reload.png) / [notes](lifecycle-sync/r16-before-window-reload.json)\n2. [After actual window reload](lifecycle-sync/r17-after-window-reload.png) / [notes](lifecycle-sync/r17-after-window-reload.json)\n3. [After close and reopen](lifecycle-sync/r18-after-close-reopen.png) / [notes](lifecycle-sync/r18-after-close-reopen.json)\n");
    passed = true;
    fs.writeFileSync(path.join(E2E_REPORT_ROOT, "RELOAD-LATEST.md"), `# Latest Reload Evidence\n\n[Ordered captures](screenshots/${path.basename(output)}/INDEX.md)\n\n[Suite result](screenshots/${path.basename(output)}/manifest.json)\n`);
  } finally {
    evidence.writeManifest({ suiteResult: passed ? "passed" : "failed", command: process.argv.join(" "),
      runId: process.env.STUDIO_E2E_RUN_ID ?? null,
      campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
      startedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: extensionRoot, encoding: "utf8" }).trim(),
      dirty: execFileSync("git", ["status", "--porcelain"], { cwd: extensionRoot, encoding: "utf8" }).trim().length > 0,
      completedAt: new Date().toISOString() });
    await browser?.close();
    child.kill();
    await new Promise<void>(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else child.once("exit", () => resolve()); });
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
