// Observation-only helper: records editor/document state so QA can compare what the
// product shows with the real buffer. It never edits documents.
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

const outDir = process.env.QA_SPY_OUT || path.join(require("node:os").tmpdir(), "qa-spy");
fs.mkdirSync(outDir, { recursive: true });
const statePath = path.join(outDir, "state.json");
const eventsPath = path.join(outDir, "events.jsonl");

function tabInput(input) {
  if (!input) return { kind: "unknown" };
  if (input instanceof vscode.TabInputText) return { kind: "text", uri: input.uri.fsPath };
  if (input instanceof vscode.TabInputTextDiff) return { kind: "diff", uri: input.modified.fsPath };
  if (input instanceof vscode.TabInputCustom) return { kind: "custom", viewType: input.viewType, uri: input.uri.fsPath };
  if (input instanceof vscode.TabInputWebview) return { kind: "webview", viewType: input.viewType };
  return { kind: "other" };
}

function snapshot() {
  const active = vscode.window.activeTextEditor;
  return {
    at: new Date().toISOString(),
    activeEditor: active ? {
      uri: active.document.uri.toString(),
      selection: [active.selection.start.line + 1, active.selection.start.character, active.selection.end.line + 1, active.selection.end.character],
      visible: active.visibleRanges.map((r) => [r.start.line + 1, r.end.line + 1]),
      viewColumn: active.viewColumn,
    } : null,
    visibleEditors: vscode.window.visibleTextEditors.map((e) => ({
      uri: e.document.uri.toString(),
      visible: e.visibleRanges.map((r) => [r.start.line + 1, r.end.line + 1]),
      viewColumn: e.viewColumn,
    })),
    tabs: vscode.window.tabGroups.all.map((group) => ({
      viewColumn: group.viewColumn,
      isActive: group.isActive,
      tabs: group.tabs.map((tab) => ({ label: tab.label, isActive: tab.isActive, isDirty: tab.isDirty, isPreview: tab.isPreview, ...tabInput(tab.input) })),
    })),
    documents: vscode.workspace.textDocuments
      .filter((d) => d.uri.scheme === "file" || d.uri.scheme === "untitled")
      .map((d) => ({
        uri: d.uri.toString(),
        fsPath: d.uri.fsPath,
        version: d.version,
        isDirty: d.isDirty,
        eol: d.eol === vscode.EndOfLine.CRLF ? "CRLF" : "LF",
        lineCount: d.lineCount,
        languageId: d.languageId,
        text: d.getText(),
      })),
  };
}

let last = "";
function dump() {
  try {
    const json = JSON.stringify(snapshot(), null, 1);
    if (json === last) return;
    last = json;
    fs.writeFileSync(statePath + ".tmp", json);
    fs.renameSync(statePath + ".tmp", statePath);
  } catch (error) {
    fs.appendFileSync(path.join(outDir, "spy-errors.log"), String(error) + "\n");
  }
}

function event(kind, data) {
  fs.appendFileSync(eventsPath, JSON.stringify({ t: Date.now(), kind, ...data }) + "\n");
}

exports.activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("qaSpy.dump", dump),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.scheme !== "file" && e.document.uri.scheme !== "untitled") return;
      event("change", {
        uri: e.document.uri.fsPath,
        version: e.document.version,
        reason: e.reason,
        changes: e.contentChanges.map((c) => ({
          range: [c.range.start.line + 1, c.range.start.character, c.range.end.line + 1, c.range.end.character],
          rangeLength: c.rangeLength,
          text: c.text.length > 400 ? c.text.slice(0, 400) + "…(" + c.text.length + ")" : c.text,
        })),
      });
    }),
    vscode.workspace.onDidSaveTextDocument((d) => event("save", { uri: d.uri.fsPath, version: d.version })),
    vscode.workspace.onDidOpenTextDocument((d) => event("open", { uri: d.uri.toString() })),
    vscode.workspace.onDidCloseTextDocument((d) => event("close", { uri: d.uri.toString() })),
    vscode.window.onDidChangeActiveTextEditor((e) => event("activeEditor", { uri: e?.document.uri.toString() ?? null })),
  );
  const timer = setInterval(dump, 250);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
  event("activated", {});
  dump();
};

exports.deactivate = () => {};
