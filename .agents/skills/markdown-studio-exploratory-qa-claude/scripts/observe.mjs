import fs from "node:fs";
import path from "node:path";
// Long-running console/error observer for all frames of the workbench page.
export default async function ({ page, browser, session, delay }) {
  const file = path.join(session.dir, "console.log");
  // `q doctor` reads the pid file; the observer ends with its window.
  fs.writeFileSync(path.join(session.dir, "observer.pid"), String(process.pid));
  browser.on("disconnected", () => process.exit(0));
  const write = (line) => fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
  const label = (frame) => {
    const url = frame?.url?.() ?? "";
    return url.includes("vscode-webview") ? "webview" : url.includes("workbench") ? "workbench" : url.slice(0, 40);
  };
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "debug" || type === "log" && !/studio|sphinx|preview|okf|myst|mermaid/i.test(msg.text())) return;
    let frame; try { frame = msg.location()?.url ?? ""; } catch {}
    write(`[console.${type}] ${String(frame).slice(0, 60)} :: ${msg.text().slice(0, 1500)}`);
  });
  page.on("pageerror", (error) => write(`[pageerror] ${error.message}`));
  page.on("frameattached", (frame) => write(`[frame+] ${frame.url().slice(0, 90)}`));
  page.on("framedetached", (frame) => write(`[frame-] ${frame.url().slice(0, 90)}`));
  page.on("framenavigated", (frame) => { if (frame.url().includes("vscode-webview")) write(`[nav] ${label(frame)} ${frame.url().slice(0, 120)}`); });
  write("observer started");
  for (;;) await delay(60_000);
}
