/**
 * The incoming changes controller (T16): marks the source lines that differ from the HEAD commit,
 * read through the `VcsInfo` port, and posts them again when HEAD moves.
 */

import { incomingChangeRanges } from "../../core/frontmatter/frontmatterChanges";
import { lineHunks } from "../../core/mapping/lineDiff";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { revisionOfStage } from "../sessionDocuments";
import { renderBaselineContent } from "./baselineDiff";
import { fireAndForget } from "../../host-api/logger";

/** Incoming-change marks of one page (owned by the incoming changes controller). */
export interface IncomingState {
  /** Debounce timer of the marks. */
  timer?: NodeJS.Timeout;
  /** Watch on the HEAD commit of the repository of the shown file, and the file it was made for. */
  watch?: { path: string; subscription: { dispose(): void } };
  /** The page may show marks (ranges were posted and not cleared since the page loaded). */
  marksShown: boolean;
  /** The "enabled" value last posted to the page; the page starts with true. */
  enabledPosted: boolean;
  /** The side-by-side diff of changed blocks is on in the page (CR 147). */
  sideBySide: boolean;
  /** The HEAD text last rendered for the side-by-side diff and the page content made from it. */
  baseline?: { text: string; html: string | undefined };
}

/** A fresh {@link IncomingState}. */
export function createIncomingState(): IncomingState {
  return { marksShown: false, enabledPosted: true, sideBySide: false };
}

const INCOMING_CHANGES_DEBOUNCE_MS = 300;

/** Marks of the lines that differ from HEAD. */
export class IncomingChangesController {
  public constructor(
    private readonly manager: PreviewManager,
    /** Renders the text at HEAD for the side-by-side diff (replaced in tests). */
    private readonly renderBaseline: typeof renderBaselineContent = renderBaselineContent,
  ) {}

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-195
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-215
  /**
   * Tells the page which source lines differ from HEAD (T16). Nothing is posted for a file Git does
   * not know, unless marks or a different "enabled" value must be taken back. Stale ids are dropped by
   * the page; a result for a stage that is no longer current is dropped here.
   */
  private async post(preview: PreviewSession): Promise<void> {
    const { host, choices } = this.manager;
    const stage = preview.stage;
    if (preview.disposed || !stage) return;
    const enabled = preview.configuration.showIncomingChanges;
    const state = preview.incoming;
    let ranges: { start: number; end: number }[] = [];
    const tracked = enabled && host.workspace.trusted && preview.documentUri.startsWith("file:");
    const marksOn = tracked && choices.viewPreferences.incomingChanges;
    const sideBySide = tracked && state.sideBySide;
    let baseline: { html: string; hunks: ReturnType<typeof lineHunks> } | undefined;
    if (marksOn || sideBySide) {
      const documentId = host.documents.idOf(stage.activeDocumentPath);
      const base = await host.vcs.headText(documentId, stage.sourceText.length);
      if (preview.disposed || preview.stage !== stage) return;
      if (base) {
        if (marksOn) ranges = incomingChangeRanges(base.text, stage.sourceText);
        this.watchBaseline(preview, documentId, stage.activeDocumentPath);
        if (sideBySide) {
          const hunks = lineHunks(base.text, stage.sourceText);
          if (hunks.length === 0) {
            baseline = { html: "", hunks };
          } else {
            if (state.baseline?.text !== base.text) {
              state.baseline = { text: base.text, html: await this.renderBaseline(this.manager, preview, stage, base.text) };
              if (preview.disposed || preview.stage !== stage || !state.sideBySide) return;
            }
            // A baseline that cannot be rendered is posted empty: the page keeps the green bars.
            if (state.baseline.html !== undefined) baseline = { html: state.baseline.html, hunks };
          }
        }
      }
    }
    if (sideBySide) this.postBaseline(preview, stage, baseline ?? { html: "", hunks: [] });
    if (ranges.length === 0 && !state.marksShown && enabled === state.enabledPosted) {
      return;
    }
    state.marksShown = ranges.length > 0;
    state.enabledPosted = enabled;
    preview.probe.incomingPosts += 1;
    preview.probe.lastIncomingChanges = { enabled, ranges };
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewIncomingChanges",
      enabled,
      ranges,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    }), "postToPage");
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-006
  /** Tells the page the HEAD rendering and the hunks of the shown text (empty when nothing differs). */
  private postBaseline(
    preview: PreviewSession,
    stage: NonNullable<PreviewSession["stage"]>,
    baseline: { html: string; hunks: ReturnType<typeof lineHunks> },
  ): void {
    preview.probe.baselinePosts += 1;
    preview.probe.lastBaseline = { hunks: baseline.hunks.length, htmlLength: baseline.html.length };
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewBaselineDiff",
      html: baseline.html,
      hunks: baseline.hunks,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    }), "postToPage");
  }

  /** Switches the side-by-side diff on or off for a page and posts the baseline when it goes on. */
  public setSideBySide(preview: PreviewSession, on: boolean): void {
    const state = preview.incoming;
    state.sideBySide = on;
    if (!on) state.baseline = undefined;
    else this.schedule(preview, 0);
  }

  /** Posts again when the HEAD commit of the repository changes (commit, checkout, pull). */
  private watchBaseline(preview: PreviewSession, documentId: string, documentPath: string): void {
    const state = preview.incoming;
    if (state.watch?.path === documentPath) return;
    state.watch?.subscription.dispose();
    state.watch = undefined;
    const subscription = this.manager.host.vcs.watchHead(documentId, () => this.schedule(preview, 0));
    if (subscription) state.watch = { path: documentPath, subscription };
  }

  /** Posts the marks after `delay` (debounced). */
  public schedule(preview: PreviewSession, delay = INCOMING_CHANGES_DEBOUNCE_MS): void {
    if (preview.disposed) return;
    const state = preview.incoming;
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = undefined;
      fireAndForget(this.manager.host.logger, this.post(preview), "Marking the incoming changes");
    }, delay);
  }

  /** Stops the timer and the HEAD watch of a preview. */
  public clear(preview: PreviewSession): void {
    const state = preview.incoming;
    if (state.timer) clearTimeout(state.timer);
    state.timer = undefined;
    state.watch?.subscription.dispose();
    state.watch = undefined;
  }
}
