/**
 * The history controller: Back and Next of a preview panel. Each followed link records the place
 * being left and its target; the history belongs to the panel, so it outlives the session a
 * document switch to another root recreates.
 */

import type { HostDocument, TextRange } from "../../host-api/documentStore";
import type { PreviewPanel } from "../../host-api/previewPanel";
import { NavigationHistory, type NavigationEntry } from "../../core/state/navigationHistory";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { revisionOfStage } from "../sessionDocuments";

/** The whole lines `first` to `last` (zero-based) of a document, as an editor selection. */
export function lineSelection(document: HostDocument, first: number, last: number): TextRange {
  return { start: { line: first, character: 0 }, end: { line: last, character: document.lineText(last).length } };
}

/** The navigation history of the preview panels. */
export class HistoryController {
  /** One navigation history per preview panel. */
  private readonly histories = new WeakMap<PreviewPanel, NavigationHistory>();

  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handler of Back / Next. */
  public register(router: PageMessageRouter): void {
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-006
    // Back / Next walk the navigation history of the panel. Only navigation, no document edit.
    router.on("previewHistoryGo", (message, preview) => this.go(preview, message.direction));
  }

  /** The history of the preview's panel. */
  public historyOf(preview: PreviewSession): NavigationHistory {
    let history = this.histories.get(preview.panel);
    if (!history) {
      history = new NavigationHistory();
      this.histories.set(preview.panel, history);
    }
    return history;
  }

  /** Where the reader is in the shown document; the line is undefined until the page reported one. */
  private currentPlace(preview: PreviewSession): { uri: string; line?: number } {
    const anchor = preview.scroll.anchor;
    const line = anchor && anchor.documentId === preview.documentUri
      ? anchor.line
      : preview.scroll.lastSourceScrollLine ?? preview.state?.sourceLine;
    return { uri: preview.documentUri, ...(line === undefined ? {} : { line: Math.max(1, Math.floor(line)) }) };
  }

  /** Tells the page which of Back and Next can go anywhere. Stale ids are dropped by the page. */
  public postHistoryState(preview: PreviewSession): void {
    const stage = preview.stage;
    if (preview.disposed || !stage) return;
    const history = this.historyOf(preview);
    const state = { canBack: history.canBack(), canForward: history.canForward() };
    preview.probe.lastHistoryState = state;
    void preview.postToPage({
      type: "previewHistoryState",
      ...state,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-059
  /** Records the place being left and the target of a followed link. */
  public recordNavigation(preview: PreviewSession, target: NavigationEntry): void {
    const history = this.historyOf(preview);
    history.depart(this.currentPlace(preview));
    history.push(target);
    this.postHistoryState(preview);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-205
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-054
  private async go(preview: PreviewSession, direction: "back" | "forward"): Promise<void> {
    const { host } = this.manager;
    if (!preview.stage) return;
    // The page posted the save of its open editor before this message: apply it before the switch.
    await this.manager.edits.settleHostEdits(preview);
    const stage = preview.stage;
    if (!stage || preview.disposed) return;
    const history = this.historyOf(preview);
    const available = direction === "back" ? history.canBack() : history.canForward();
    if (!available) {
      this.postHistoryState(preview);
      return;
    }
    history.depart(this.currentPlace(preview));
    const target = direction === "back" ? history.back() : history.forward();
    if (!target) {
      this.postHistoryState(preview);
      return;
    }
    this.postHistoryState(preview);
    if (target.uri === preview.documentUri) {
      preview.scroll.lastSourceScrollLine = target.line;
      // The stored line is now the reader's place: a stale anchor must not overwrite it on the next jump.
      preview.scroll.anchor = { line: target.line, owner: "editor", documentId: preview.documentUri };
      void preview.postToPage({
        type: "sourceScroll",
        documentId: stage.activeDocumentIdentity,
        revision: revisionOfStage(stage),
        requestId: stage.requestId,
        line: target.line,
      });
      return;
    }
    try {
      const document = await host.documents.open(target.uri);
      const lineIndex = Math.min(Math.max(0, target.line - 1), Math.max(0, document.lineCount - 1));
      await host.navigation.showDocument(target.uri, lineSelection(document, lineIndex, lineIndex));
    } catch (error) {
      void host.ui.showWarning(
        `Markdown OKF-Schema Studio could not go ${direction}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
