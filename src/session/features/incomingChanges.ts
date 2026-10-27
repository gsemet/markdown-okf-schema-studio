/**
 * The incoming changes controller (T16): marks the source lines that differ from the HEAD commit,
 * read through the `VcsInfo` port, and posts them again when HEAD moves.
 */

import { changedLineRanges } from "../../core/mapping/lineDiff";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { revisionOfStage } from "../sessionDocuments";
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
}

/** A fresh {@link IncomingState}. */
export function createIncomingState(): IncomingState {
  return { marksShown: false, enabledPosted: true };
}

const INCOMING_CHANGES_DEBOUNCE_MS = 300;

/** Marks of the lines that differ from HEAD. */
export class IncomingChangesController {
  public constructor(private readonly manager: PreviewManager) {}

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-195
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
    let ranges: { start: number; end: number }[] = [];
    if (enabled && choices.viewPreferences.incomingChanges && host.workspace.trusted
      && preview.documentUri.startsWith("file:")) {
      const documentId = host.documents.idOf(stage.activeDocumentPath);
      const base = await host.vcs.headText(documentId, stage.sourceText.length);
      if (preview.disposed || preview.stage !== stage) return;
      if (base) {
        ranges = changedLineRanges(base.text, stage.sourceText);
        this.watchBaseline(preview, documentId, stage.activeDocumentPath);
      }
    }
    const state = preview.incoming;
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
