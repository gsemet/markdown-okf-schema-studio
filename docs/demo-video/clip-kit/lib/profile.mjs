// The throwaway VS Code profile and workspace of a clip, and the VS Code and extension installs.
// Never touches the maintainer's profile.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { DEFAULT_CODE_VERSION, WINDOW, checkDisplay, cleanEnv, repoRequire, run, scratchRoot } from "./platform.mjs";

/** Everything a step needs to know about one clip and where its working files go. */
export function makeContext(clipFolder, flags = {}) {
  const clipDir = resolve(clipFolder);
  const name = basename(clipDir);
  const scratch = scratchRoot();
  const work = join(scratch, name);
  return {
    clipDir,
    name,
    scratch,
    work,
    vsix: flags.vsix ? resolve(flags.vsix) : undefined,
    user: join(work, "user"),
    extensions: join(work, "ext"),
    workspace: join(work, "workspace"),
    take: join(work, "take"),
    render: join(work, "render"),
    remotion: join(scratch, "remotion"),
    hostFile: join(work, "host.json"),
    takeHostFile: join(work, "take", "host.json"),
  };
}

/** The profile settings every clip shares (the short-demo ones), and the paste and line-end rules. */
export const BASE_SETTINGS = {
  "workbench.startupEditor": "none",
  "workbench.colorTheme": "Default Light Modern",
  "workbench.tips.enabled": false,
  "security.workspace.trust.enabled": false,
  "telemetry.telemetryLevel": "off",
  "update.mode": "none",
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "editor.minimap.enabled": false,
  "workbench.editor.enablePreview": false,
  "window.commandCenter": false,
  "workbench.layoutControl.enabled": false,
  "window.zoomLevel": 0.5,
  "chat.disableAIFeatures": true,
  "editor.fontSize": 14,
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "chat.commandCenter.enabled": false,
  "window.titleBarStyle": "custom",
  "breadcrumbs.enabled": false,
  "editor.wordWrap": "on",
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 200,
  "workbench.statusBar.visible": false,
  "workbench.activityBar.location": "hidden",
  "workbench.hover.delay": 20000,
  "workbench.sash.hoverDelay": 20000,
  "workbench.colorCustomizations": { "sash.hoverBorder": "#00000000" },
  "markdownOkfSchemaStudio.comments.authorName": "Reviewer",
  "editor.smoothScrolling": true,
  "editor.occurrencesHighlight": "off",
  "editor.selectionHighlight": false,
  "workbench.sideBar.location": "left",
  "files.eol": "\n",
  "editor.pasteAs.showPasteSelector": "never",
};

/** The VS Code to film: DEMO_CODE (a local install) or the pinned download. Returns { executable, cli, version, pinned }. */
export async function resolveVSCode(ctx) {
  const testElectron = repoRequire("@vscode/test-electron");
  if (process.env.DEMO_CODE) {
    const executable = resolve(process.env.DEMO_CODE);
    if (!existsSync(executable)) throw new Error(`DEMO_CODE points to ${executable}, which does not exist`);
    const [cli, ...cliArgs] = testElectron.resolveCliArgsFromVSCodeExecutablePath(executable);
    return { executable, cli, cliArgs, version: "local install", pinned: false };
  }
  const cachePath = join(ctx.scratch, "vscode");
  mkdirSync(cachePath, { recursive: true });
  const executable = await testElectron.downloadAndUnzipVSCode({ version: DEFAULT_CODE_VERSION, cachePath });
  const [cli, ...cliArgs] = testElectron.resolveCliArgsFromVSCodeExecutablePath(executable);
  return { executable, cli, cliArgs, version: DEFAULT_CODE_VERSION, pinned: true };
}

/** Builds the throwaway profile, the workspace with the clip's stage, and installs the extension. */
export async function setupProfile(ctx, scenario) {
  const { scale, area } = checkDisplay();
  const code = await resolveVSCode(ctx);
  for (const folder of [ctx.user, ctx.extensions, ctx.workspace]) rmSync(folder, { recursive: true, force: true });
  mkdirSync(join(ctx.user, "User", "globalStorage"), { recursive: true });
  mkdirSync(ctx.extensions, { recursive: true });
  mkdirSync(ctx.workspace, { recursive: true });
  for (const [from, to] of Object.entries(scenario.stage)) {
    const target = join(ctx.workspace, to);
    mkdirSync(join(target, ".."), { recursive: true });
    cpSync(join(ctx.clipDir, from), target, { recursive: true });
  }
  writeFileSync(join(ctx.user, "User", "settings.json"), JSON.stringify({ ...BASE_SETTINGS, ...scenario.settings }, null, 2));
  writeFileSync(
    join(ctx.user, "User", "globalStorage", "storage.json"),
    JSON.stringify({ windowsState: { lastActiveWindow: { folder: pathToFileURL(ctx.workspace).href, uiState: { mode: 1, x: 24, y: 24, width: WINDOW.width, height: WINDOW.height } }, openedWindows: [] } }, null, 2),
  );
  writeFileSync(join(ctx.user, "User", "keybindings.json"), JSON.stringify([{ key: "ctrl+alt+m", command: "workbench.action.toggleMaximizeEditorGroup" }]));
  const target = ctx.vsix ?? "GaetanSemet.markdown-okf-schema-studio";
  if (ctx.vsix && !existsSync(ctx.vsix)) throw new Error(`The VSIX ${ctx.vsix} does not exist; run \`just package\` first`);
  run(code.cli, [...code.cliArgs, "--user-data-dir", ctx.user, "--extensions-dir", ctx.extensions, "--install-extension", target, "--force"], { shell: true, env: cleanEnv() });
  const installed = readdirSync(ctx.extensions).find((entry) => entry.startsWith("gaetansemet.markdown-okf-schema-studio-"));
  if (!installed) throw new Error("The extension is not in the extensions folder after the install");
  const extensionVersion = /-(\d+\.\d+\.\d+)/u.exec(installed)?.[1] ?? "unknown";
  const host = {
    vscodeVersion: code.version,
    vscodePinned: code.pinned,
    extensionVersion,
    extensionSource: ctx.vsix ? "vsix" : "marketplace",
    deviceScale: scale,
    workArea: { width: area.width, height: area.height },
    platform: process.platform,
  };
  writeFileSync(ctx.hostFile, JSON.stringify(host, null, 2));
  return { code, host };
}
