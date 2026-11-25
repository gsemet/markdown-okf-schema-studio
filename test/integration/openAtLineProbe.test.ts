import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";

import { EDITOR_VIEW_TYPE, getActivePreviewForTests } from "./extensionApi";
import { closeAllEditors, createFixture, waitFor } from "./realInput/harness";
import { documentWithHeadingAt42, settle, slugOf, studioTabs, tabs, textTabs, withAssociation } from "./openAtLineHelpers";

/** What one jump left in the window: the signals of CR-483 section 4.2, one run of the probe. */
interface Observation {
  entry: string;
  state: string;
  /** Studio tabs of the target. */
  studio: number;
  /** Text tabs of the target. */
  text: number;
  /** `fragment/query` of the target's Studio tabs, `-` for none. */
  tabUri: string;
  /** Lines (1-based) of every selection event the target's text editors gave during the jump. */
  selections: number[];
  /** The target's text editor was visible at some moment during the jump. */
  textEditorSeen: boolean;
  /** The 1-based line of the active text editor when it shows the target, else undefined. */
  activeTextLine: number | undefined;
  /** The line marker the active Studio preview was asked to draw (a hand-off, never a plain jump). */
  marked: number | undefined;
  /** What the entry needed beyond its named command (a note, or ""). */
  note: string;
}

/**
 * CR-483 probe (section 4): which signals a Studio tab sees for each way of jumping to line 42 of a
 * Markdown file, with the `*.md` association (A) and without it (D), with the file not open (cold)
 * and with its Studio tab open in another group (warm). Each run has a fresh fixture directory and a
 * fresh window (every tab closed, Quick Open closed, search cleared), so a run holds nothing of the
 * previous one. Each run logs one line `[open-at-line:probe] <entry> | <state> | ...`.
 *
 * Measured on VS Code 1.147.0, Windows 11 (the Linux integration job runs the same code):
 *
 * | state (file not open)       | entry                       | result                                        |
 * | --------------------------- | --------------------------- | --------------------------------------------- |
 * | associated                  | plain jump                  | 1 Studio tab, no line signal                  |
 * | associated                  | Quick Open `file.md:42`     | 1 Studio tab, no line signal                  |
 * | associated                  | link `#L42`, link `#heading`| 1 Studio tab, no line signal                  |
 * | associated                  | Problems, Go to Symbol      | 1 Studio tab, no line signal                  |
 * | associated                  | Search                      | the commands opened nothing (not drivable)    |
 * | default                     | jump, links, Problems, Symbol | a text editor at line 42 (selection event)  |
 * | default                     | Quick Open, Search          | flaky or nothing opened in the window         |
 * | associated, Studio elsewhere| jump, Quick Open, links     | a second Studio tab in the active group       |
 * | associated, Studio elsewhere| Problems, Symbol, Search    | the existing tab revealed or nothing, no line |
 * | default, Studio elsewhere   | jump, links, Problems, Symbol | a text editor at 42, the Studio tab kept    |
 * | default, Studio elsewhere   | Quick Open                  | a second Studio tab (not text)                |
 *
 * In every associated row the Studio tab's URI has no fragment and no query, VS Code gives no
 * selection event, no text editor is seen at resolve and nothing marks the page: there is no reliable
 * signal, so no watcher is built and the command "Open in Studio at This Line" covers every entry.
 * The Search view's last opened match and Quick Open's typed line are not named by any public, stable
 * command or API (`vscode.d.ts` has no such member; the search APIs are proposed).
 */
interface Entry {
  name: string;
  /** Drives the jump; `target` and `source` are the fixture's files, `token` its unique word. */
  /** Optional set-up that is not part of the jump (its events are not counted). */
  prepare?(context: { target: vscode.Uri; source: vscode.Uri; anchor: vscode.Uri; token: string; directory: string }): Promise<void>;
  drive(context: { target: vscode.Uri; source: vscode.Uri; anchor: vscode.Uri; token: string; directory: string }): Promise<string>;
}

/** Tab events (opened or changed) of the target since the last reset: what a jump did to its tabs. */
let targetTabEvents = 0;

const isTargetTab = (tab: vscode.Tab, target: vscode.Uri): boolean => (tab.input instanceof vscode.TabInputText
  || tab.input instanceof vscode.TabInputCustom) && tab.input.uri.fsPath === target.fsPath;

/** Waits up to `milliseconds` for a tab event of the target (a tab opened, or an existing one revealed). */
async function reachedTarget(milliseconds: number): Promise<boolean> {
  for (let waited = 0; waited < milliseconds; waited += 100) {
    if (targetTabEvents > 0) return true;
    await settle(100);
  }
  return targetTabEvents > 0;
}

async function openSourceWithLinkAt(source: vscode.Uri, text: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument(source);
  const editor = await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false });
  const offset = document.getText().indexOf(text) + 2;
  const position = document.positionAt(offset);
  editor.selection = new vscode.Selection(position, position);
  await settle(1500);
}

const ENTRIES: Entry[] = [
  {
    name: "plain jump (vscode.open + selection)",
    drive: async ({ target }) => {
      await vscode.commands.executeCommand("vscode.open", target, { selection: new vscode.Range(41, 0, 41, 0), preview: false });
      return "";
    },
  },
  {
    name: "search result (focusNextSearchResult)",
    drive: async ({ target, token }) => {
      await vscode.commands.executeCommand("workbench.action.findInFiles", {
        query: `Needle${token}`, triggerSearch: true, isRegex: false,
      });
      await settle(4000);
      await vscode.commands.executeCommand("search.action.focusNextSearchResult");
      if (await reachedTarget(2000)) return "focusNextSearchResult opened it";
      await vscode.commands.executeCommand("search.action.openResult");
      return await reachedTarget(2000) ? "focusNextSearchResult only focused; openResult opened it" : "neither command opened it";
    },
  },
  {
    name: "Quick Open file.md:42",
    drive: async ({ target }) => {
      await vscode.commands.executeCommand("workbench.action.quickOpen", `${path.basename(target.fsPath)}:42`);
      await settle(4000);
      await vscode.commands.executeCommand("workbench.action.acceptSelectedQuickOpenItem");
      if (await reachedTarget(2000)) return "";
      // The picker may not have listed the new file yet: open it again and accept once more.
      await vscode.commands.executeCommand("workbench.action.quickOpen", `${path.basename(target.fsPath)}:42`);
      await settle(5000);
      await vscode.commands.executeCommand("workbench.action.acceptSelectedQuickOpenItem");
      return await reachedTarget(2000) ? "second try" : "Quick Open opened nothing";
    },
  },
  {
    name: "link target.md#L42 (editor.action.openLink)",
    drive: async ({ source }) => {
      await openSourceWithLinkAt(source, "#L42");
      await vscode.commands.executeCommand("editor.action.openLink");
      return "";
    },
  },
  {
    name: "link target.md#heading (editor.action.openLink)",
    drive: async ({ source, token }) => {
      await openSourceWithLinkAt(source, `#${slugOf(`Needle${token} heading`)}`);
      await vscode.commands.executeCommand("editor.action.openLink");
      return "";
    },
  },
  {
    name: "Problems (marker.nextInFiles)",
    drive: async ({ target, anchor }) => {
      const collection = vscode.languages.createDiagnosticCollection("open-at-line-probe");
      collection.set(target, [new vscode.Diagnostic(new vscode.Range(41, 0, 41, 5), "probe diagnostic", vscode.DiagnosticSeverity.Warning)]);
      try {
        // The command needs an editor to navigate from: an unrelated text file, so the target is not open as text.
        await vscode.window.showTextDocument(anchor, { viewColumn: vscode.ViewColumn.One, preview: false });
        await settle(1500);
        targetTabEvents = 0;
        await vscode.commands.executeCommand("editor.action.marker.nextInFiles");
        return await reachedTarget(3000) ? "from an unrelated text editor" : "marker.nextInFiles opened nothing";
      } finally {
        collection.dispose();
      }
    },
  },
  {
    name: "Go to Symbol in Workspace (#heading)",
    // The workspace symbol index learns a file when it is opened: open it as text once, then close that tab.
    prepare: async ({ target }) => {
      await vscode.commands.executeCommand("vscode.openWith", target, "default", { viewColumn: vscode.ViewColumn.One, preview: false });
      await settle(2000);
      for (const tab of textTabs(target.fsPath)) await vscode.window.tabGroups.close(tab);
      await settle(500);
    },
    drive: async ({ token }) => {
      targetTabEvents = 0;
      await vscode.commands.executeCommand("workbench.action.quickOpen", `#Needle${token}`);
      await settle(3000);
      await vscode.commands.executeCommand("workbench.action.acceptSelectedQuickOpenItem");
      return await reachedTarget(2000) ? "after opening the file as text once" : "Go to Symbol opened nothing";
    },
  },
];

async function closeTransientUi(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
  await vscode.commands.executeCommand("search.action.clearSearchResults");
  await vscode.commands.executeCommand("workbench.action.closePanel");
}

/** One run of one entry in one state, from a fresh fixture and an empty window. */
async function probeOne(entry: Entry, associated: boolean, warm: boolean): Promise<Observation> {
  const token = Math.random().toString(36).slice(2, 10);
  const heading = `Needle${token} heading`;
  const fixture = createFixture("open-at-line-probe", {
    [`target-${token}.md`]: documentWithHeadingAt42("Target", heading),
    "anchor.txt": "unrelated text\n",
    [`source-${token}.md`]: `# Source\n\nGo to [line](target-${token}.md#L42) and [heading](target-${token}.md#${slugOf(heading)}).\n`,
  });
  const target = vscode.Uri.file(fixture.path(`target-${token}.md`));
  const source = vscode.Uri.file(fixture.path(`source-${token}.md`));
  const anchor = vscode.Uri.file(fixture.path("anchor.txt"));
  const state = `${associated ? "associated" : "default"}/${warm ? "Studio tab elsewhere" : "not open"}`;
  const selections: number[] = [];
  let textEditorSeen = false;
  const subscriptions = [
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor.document.uri.fsPath === target.fsPath) selections.push(event.selections[0]!.active.line + 1);
    }),
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      if (editors.some((editor) => editor.document.uri.fsPath === target.fsPath)) textEditorSeen = true;
    }),
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      if ([...event.opened, ...event.changed].some((tab) => isTargetTab(tab, target))) targetTabEvents += 1;
    }),
  ];
  try {
    return await withAssociation(associated, async () => {
      if (warm) {
        await vscode.commands.executeCommand("vscode.openWith", target, EDITOR_VIEW_TYPE, { viewColumn: vscode.ViewColumn.Two, preview: false });
        await waitFor("a Studio tab elsewhere", () => studioTabs(target.fsPath).length === 1, 30_000);
        await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
      }
      const context = { target, source, anchor, token, directory: fixture.directory };
      await entry.prepare?.(context);
      selections.length = 0;
      textEditorSeen = false;
      targetTabEvents = 0;
      const note = await entry.drive(context);
      await settle(2500);
      const custom = studioTabs(target.fsPath).map((tab) => (tab.input as vscode.TabInputCustom).uri);
      const active = vscode.window.activeTextEditor;
      const observation: Observation = {
        entry: entry.name,
        state,
        studio: studioTabs(target.fsPath).length,
        text: textTabs(target.fsPath).length,
        tabUri: custom.map((uri) => `${uri.fragment || "-"}/${uri.query || "-"}`).join(",") || "none",
        selections: [...selections],
        textEditorSeen,
        activeTextLine: active?.document.uri.fsPath === target.fsPath ? active.selection.active.line + 1 : undefined,
        marked: getActivePreviewForTests()?.markedLine?.line,
        note,
      };
      console.log(`[open-at-line:probe] ${observation.entry} | ${observation.state} | studio=${observation.studio} text=${observation.text}`
        + ` | tabUri=${observation.tabUri} | selections=${observation.selections.join(",") || "none"} | textEditorSeen=${observation.textEditorSeen}`
        + ` | activeTextLine=${observation.activeTextLine ?? "none"} | marked=${observation.marked ?? "none"}${note ? ` | ${note}` : ""}`);
      return observation;
    });
  } finally {
    for (const subscription of subscriptions) subscription.dispose();
    await closeTransientUi();
    fixture.dispose();
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-195#S1
/**
 * CR-483 probe and matrix of section 4 and 7.3: every way of jumping to line 42, under the `*.md`
 * association and by default, with the file not open and with its Studio tab in another group. The
 * default column is asserted (a text editor at line 42 that stays); the associated column is asserted
 * to the measured verdict: Studio opens at the top, VS Code hands it no line, nothing marks it.
 * Every tab is closed at the end of each run.
 */
export async function run(): Promise<void> {
  const observations: Observation[] = [];
  try {
    for (const warm of [false, true]) {
      for (const associated of [true, false]) {
        for (const entry of ENTRIES) observations.push(await probeOne(entry, associated, warm));
      }
    }
  } finally {
    await closeAllEditors();
  }
  assert.deepEqual(tabs().map((tab) => tab.label), [], "the probe leaves no tab open");
  for (const observation of observations) {
    const label = `${observation.entry} (${observation.state})`;
    assert.equal(observation.marked, undefined, `${label}: no jump marks a Studio tab (VS Code hands none a line)`);
    const opened = !/opened nothing|neither command/u.test(observation.note);
    if (observation.state === "associated/not open" && opened && observation.studio + observation.text > 0) {
      assert.deepEqual([observation.studio, observation.text, observation.tabUri], [1, 0, "-/-"], `${label}: Studio opens at the top with no line in its URI`);
    }
  }
}
