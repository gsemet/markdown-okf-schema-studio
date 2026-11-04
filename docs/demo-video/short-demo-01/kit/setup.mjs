// Builds a throwaway VS Code profile and a neutral workspace; never touches the owner's profile.
import { rmSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
const S = process.env.DEMO_SCRATCH, doc = process.env.DEMO_DOC;
for (const d of ["vscode-user", "vscode-ext", "demo-workspace"]) rmSync(`${S}/${d}`, { recursive: true, force: true });
mkdirSync(`${S}/vscode-user/User/globalStorage`, { recursive: true });
mkdirSync(`${S}/vscode-ext`, { recursive: true });
mkdirSync(`${S}/demo-workspace`, { recursive: true });
cpSync(doc, `${S}/demo-workspace/checkout-outage.md`);
cpSync(`${dirname(doc)}/_schema`, `${S}/demo-workspace/_schema`, { recursive: true });
writeFileSync(`${S}/vscode-user/User/settings.json`, JSON.stringify({
  "workbench.startupEditor": "none", "workbench.colorTheme": "Default Light Modern",
  "workbench.tips.enabled": false, "security.workspace.trust.enabled": false,
  "telemetry.telemetryLevel": "off", "update.mode": "none", "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false, "editor.minimap.enabled": false,
  "workbench.editor.enablePreview": false, "window.commandCenter": false,
  "workbench.layoutControl.enabled": false, "window.zoomLevel": 0.5, "chat.disableAIFeatures": true,
  "editor.fontSize": 14, "workbench.secondarySideBar.defaultVisibility": "hidden",
  "chat.commandCenter.enabled": false, "window.titleBarStyle": "custom", "breadcrumbs.enabled": false,
  "editor.wordWrap": "on", "files.autoSave": "afterDelay", "files.autoSaveDelay": 200, "workbench.statusBar.visible": false,
  "workbench.activityBar.location": "hidden", "workbench.hover.delay": 20000, "workbench.sash.hoverDelay": 20000, "workbench.colorCustomizations": { "sash.hoverBorder": "#00000000" },
  "markdownOkfSchemaStudio.comments.authorName": "Reviewer", "editor.smoothScrolling": true, "editor.occurrencesHighlight": "off", "editor.selectionHighlight": false, "workbench.sideBar.location": "left",
}, null, 2));
writeFileSync(`${S}/vscode-user/User/globalStorage/storage.json`, JSON.stringify({
  windowsState: { lastActiveWindow: { folder: `file://${S}/demo-workspace`,
    uiState: { mode: 1, x: 60, y: 60, width: 1440, height: 810 } }, openedWindows: [] } }, null, 2));
writeFileSync(`${S}/vscode-user/User/keybindings.json`, JSON.stringify([
  { key: "ctrl+alt+m", command: "workbench.action.toggleMaximizeEditorGroup" },
]));
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(VSCODE_|ELECTRON_|__CFBundle)/.test(k)) delete env[k];
execFileSync("/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
  ["--user-data-dir", `${S}/vscode-user`, "--extensions-dir", `${S}/vscode-ext`, "--install-extension", "GaetanSemet.markdown-okf-schema-studio"],
  { env, stdio: "inherit" });
