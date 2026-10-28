/**
 * Extension host side of the hang watchdog (test/shared/hangWatchdog.ts): the suite heartbeat,
 * the step runner and the named timeout of single VS Code calls, with a dump that holds the
 * window state (vscode.window.state, active and visible tabs) next to the processes, the VS Code
 * logs and the screenshots (test/shared/hangDump.ts).
 *
 * The launcher passes `STUDIO_HEARTBEAT_FILE`, `STUDIO_USER_DATA_DIR` and `STUDIO_CDP_PORT`.
 */
import * as vscode from "vscode";

import { writeHangDump } from "../shared/hangDump";
import {
  currentProgress,
  heartbeatFileFor,
  runStep,
  setHangHandler,
  startHeartbeat,
  stepBudgetMs,
  VSCODE_CALL_TIMEOUT_MS,
  WHOLE_SUITE_STEPS,
  withTimeout,
} from "../shared/hangWatchdog";

function tabLabel(tab: vscode.Tab): string {
  return `${tab.label}${tab.isActive ? " (active)" : ""}${tab.isDirty ? " (dirty)" : ""}`;
}

/** What the window held: focus, tab groups and their tabs, editors. */
export function hostState(): unknown {
  const groups = vscode.window.tabGroups;
  return {
    progress: currentProgress(),
    windowState: { focused: vscode.window.state.focused, active: vscode.window.state.active },
    activeTab: groups.activeTabGroup.activeTab ? tabLabel(groups.activeTabGroup.activeTab) : null,
    tabGroups: groups.all.map((group) => ({
      viewColumn: group.viewColumn,
      isActive: group.isActive,
      activeTab: group.activeTab?.label ?? null,
      tabs: group.tabs.map(tabLabel),
    })),
    activeTextEditor: vscode.window.activeTextEditor?.document.uri.toString() ?? null,
    visibleTextEditors: vscode.window.visibleTextEditors.map((editor) => editor.document.uri.toString()),
  };
}

/**
 * Runs a suite with its heartbeat and the dump handler of its timeouts. Every suite entry goes
 * through it, so the launcher sees a frozen host whatever suite runs.
 */
export async function withSuiteWatchdog<T>(suite: string, run: () => Promise<T>): Promise<T> {
  const userDataDirectory = process.env.STUDIO_USER_DATA_DIR || undefined;
  const heartbeatFile = process.env.STUDIO_HEARTBEAT_FILE
    || (process.env.STUDIO_E2E_INSTANCE ? heartbeatFileFor(process.env.STUDIO_E2E_INSTANCE, suite) : undefined);
  setHangHandler((report) => writeHangDump({
    step: report.kind === "call" ? `${report.step}-${report.label}` : report.step,
    reason: `${report.kind === "step" ? "step" : "call"} timeout after ${report.timeoutMs} ms: ${report.label}; `
      + `last progress marker: ${report.marker}`,
    userDataDirectory,
    heartbeatFile,
    cdpPort: process.env.STUDIO_CDP_PORT,
    hostState,
    processMatchers: userDataDirectory ? [userDataDirectory] : [],
  }));
  const heartbeat = startHeartbeat(suite, heartbeatFile);
  try {
    // A suite without inner steps is one step: a hang that keeps the heartbeat alive still fails
    // within its budget, before the CI step timeout.
    return WHOLE_SUITE_STEPS.includes(suite) ? await step(suite, run) : await run();
  } finally {
    heartbeat.stop();
    setHangHandler(undefined);
  }
}

/** One suite step, bounded by its budget (stepBudgetMs), with `STEP start/done` log lines. */
export function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  return runStep(name, stepBudgetMs(name), run);
}

/** One VS Code (or CDP) call that must return: a hang names the call instead of the whole job. */
export function bounded<T>(label: string, call: PromiseLike<T>): Promise<T> {
  return withTimeout(label, VSCODE_CALL_TIMEOUT_MS, call);
}
