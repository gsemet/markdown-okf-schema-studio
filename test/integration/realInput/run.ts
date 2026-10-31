import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import {
  hostStressPlan,
  STRESS_SCENARIOS_BY_HOST,
} from "../../shared/stressPlan";
import { scenarioFindInPreview } from "../findInPreview.test";
import { scenarioLinkedTargetSave } from "../linkedTargetSave";
import { scenarioTableMoves } from "../tableMoves";
import {
  connectWorkbench,
  createEvidence,
  type Evidence,
} from "./harness";
import {
  scenarioFigureInsert,
  scenarioImagePaste,
  scenarioIncomingChanges,
  scenarioReviewThreads,
} from "../realWindowGaps";
import { scenarioTableStructure } from "../tableStructureReal";
import { scenarioToc } from "../tocWindow";
import { scenarioPerformanceProbe } from "../performanceProbe";
import * as fs from "node:fs";
import { E2E_REPORT_ROOT } from "../../reportPaths";
import { tocLoopRounds, tocLoopSummary, toggleDelayMaxMs, type TocLoopTally } from "../../shared/tocLoop";
import { setWorkbenchPage, takeFailureFocusDump } from "./common";
import { scenarioAlertTypePickProbe } from "./alertPickProbe";
import { installWorkbenchFocusTrace, withFocusDumpOnFailure, workbenchFocusDump } from "../../shared/workbenchFocusDump";
import { scenarioArrowNavigation, scenarioBlockMoveKeys, scenarioBlockMoveSelection, scenarioBlockSelection, scenarioCtrlEnterCommit, scenarioHiddenReviewMarks, scenarioOpenWithEditor, scenarioParagraphBlurCommit, scenarioReviewComments, scenarioTableCellBold, scenarioTableCellEnter, scenarioTableMinimalDiff } from "./blockKeys";
import { scenarioEnterCommitsTextField, scenarioEscapeCancels, scenarioFrontmatterStructuralMinimalPatch, scenarioFrontmatterValueMinimalPatch, scenarioLinkPanel, scenarioLinkPanelPrefill, scenarioPalette, scenarioShortcuts, scenarioSlashMenu, scenarioTypingUndoGrouping, scenarioUndoStaysInEditor } from "./textEditing";
import { scenarioAlertDropdown, scenarioCaretAtClick, scenarioEditAffordances, scenarioEditModeNoReflow, scenarioEnterContinuesList, scenarioFigureEditor, scenarioPreviewKeepsMarkdown, scenarioSaveKeepsBlockInPlace, scenarioTabIndents, scenarioTableTab, scenarioTableToolbar } from "./editorWidgets";
import { scenarioAddFieldPositionAndEscape, scenarioBooleanOneClick, scenarioCommentBlockEdit, scenarioCustomKeyAndOpenNewField, scenarioFrontmatterActionsLayout, scenarioListEditorClickAndKeys, scenarioListLinkCompletion, scenarioReadableLinkDiagnostics, scenarioRefusedValueKeepsEditorUsable, scenarioRequiredAndPositionedAdd } from "./frontmatterFields";
import { scenarioContentPatchedInPlace, scenarioImageEditing, scenarioInsertAfterFinalFigure, scenarioInsertBlocksFromPreview, scenarioLargeDocumentPatched, scenarioPendingOverlayWithoutReload, scenarioPropertiesTableWithoutReload, scenarioStatusPageTwoLines, withIncrementalUpdates } from "./renderPatching";
import { scenarioFocusChangeKeepsPreviewStill, scenarioHiddenPreviewCatchesUp, scenarioPreviewGroupLock, scenarioTitleBarButton, scenarioToolbarState } from "./previewWindow";
import { scenarioFindRightAfterClick } from "./findAfterClick";
import { scenarioWideTableTab } from "./wideTableTab";
import { scenarioFlushBeforeBack, scenarioFlushBeforeLink, scenarioFlushBeforeTabSwitch, scenarioFlushCellAndFrontmatter, scenarioFlushFrontmatterKeptAsTyped } from "./flushBeforeNavigate";
import { scenarioLinkClickEditsInEditMode } from "./linkEditMode";
import { QA210_REPLAYS } from "./qa210Replays";

/**
 * The scenarios `just ci-stress` repeats in this window (see stressPlan.ts): the CR 041 ones failed
 * on CI as a race at least once; the CR 043 ones are the new real-window captures, proved here
 * before they stay in the required integration job. A new flake fix adds its scenario here.
 */
const STRESS_SCENARIOS: Record<string, (page: Page, evidence: Evidence) => Promise<void>> = {
  "frontmatter-rename": scenarioFrontmatterStructuralMinimalPatch,
  "frontmatter-title": scenarioEnterCommitsTextField,
  "table-tab": scenarioTableTab,
  "list-editor": scenarioListEditorClickAndKeys,
  "flush-cell-frontmatter": scenarioFlushCellAndFrontmatter,
  "flush-frontmatter-typed": scenarioFlushFrontmatterKeptAsTyped,
  "incoming-changes": scenarioIncomingChanges,
  "review-threads": scenarioReviewThreads,
  "image-paste": scenarioImagePaste,
  "linked-target-save": scenarioLinkedTargetSave,
  "slash-menu": scenarioSlashMenu,
  "save-position": scenarioSaveKeepsBlockInPlace,
  "alert-dropdown": scenarioAlertDropdown,
  // The scenario reopens the sidebar it closed; the other stress scenarios run without it.
  toc: async (page) => {
    await scenarioToc(page);
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
  },
  "find-in-preview": (page) => scenarioFindInPreview(page),
  // CR 227: real Tab presses through a wide table; new, proved here before it stays required.
  "wide-table-tab": scenarioWideTableTab,
};

/** Runs the stress plan: every round gets its own evidence folder, so captures never repeat. */
async function runStress(page: Page): Promise<void> {
  assert.deepEqual(Object.keys(STRESS_SCENARIOS), STRESS_SCENARIOS_BY_HOST.trusted,
    "the stress table of the trusted window is the list in test/shared/stressPlan.ts");
  const plan = hostStressPlan(process.env, "trusted", 10);
  if (plan === undefined) {
    console.log("stress: no scenario of the trusted window was asked for");
    return;
  }
  console.log(`stress: ${plan.repeat} round(s) of ${plan.scenarios.join(", ")}`);
  for (let round = 1; round <= plan.repeat; round += 1) {
    const evidence = createEvidence("real-input");
    let passed = false;
    try {
      for (const name of plan.scenarios) {
        const started = Date.now();
        try {
          await STRESS_SCENARIOS[name]!(page, evidence);
        } catch (error) {
          throw new Error(`stress round ${round}/${plan.repeat}, scenario ${name}: `
            + `${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
        console.log(`PASS stress ${round}/${plan.repeat} ${name} (${Date.now() - started} ms)`);
      }
      passed = true;
    } finally {
      evidence.finish(passed, false);
    }
  }
  console.log(`stress: ${plan.repeat} round(s) passed`);
}

/**
 * `STUDIO_REAL_INPUT_SCENARIO=toc-loop`: the `toc` scenario `STUDIO_TOC_LOOP` times (default 1),
 * optionally with `STUDIO_TOGGLE_DELAY_MS` delays around the edit toggle. A failed round is
 * logged with its message (it carries the toggle state #205 records) and the loop goes on, so one
 * dispatch counts the clean and the failed rounds; the step fails at the end if any round failed.
 */
async function runTocLoop(page: Page): Promise<void> {
  // Validate both knobs before round 1: a bad value is a configuration error, not N failed rounds.
  const rounds = tocLoopRounds(process.env);
  const delayMax = toggleDelayMaxMs(process.env);
  const tally: TocLoopTally = { rounds, passed: 0, failed: 0, failures: [] };
  const summaryFile = path.join(E2E_REPORT_ROOT, "toc-loop-summary.json");
  const writeSummary = (): void => {
    fs.mkdirSync(E2E_REPORT_ROOT, { recursive: true });
    fs.writeFileSync(summaryFile, `${JSON.stringify(tally, null, 2)}\n`);
  };
  console.log(`toc-loop: ${rounds} round(s), toggle delay up to ${delayMax} ms`);
  for (let round = 1; round <= rounds; round += 1) {
    const started = Date.now();
    let atFailure: string | undefined;
    try {
      // The dump is read where the scenario failed, before its cleanup closes the editors.
      await withFocusDumpOnFailure(page, () => scenarioToc(page), (dump) => { atFailure = dump; });
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      tally.passed += 1;
      console.log(`PASS toc-loop ${round}/${rounds} (${Date.now() - started} ms)`);
    } catch (error) {
      tally.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      tally.failures.push(`round ${round}: ${message}`);
      console.error(`FAIL toc-loop ${round}/${rounds} (${Date.now() - started} ms): ${message}`);
      if (atFailure !== undefined) console.error(`toc-loop round ${round}, workbench focus at the failing step: ${atFailure}`);
      console.error(`toc-loop round ${round}, workbench focus after the scenario's cleanup: ${await workbenchFocusDump(page)}`);
    }
    // After every round, so a deadline kill keeps the tally so far.
    writeSummary();
  }
  console.log(tocLoopSummary(tally));
  if (tally.failed > 0) throw new Error(`${tocLoopSummary(tally)}. ${tally.failures.join(" || ")}`);
}

export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  const evidence = createEvidence("real-input");
  let passed = false;
  let complete = false;
  setWorkbenchPage(page);
  // Records the focus moves of the workbench, so a failure dump can name what took the focus.
  await installWorkbenchFocusTrace(page);
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    // A single scenario: the registry completeness check is skipped. The stress rounds keep their own
    // evidence, and the performance probe measures and reports (it is not part of the integration job).
    const single: Record<string, () => Promise<void>> = {
      toolbar: () => scenarioToolbarState(page, evidence),
      stress: () => runStress(page),
      "toc-loop": () => runTocLoop(page),
      probe: () => scenarioPerformanceProbe(page),
      "link-prefill": () => scenarioLinkPanelPrefill(page, evidence),
      "table-moves": () => scenarioTableMoves(page),
      "find-after-click": () => scenarioFindRightAfterClick(page),
      "alert-type-pick-probe": () => scenarioAlertTypePickProbe(page),
      "link-edit-mode": () => scenarioLinkClickEditsInEditMode(page, evidence),
      "qa210-replays": async () => {
        for (const replay of QA210_REPLAYS) await replay(page);
      },
    };
    const only = single[process.env.STUDIO_REAL_INPUT_SCENARIO ?? ""];
    if (only) {
      await only();
      passed = true;
      return;
    }
    await scenarioParagraphBlurCommit(page, evidence);
    await scenarioCommentBlockEdit(page, evidence);
    await scenarioCtrlEnterCommit(page, evidence);
    await scenarioReviewComments(page, evidence);
    await scenarioHiddenReviewMarks(page);
    await scenarioArrowNavigation(page, evidence);
    await scenarioTableCellEnter(page, evidence);
    await scenarioTableCellBold(page, evidence);
    await scenarioTableMinimalDiff(page, evidence);
    await scenarioOpenWithEditor(page, evidence);
    await scenarioFrontmatterValueMinimalPatch(page, evidence);
    await scenarioFrontmatterStructuralMinimalPatch(page, evidence);
    await scenarioEnterCommitsTextField(page, evidence);
    await scenarioEscapeCancels(page, evidence);
    await scenarioTypingUndoGrouping(page, evidence);
    await scenarioUndoStaysInEditor(page, evidence, "side");
    await scenarioUndoStaysInEditor(page, evidence, "open-with");
    await scenarioEnterContinuesList(page, evidence);
    await scenarioTabIndents(page, evidence);
    await scenarioShortcuts(page, evidence);
    await scenarioPalette(page, evidence);
    await scenarioSlashMenu(page, evidence);
    await scenarioLinkPanel(page, evidence);
    await scenarioLinkPanelPrefill(page, evidence);
    await scenarioAlertDropdown(page, evidence);
    // Does a user's alert type pick (keyboard, real mouse press) reach the file? Logs
    // ALERT-PICK-PROBE lines; runs once here, not in the stress rounds.
    await scenarioAlertTypePickProbe(page);
    await scenarioFigureEditor(page, evidence);
    await scenarioPreviewKeepsMarkdown(page, evidence);
    await scenarioCaretAtClick(page, evidence);
    await scenarioEditAffordances(page, evidence);
    await scenarioEditModeNoReflow(page, evidence);
    await scenarioTableTab(page, evidence);
    await scenarioTableToolbar(page, evidence);
    // QA replay c5-1: Tab through a table wider than the preview keeps the cell editor in view.
    await scenarioWideTableTab(page, evidence);
    await scenarioTableStructure(page);
    await scenarioTableMoves(page);
    await scenarioBooleanOneClick(page, evidence);
    await scenarioListEditorClickAndKeys(page, evidence);
    await scenarioListLinkCompletion(page, evidence);
    await scenarioFrontmatterActionsLayout(page, evidence);
    await scenarioRequiredAndPositionedAdd(page, evidence);
    await scenarioCustomKeyAndOpenNewField(page, evidence);
    await scenarioAddFieldPositionAndEscape(page, evidence);
    await scenarioReadableLinkDiagnostics(page, evidence);
    await scenarioRefusedValueKeepsEditorUsable(page);
    // QA 210 replays (CR 228): one fixture each, real mouse and keys.
    for (const replay of QA210_REPLAYS) await replay(page);
    await scenarioInsertBlocksFromPreview(page, evidence);
    await scenarioInsertAfterFinalFigure(page, evidence);
    await scenarioBlockMoveKeys(page, evidence);
    await scenarioBlockSelection(page, evidence);
    await scenarioBlockMoveSelection(page, evidence);
    await scenarioImageEditing(page, evidence);
    await scenarioFocusChangeKeepsPreviewStill(page, evidence);
    await scenarioHiddenPreviewCatchesUp(page, evidence);
    await scenarioFlushBeforeLink(page, evidence);
    await scenarioLinkClickEditsInEditMode(page, evidence);
    await scenarioFlushBeforeBack(page, evidence);
    await scenarioFlushBeforeTabSwitch(page, evidence);
    await scenarioFlushCellAndFrontmatter(page, evidence);
    await scenarioFlushFrontmatterKeptAsTyped(page, evidence);
    await scenarioFindRightAfterClick(page);
    await scenarioSaveKeepsBlockInPlace(page, evidence);
    await scenarioStatusPageTwoLines(page, evidence);
    await scenarioTitleBarButton(page, evidence);
    await scenarioToolbarState(page, evidence);
    await scenarioPreviewGroupLock(page, evidence);
    // RI-T43 describes the document-assignment path, which the setting keeps available.
    await withIncrementalUpdates(false, () => scenarioPendingOverlayWithoutReload(page, evidence));
    await scenarioPropertiesTableWithoutReload(page, evidence);
    await scenarioContentPatchedInPlace(page, evidence);
    await scenarioLargeDocumentPatched(page, evidence);
    // CR 043 (P9 T2): real-window gap fill, also in the stress plan.
    await scenarioIncomingChanges(page, evidence);
    await scenarioReviewThreads(page, evidence);
    for (const gap of [scenarioImagePaste, scenarioFigureInsert]) await gap(page, evidence);
    passed = true;
    complete = true;
  } catch (error) {
    // Where the workbench focus was when the step failed (read before the scenario closed its
    // editors), then where it is now, after that cleanup and before the browser detaches.
    const atFailure = takeFailureFocusDump();
    if (atFailure !== undefined) console.error(`Real-input failure, at the failing step: ${atFailure}`);
    console.error(`Real-input failure, after the scenario's cleanup: ${await workbenchFocusDump(page)}`);
    throw error;
  } finally {
    evidence.finish(passed, complete);
    await browser.close();
  }
}
