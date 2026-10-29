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
import { setWorkbenchPage } from "./common";
import { scenarioAlertTypePickProbe } from "./alertPickProbe";
import { installWorkbenchFocusTrace, workbenchFocusDump } from "../../shared/workbenchFocusDump";
import { scenarioArrowNavigation, scenarioBlockMoveKeys, scenarioBlockMoveSelection, scenarioBlockSelection, scenarioCtrlEnterCommit, scenarioOpenWithEditor, scenarioParagraphBlurCommit, scenarioReviewComments, scenarioTableCellBold, scenarioTableCellEnter, scenarioTableMinimalDiff } from "./blockKeys";
import { scenarioEnterCommitsTextField, scenarioEscapeCancels, scenarioFrontmatterStructuralMinimalPatch, scenarioFrontmatterValueMinimalPatch, scenarioLinkPanel, scenarioLinkPanelPrefill, scenarioPalette, scenarioShortcuts, scenarioSlashMenu, scenarioTypingUndoGrouping, scenarioUndoStaysInEditor } from "./textEditing";
import { scenarioAlertDropdown, scenarioCaretAtClick, scenarioEditAffordances, scenarioEditModeNoReflow, scenarioEnterContinuesList, scenarioFigureEditor, scenarioPreviewKeepsMarkdown, scenarioSaveKeepsBlockInPlace, scenarioTabIndents, scenarioTableTab, scenarioTableToolbar } from "./editorWidgets";
import { scenarioAddFieldPositionAndEscape, scenarioBooleanOneClick, scenarioCommentBlockEdit, scenarioCustomKeyAndOpenNewField, scenarioFrontmatterActionsLayout, scenarioListEditorClickAndKeys, scenarioListLinkCompletion, scenarioReadableLinkDiagnostics, scenarioRequiredAndPositionedAdd } from "./frontmatterFields";
import { scenarioContentPatchedInPlace, scenarioImageEditing, scenarioInsertAfterFinalFigure, scenarioInsertBlocksFromPreview, scenarioLargeDocumentPatched, scenarioPendingOverlayWithoutReload, scenarioPropertiesTableWithoutReload, scenarioStatusPageTwoLines, withIncrementalUpdates } from "./renderPatching";
import { scenarioFocusChangeKeepsPreviewStill, scenarioHiddenPreviewCatchesUp, scenarioPreviewGroupLock, scenarioTitleBarButton, scenarioToolbarState } from "./previewWindow";
import { scenarioFindRightAfterClick } from "./findAfterClick";
import { scenarioFlushBeforeBack, scenarioFlushBeforeLink, scenarioFlushBeforeTabSwitch, scenarioFlushCellAndFrontmatter, scenarioFlushFrontmatterKeptAsTyped } from "./flushBeforeNavigate";

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
  // Does a user's alert type pick (keyboard, real mouse press) reach the file? Logs
  // ALERT-PICK-PROBE lines; stress only, never in the integration list.
  "alert-type-pick-probe": (page) => scenarioAlertTypePickProbe(page),
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
      probe: () => scenarioPerformanceProbe(page),
      "link-prefill": () => scenarioLinkPanelPrefill(page, evidence),
      "table-moves": () => scenarioTableMoves(page),
      "find-after-click": () => scenarioFindRightAfterClick(page),
      "alert-type-pick-probe": () => scenarioAlertTypePickProbe(page),
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
    await scenarioFigureEditor(page, evidence);
    await scenarioPreviewKeepsMarkdown(page, evidence);
    await scenarioCaretAtClick(page, evidence);
    await scenarioEditAffordances(page, evidence);
    await scenarioEditModeNoReflow(page, evidence);
    await scenarioTableTab(page, evidence);
    await scenarioTableToolbar(page, evidence);
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
    await scenarioInsertBlocksFromPreview(page, evidence);
    await scenarioInsertAfterFinalFigure(page, evidence);
    await scenarioBlockMoveKeys(page, evidence);
    await scenarioBlockSelection(page, evidence);
    await scenarioBlockMoveSelection(page, evidence);
    await scenarioImageEditing(page, evidence);
    await scenarioFocusChangeKeepsPreviewStill(page, evidence);
    await scenarioHiddenPreviewCatchesUp(page, evidence);
    await scenarioFlushBeforeLink(page, evidence);
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
    // Before the editors close and the browser detaches: where the workbench focus is now.
    console.error(`Real-input failure: ${await workbenchFocusDump(page)}`);
    throw error;
  } finally {
    evidence.finish(passed, complete);
    await browser.close();
  }
}
