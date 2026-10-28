// Builds a throwaway, clean VS Code profile + neutral workspace under $S_SCRATCH.
// Usage: node setup.mjs <path-to.vsix>
import { rmSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const S = process.env.S_SCRATCH ?? "/private/tmp/claude-502/cr170-s";
const vsix = resolve(process.argv[2] ?? `${here}/../../out/reports/package/markdown-okf-schema-studio.vsix`);
for (const d of ["vscode-user", "vscode-ext", "demo-workspace"]) rmSync(`${S}/${d}`, { recursive: true, force: true });
mkdirSync(`${S}/vscode-user/User/globalStorage`, { recursive: true });
mkdirSync(`${S}/vscode-ext`, { recursive: true });
cpSync(`${here}/workspace`, `${S}/demo-workspace`, { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { cwd: `${S}/demo-workspace`, stdio: "ignore" });
run("git", ["init", "-q", "-b", "main"]);
run("git", ["add", "."]);
run("git", ["-c", "user.name=Demo", "-c", "user.email=demo@example.com", "commit", "-q", "-m", "Initial review"]);
writeFileSync(`${S}/vscode-user/User/settings.json`, JSON.stringify({
  "workbench.startupEditor": "none", "workbench.colorTheme": "Default Light Modern",
  "workbench.tips.enabled": false, "security.workspace.trust.enabled": false,
  "telemetry.telemetryLevel": "off", "update.mode": "none", "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false, "editor.minimap.enabled": false,
  "workbench.editor.enablePreview": false, "window.commandCenter": false,
  "workbench.layoutControl.enabled": false, "window.zoomLevel": 1, "git.enabled": true, "git.openRepositoryInParentFolders": "never", "git.autofetch": false, "chat.disableAIFeatures": true, "workbench.editor.restoreViewState": false,
  "editor.fontSize": 14, "workbench.activityBar.location": "hidden", "workbench.statusBar.visible": false,
  "markdownOkfSchemaStudio.comments.authorName": "Ada Reviewer",
  "workbench.secondarySideBar.defaultVisibility": "hidden", "chat.commandCenter.enabled": false,
  "window.titleBarStyle": "custom", "breadcrumbs.enabled": false,
  "editor.wordWrap": "on", "files.autoSave": "off",
}, null, 2));
// Synthetic CDP key events do not trigger the native macOS menu accelerators (Cmd+S), so the
// profile binds Save to a chord the workbench handles itself.
writeFileSync(`${S}/vscode-user/User/keybindings.json`, JSON.stringify([
  { key: "ctrl+alt+s", command: "workbench.action.files.save" }, { key: "ctrl+alt+b", command: "workbench.action.toggleSidebarVisibility" }], null, 2));
// Window 1440x810 pt on the built-in display (position irrelevant for CDP capture).
writeFileSync(`${S}/vscode-user/User/globalStorage/storage.json`, JSON.stringify({
  windowsState: { lastActiveWindow: { folder: `file://${S}/demo-workspace`,
    uiState: { mode: 1, x: 3476, y: 60, width: 1440, height: 810 } }, openedWindows: [] } }, null, 2));
const code = "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code";
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(VSCODE_|ELECTRON_|__CFBundle)/.test(k)) delete env[k];
execFileSync(code, ["--user-data-dir", `${S}/vscode-user`, "--extensions-dir", `${S}/vscode-ext`, "--install-extension", vsix], { env, stdio: "inherit" });
