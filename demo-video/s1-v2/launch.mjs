// Launches the throwaway VS Code window (clean profile) detached and writes its pid.
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
const S = process.env.S_SCRATCH ?? "/private/tmp/claude-502/cr170-s";
// Strip every variable that would attach the child to the VS Code that started this shell.
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(VSCODE_|ELECTRON_|__CFBundle)/.test(k)) delete env[k];
const child = spawn("/Applications/Visual Studio Code.app/Contents/MacOS/Code", [
  "--disable-updates", "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust", "--new-window",
  "--remote-debugging-port=9344", "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${S}/vscode-user`, `--extensions-dir=${S}/vscode-ext`,
  `${S}/demo-workspace`, `${S}/demo-workspace/${process.argv[2] ?? "perf-analysis.md"}`,
], { stdio: "ignore", env, detached: true });
child.unref();
writeFileSync(`${S}/code.pid`, String(child.pid));
console.log("pid", child.pid);
