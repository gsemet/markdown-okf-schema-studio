/**
 * The history controller: Back and Next of a preview panel. Each followed link records the place
 * being left and its target; the history belongs to the panel, so it outlives the session a
 * document switch to another root recreates.
 */

import type { HostDocument, TextRange } from "../../host-api/documentStore";
import type { PreviewPanel } from "../../host-api/previewPanel";
import type { ShowDocumentOutcome } from "../../host-api/navigation";
import { NavigationHistory, type NavigationEntry } from "../../core/state/navigationHistory";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { revisionOfStage } from "../sessionDocuments";
import { fireAndForget } from "../../host-api/logger";

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
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
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
    const history = this.historyOf(preview);
    this.postStateOf(preview, history);
    // The Studio tabs that share this history show the same position: tell each of them too.
    for (const other of this.manager.sessions()) {
      if (other !== preview && this.histories.get(other.panel) === history) this.postStateOf(other, history);
    }
  }

  private postStateOf(preview: PreviewSession, history: NavigationHistory): void {
    const stage = preview.stage;
    if (preview.disposed || !stage) return;
    const state = { canBack: history.canBack(), canForward: history.canForward() };
    preview.probe.lastHistoryState = state;
    fireAndForget(this.manager.host.logger, preview.postToPage({
      type: "previewHistoryState",
      ...state,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    }), "postToPage");
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-059
  /** Records the place being left and the target of a followed link. */
  public recordNavigation(preview: PreviewSession, target: NavigationEntry): void {
    const history = this.historyOf(preview);
    history.depart(this.currentPlace(preview));
    history.push(target);
    this.postHistoryState(preview);
  }

  /** The Studio tab of `uri` other than `source` that a link or a history move just opened or revealed. */
  private studioTabOf(source: PreviewSession, uri: string): PreviewSession | undefined {
    return this.manager.latest((candidate) => candidate !== source && candidate.inStudioTab && candidate.documentUri === uri);
  }

  /** Makes the panel of `created` follow the history of `source`'s panel, as a Studio tab a link created does. */
  public shareHistory(source: PreviewSession, created: PreviewSession): void {
    this.histories.set(created.panel, this.historyOf(source));
    this.postHistoryState(created);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-197
  /**
   * Records a link followed from the Studio tab `source` to the Markdown file of `target`, by what
   * opened: a new Studio tab shares the source's history; a Studio tab already open keeps its own,
   * departs from its place and gains the place left in the source and the target; a text editor
   * (or anything else) records nothing.
   */
  public recordStudioLink(source: PreviewSession, outcome: ShowDocumentOutcome, target: NavigationEntry): void {
    if (outcome === "other") return;
    const left = this.currentPlace(source);
    this.recordNavigation(source, target);
    const opened = this.studioTabOf(source, target.uri);
    if (!opened) return;
    if (outcome === "studio-created") {
      this.shareHistory(source, opened);
      return;
    }
    const own = this.historyOf(opened);
    if (own === this.historyOf(source)) return;
    own.depart(this.currentPlace(opened));
    own.push({ uri: left.uri, line: left.line ?? 1 });
    own.push(target);
    this.postHistoryState(opened);
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
    const before = history.snapshot();
    history.depart(this.currentPlace(preview));
    const target = direction === "back" ? history.back() : history.forward();
    if (!target) {
      this.postHistoryState(preview);
      return;
    }
    if (target.uri === preview.documentUri) {
      this.postHistoryState(preview);
      preview.scroll.lastSourceScrollLine = target.line;
      // The stored line is now the reader's place: a stale anchor must not overwrite it on the next jump.
      preview.scroll.anchor = { line: target.line, owner: "editor", documentId: preview.documentUri };
      fireAndForget(this.manager.host.logger, preview.postToPage({
        type: "sourceScroll",
        documentId: stage.activeDocumentIdentity,
        revision: revisionOfStage(stage),
        requestId: stage.requestId,
        line: target.line,
        // A history move scrolls even when the preview does not follow the editor.
        reveal: true,
      }), "postToPage");
      return;
    }
    try {
      const document = await host.documents.open(target.uri);
      this.postHistoryState(preview);
      const lineIndex = Math.min(Math.max(0, target.line - 1), Math.max(0, document.lineCount - 1));
      // @implements_req SwRS-MDOKFSTUDIO-LIFE-191
      // The side preview that follows the editor marks the target line itself (see links.ts).
      if (preview.followsActiveEditor) this.manager.scroll.requestJumpMarker(preview, target.uri, lineIndex + 1);
      const selection = lineSelection(document, lineIndex, lineIndex);
      if (preview.inStudioTab && !preview.followsActiveEditor && document.path?.toLowerCase().endsWith(".md")) {
        // @implements_req SwRS-MDOKFSTUDIO-LIFE-196
        // A Studio tab hands the stored line, and a Studio tab the move created follows this history.
        const outcome = await host.navigation.showDocument(target.uri, selection, { fromStudioTab: true, line: lineIndex + 1 });
        // Intent: a Studio tab that Back or Next created shares this history, as a followed link's does
        // (SwRS-MDOKFSTUDIO-LIFE-197), so Back in the new tab walks the same places. An existing tab
        // keeps its own history, and a text editor has none.
        const opened = outcome === "studio-created" ? this.studioTabOf(preview, target.uri) : undefined;
        if (opened) this.shareHistory(preview, opened);
        return;
      }
      await host.navigation.showDocument(target.uri, selection);
    } catch (error) {
      // The document did not change, so the position does not move either.
      history.restore(before);
      this.postHistoryState(preview);
      fireAndForget(host.logger, host.ui.showWarning(
        `Markdown OKF-Schema Studio could not go ${direction}: ${error instanceof Error ? error.message : String(error)}`,
      ), "showWarning");
    }
  }
}
