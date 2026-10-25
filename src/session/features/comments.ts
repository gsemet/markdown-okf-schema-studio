/**
 * The comments controller: the review comment threads stored in `<name>.comments.json` next to the
 * shown document (T42-T45). It posts them to the page, writes the threads the reader creates,
 * answers, resolves and deletes, keeps their anchors on the text while the document is edited
 * (saved with the document), and moves the sidecar with a renamed document.
 */

import * as path from "node:path";

import { createDocumentIndex, reanchorThreads, shiftThreadLines, toLineChanges } from "../../core/comments/anchoring";
import { resolveAuthor } from "../../core/comments/author";
import {
  addReply,
  addThread,
  deleteThread,
  isValidAnchor,
  MAX_SIDECAR_BYTES,
  normalizeBody,
  parseSidecar,
  setResolved,
  sidecarNameFor,
  type CommentThread,
} from "../../core/comments/commentModel";
import { createCommentStore, hashText, newId } from "../../core/comments/commentStore";
import { COMMENTS_CONFIGURATION_SECTION, readCommentsConfiguration } from "../../core/configuration/commentsConfiguration";
import type { DocumentChange, HostDocument } from "../../host-api/documentStore";
import { isFileNotFound } from "../../host-api/fileSystem";
import { osUserName } from "../../node-services/paths";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import type { PageMessageRouter } from "../pageMessages";
import type { RenamedFile } from "../hostEvents";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { previewReadOnlyReason, revisionOfStage } from "../sessionDocuments";

/** Comment threads of one page (owned by the comments controller). */
export interface CommentsState {
  /** Debounce timer of the threads (T42). */
  timer?: NodeJS.Timeout;
  /** Watch on the sidecar file `<name>.comments.json` of the shown document, and its path. */
  watch?: { path: string; watcher: { dispose(): void } };
  /** The page may show threads (some were posted and not cleared since the page loaded). */
  shown: boolean;
  /** JSON of the threads last posted to the loaded page; reset when the page reports ready. */
  posted?: string;
  /** Sidecar text already reported as invalid, so the warning appears once per content. */
  warned?: string;
  /** Hash of the sidecar text last handled: a watcher event for the same text (our own write) is skipped. */
  textHash?: string;
  /** Counts reads of the sidecar; a read overtaken by a newer one posts nothing. */
  seq: number;
  /**
   * T45: the threads as the page shows them. Built from the sidecar text with hash `diskHash`: the
   * anchors are checked against the document text (re-anchoring) and then follow the edits in memory
   * (`shiftThreadLines`). Never written per keystroke; saved with the document, see
   * `persistAnchors`. Dropped when the sidecar changes or the document reloads.
   */
  view?: { diskHash: string; threads: CommentThread[]; orphaned: Set<string> };
  /** Hash of the sidecar text our own last comment write produced: the view's lines are valid for it. */
  hintHash?: string;
}

/** A fresh {@link CommentsState}. */
export function createCommentsState(): CommentsState {
  return { shown: false, seq: 0 };
}

const COMMENTS_DEBOUNCE_MS = 150;
const ANCHORS_UNCHANGED = "no anchor moved";

type CommentKind = "create" | "reply" | "resolve" | "delete";

type CommentOutcome = { ok: true } | { ok: false; reason: string };

function sidecarOf(documentPath: string): string {
  return path.join(path.dirname(documentPath), sidecarNameFor(path.basename(documentPath)));
}

/** Review comment threads of the previews. */
export class CommentsController {
  private lastAnchorWarning: string | undefined;
  /** The per-file queue of every comment write (read latest, apply, serialize, write). */
  private readonly store = createCommentStore({
    read: (file) => this.readSidecarText(file),
    write: async (file, text) => {
      await this.manager.host.files.writeFile(file, new TextEncoder().encode(text));
    },
  });

  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of the page's comment messages. */
  public register(router: PageMessageRouter): void {
    router.on("previewCommentCreate", (message, preview) => this.handleCreate(preview, message));
    router.on("previewCommentReply", (message, preview) => this.handleReply(preview, message));
    router.on("previewCommentResolve", (message, preview) => this.handleResolve(preview, message));
    router.on("previewCommentDelete", (message, preview) => this.handleDelete(preview, message));
  }

  /** True when an editor holds the file `filePath` with unsaved changes. */
  private dirtyInEditor(filePath: string): boolean {
    const { documents } = this.manager.host;
    const open = documents.get(documents.idOf(filePath));
    return open?.path !== undefined && open.isDirty;
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-004
  /** Reads the sidecar of a document; undefined when there is none. */
  private async readSidecar(sidecar: string): Promise<string | undefined> {
    const { files } = this.manager.host;
    try {
      const stat = await files.stat(sidecar);
      if (stat.size > MAX_SIDECAR_BYTES) {
        // Not read: the parser reports the size problem from a stub of the right length.
        return " ".repeat(MAX_SIDECAR_BYTES + 1);
      }
      return new TextDecoder().decode(await files.readFile(sidecar));
    } catch {
      return undefined;
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-012
  /**
   * Tells the page the review comment threads stored in `<name>.comments.json` next to the shown
   * document (T42). Without a sidecar nothing is posted, unless threads shown earlier must go. An
   * invalid file shows one warning and no threads. Stale ids are dropped by the page.
   */
  private async post(preview: PreviewSession): Promise<void> {
    const stage = preview.stage;
    if (preview.disposed || !stage || !preview.documentUri.startsWith("file:")) return;
    const state = preview.comments;
    const documentPath = stage.activeDocumentPath;
    const sidecar = sidecarOf(documentPath);
    this.watchSidecar(preview, sidecar);
    const sequence = ++state.seq;
    const text = await this.readSidecar(sidecar);
    if (preview.disposed || preview.stage !== stage || sequence !== state.seq) return;
    // The same text again (the echo of our own write, a touch): nothing changed for the page.
    const hash = text === undefined ? undefined : hashText(text);
    if (hash !== undefined && hash === state.textHash && state.posted !== undefined) return;
    state.textHash = hash;
    let stored: CommentThread[] = [];
    if (text !== undefined) {
      const parsed = parseSidecar(text);
      stored = parsed.threads;
      if (parsed.errors.length > 0 && state.warned !== text) {
        state.warned = text;
        void this.manager.host.ui.showWarning(
          `The review comments file ${path.basename(sidecar)} is not valid and is ignored: ${parsed.errors[0]}.`,
        );
      }
    }
    // T45: the page gets the live anchors. Same sidecar text as the last time: the in-memory view that
    // followed the edits. New or changed text: check every anchor against the document (re-anchoring).
    let live = stored;
    let orphaned = new Set<string>();
    if (stored.length === 0 || hash === undefined) {
      state.view = undefined;
    } else if (state.view?.diskHash === hash) {
      live = state.view.threads;
      orphaned = state.view.orphaned;
    } else {
      const documentText = await this.currentDocumentText(documentPath);
      if (preview.disposed || preview.stage !== stage || sequence !== state.seq) return;
      if (documentText !== undefined) {
        // After one of our own comment writes the lines followed in memory are the better start;
        // after any other change of the file the stored lines are.
        const known = state.hintHash === hash ? state.view?.threads : undefined;
        const hints = new Map((known ?? []).map((thread) => [thread.id, thread.anchor]));
        const start = stored.map((thread) => {
          const hint = hints.get(thread.id);
          return hint ? { ...thread, anchor: { ...thread.anchor, line: hint.line, endLine: hint.endLine } } : thread;
        });
        const outcome = reanchorThreads(documentText, start);
        live = outcome.threads;
        orphaned = outcome.orphaned;
      }
      state.view = { diskHash: hash, threads: live, orphaned };
    }
    const threads = live.map((thread) => ({ ...thread, orphaned: orphaned.has(thread.id) }));
    if (threads.length === 0 && !state.shown) return;
    // The same threads again (every render asks): nothing to tell the page.
    const serialized = JSON.stringify(threads);
    if (state.posted === serialized) return;
    state.posted = serialized;
    state.shown = threads.length > 0;
    preview.probe.commentPosts += 1;
    preview.probe.lastComments = threads;
    void preview.postToPage({
      type: "previewComments",
      threads,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    });
  }

  /** The text of the document: the open buffer when there is one, else the file (bounded size). */
  private async currentDocumentText(documentPath: string): Promise<string | undefined> {
    const { documents, files } = this.manager.host;
    const open = documents.get(documents.idOf(documentPath));
    if (open?.path !== undefined) return open.getText();
    try {
      if ((await files.stat(documentPath)).size > 8 * 1024 * 1024) return undefined;
      return new TextDecoder().decode(await files.readFile(documentPath));
    } catch {
      return undefined;
    }
  }

  /** T45: the threads follow the edits in memory; nothing is written while typing. */
  public shiftForEdits(event: DocumentChange): void {
    const documentIdentity = event.document.id;
    for (const preview of this.manager.sessions()) {
      const view = preview.comments.view;
      if (!view || preview.documentUri !== documentIdentity) continue;
      if (event.document.isDirty) {
        // Contents of one event are all in the coordinates of the text before it, in any order.
        const changes = toLineChanges(event.changes.map((change) => ({
          range: { start: { line: change.startLine }, end: { line: change.endLine } },
          text: change.text,
        })));
        preview.comments.view = { ...view, threads: shiftThreadLines(view.threads, changes) };
      } else {
        // A clean document changed: reload from disk, a revert or an undo to the saved text. Check again.
        preview.comments.view = undefined;
      }
      this.schedule(preview);
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-119
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-005
  /**
   * T45: saves the moved anchors with the document. Runs on save only, through the same per-file queue
   * as every comment write, so it honours its refusals: an invalid sidecar is left untouched, and so
   * is one with unsaved changes in an editor. A sidecar that does not exist is never created, nothing
   * is written when no anchor moved, and a thread that could not be placed keeps its stored lines.
   * The in-memory lines of the previews are the starting point of the search (the edits that moved
   * the text are known there), the saved text decides.
   */
  public async persistAnchors(document: HostDocument): Promise<void> {
    if (document.path === undefined) return;
    const documentIdentity = document.id;
    const previews = [...this.manager.sessions()].filter((preview) =>
      !preview.disposed && !preview.readOnly && preview.documentUri === documentIdentity);
    if (previews.length === 0) return;
    const documentPath = document.path;
    const sidecar = sidecarOf(documentPath);
    if (this.dirtyInEditor(sidecar)) {
      // Worth a warning only when there are threads that could have moved.
      if (previews.some((preview) => (preview.comments.view?.threads.length ?? 0) > 0)) {
        this.warnAnchorsNotSaved(`${path.basename(sidecar)} has unsaved changes in an editor.`);
      }
      return;
    }
    const hints = new Map<string, { line: number; endLine: number }>();
    for (const preview of previews) {
      for (const thread of preview.comments.view?.threads ?? []) {
        if (!hints.has(thread.id)) hints.set(thread.id, { line: thread.anchor.line, endLine: thread.anchor.endLine });
      }
    }
    const index = createDocumentIndex(document.getText());
    let orphaned = new Set<string>();
    const result = await this.store.update(sidecar, path.basename(documentPath), (threads) => {
      const hinted = threads.map((thread) => {
        const hint = hints.get(thread.id);
        return hint ? { ...thread, anchor: { ...thread.anchor, ...hint } } : thread;
      });
      const outcome = reanchorThreads(index, hinted);
      orphaned = outcome.orphaned;
      let moved = false;
      const next = threads.map((thread, position) => {
        if (outcome.orphaned.has(thread.id)) return thread;
        const { line, endLine } = outcome.threads[position].anchor;
        if (line === thread.anchor.line && endLine === thread.anchor.endLine) return thread;
        moved = true;
        return { ...thread, anchor: { ...thread.anchor, line, endLine } };
      });
      return moved ? next : ANCHORS_UNCHANGED;
    });
    if (result.ok) {
      this.lastAnchorWarning = undefined;
      const written = parseSidecar(result.text).threads;
      for (const preview of previews) {
        preview.comments.view = { diskHash: result.hash, threads: written, orphaned };
        this.schedule(preview);
      }
      return;
    }
    // Silent: nothing moved, or the file is invalid (the preview already warned about it once).
    if (result.reason === ANCHORS_UNCHANGED || result.reason.startsWith("the comments file is not valid")) return;
    this.warnAnchorsNotSaved(result.reason);
  }

  private warnAnchorsNotSaved(reason: string): void {
    if (this.lastAnchorWarning === reason) return;
    this.lastAnchorWarning = reason;
    void this.manager.host.ui.showWarning(`The review comments were not re-anchored in their file: ${reason}`);
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-125
  /**
   * T45: a renamed or moved document takes its comments file along and names itself in it. Nothing
   * is overwritten: when the new comments file exists, or the old one is not valid, belongs to another
   * document or has unsaved changes in an editor, it stays where it is and a warning says so.
   */
  public async moveSidecars(renames: readonly RenamedFile[]): Promise<void> {
    const { files, ui } = this.manager.host;
    for (const { oldPath, newPath, local } of renames) {
      if (!local) continue;
      const oldName = path.basename(oldPath);
      const newName = path.basename(newPath);
      if (oldName.endsWith(".comments.json")) continue;
      const oldSidecar = path.join(path.dirname(oldPath), sidecarNameFor(oldName));
      const newSidecar = path.join(path.dirname(newPath), sidecarNameFor(newName));
      if (oldSidecar === newSidecar) continue;
      try {
        if ((await files.stat(newPath)).kind === "directory") continue;
        const oldText = await this.readSidecarText(oldSidecar);
        if (oldText === undefined) continue;
        const parsed = parseSidecar(oldText);
        if (parsed.errors.length === 0 && parsed.document !== oldName) continue;
        const keep = (reason: string): void => {
          void ui.showWarning(
            `The review comments of ${oldName} stay in ${path.basename(oldSidecar)}: ${reason}`,
          );
        };
        if (parsed.errors.length > 0) {
          keep("that file is not valid.");
          continue;
        }
        if (await this.readSidecarText(newSidecar) !== undefined) {
          keep(`${path.basename(newSidecar)} already exists.`);
          continue;
        }
        if (this.dirtyInEditor(oldSidecar)) {
          keep("it has unsaved changes in an editor.");
          continue;
        }
        await files.rename(oldSidecar, newSidecar, { overwrite: false });
        await this.store.update(newSidecar, newName, (threads) => threads, { renameDocument: true });
      } catch (error) {
        console.error("Failed to move the review comments with the renamed document.", error);
      }
    }
  }

  /** Posts again when the sidecar is created, changed or deleted. */
  private watchSidecar(preview: PreviewSession, sidecar: string): void {
    const state = preview.comments;
    if (state.watch?.path === sidecar) return;
    state.watch?.watcher.dispose();
    const watcher = this.manager.host.watcher.watch(path.dirname(sidecar), path.basename(sidecar));
    const refresh = (): void => this.schedule(preview, COMMENTS_DEBOUNCE_MS);
    watcher.onDidCreate(refresh);
    watcher.onDidChange(refresh);
    watcher.onDidDelete(refresh);
    state.watch = { path: sidecar, watcher };
  }

  /** Posts the threads after `delay` (debounced). */
  public schedule(preview: PreviewSession, delay = COMMENTS_DEBOUNCE_MS): void {
    if (preview.disposed) return;
    const state = preview.comments;
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = undefined;
      void this.post(preview).catch((error: unknown) => {
        console.error("Failed to show the review comments.", error);
      });
    }, delay);
  }

  /** The text of a sidecar, undefined when there is none; any other failure is thrown. */
  private async readSidecarText(file: string): Promise<string | undefined> {
    const { files } = this.manager.host;
    try {
      await files.stat(file);
    } catch (error) {
      if (isFileNotFound(error)) return undefined;
      throw error;
    }
    return new TextDecoder().decode(await files.readFile(file));
  }

  /**
   * Writes a review comment (T43): a new thread on a selection or a reply. Refused in a read-only
   * preview (untrusted workspace or no folder), for a document that is not a saved file, and while
   * the comments file has unsaved changes in an editor. The author, the ids and the time are chosen
   * here; the page sends only the anchor, the thread id of a reply and the text. The sidecar is
   * changed through the per-file queue (read latest, apply, serialize, write), then posted to the
   * page; the watcher event of our own write is skipped by the hash of the text. The caller always
   * answers the page with the outcome, so typed text is never dropped silently.
   */
  private async writeComment(
    preview: PreviewSession,
    change: (author: string, now: Date) => ((threads: CommentThread[]) => CommentThread[] | string),
  ): Promise<CommentOutcome> {
    const { host } = this.manager;
    const refuse = (reason: string): CommentOutcome => {
      void host.ui.showWarning(`The comment was not saved: ${reason}`);
      return { ok: false, reason };
    };
    if (preview.readOnly) return refuse(previewReadOnlyReason(preview));
    const stage = preview.stage;
    if (preview.disposed || !stage || !preview.documentUri.startsWith("file:")) {
      return refuse("save the document first.");
    }
    const documentPath = stage.activeDocumentPath;
    const sidecar = sidecarOf(documentPath);
    if (this.dirtyInEditor(sidecar)) {
      return refuse(`${path.basename(sidecar)} has unsaved changes in an editor; save or close it first.`);
    }
    const documentId = host.documents.idOf(documentPath);
    const author = await resolveAuthor({
      setting: readCommentsConfiguration(host.settings.section(COMMENTS_CONFIGURATION_SECTION)).authorName,
      gitName: () => host.vcs.userName(documentId),
      osUserName,
    });
    const now = new Date();
    const result = await this.store.update(sidecar, path.basename(documentPath), change(author, now));
    if (!result.ok) return refuse(`${result.reason}.`);
    preview.comments.hintHash = result.hash;
    await this.post(preview);
    return { ok: true };
  }

  /** Tells the page how a create or a reply ended; the text stays in the page until ok is true. */
  private postResult(
    preview: PreviewSession,
    kind: CommentKind,
    threadId: string | undefined,
    outcome: CommentOutcome,
  ): void {
    const stage = preview.stage;
    if (!stage || preview.disposed) return;
    const result = {
      ok: outcome.ok,
      ...(outcome.ok ? {} : { reason: outcome.reason }),
      kind,
      ...(threadId !== undefined ? { threadId } : {}),
    };
    preview.probe.lastCommentResult = result;
    void preview.postToPage({
      type: "previewCommentResult",
      ...result,
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-090
  private async answer(
    preview: PreviewSession,
    kind: CommentKind,
    threadId: string | undefined,
    run: () => Promise<CommentOutcome>,
  ): Promise<void> {
    let outcome: CommentOutcome;
    try {
      outcome = await run();
    } catch (error) {
      outcome = { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
    this.postResult(preview, kind, threadId, outcome);
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-054
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-069
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-044
  private handleCreate(preview: PreviewSession, message: PageMessageOf<"previewCommentCreate">): Promise<void> {
    const body = normalizeBody(message.body);
    const anchor = message.anchor;
    return this.answer(preview, "create", undefined, async () => {
      if (!isValidAnchor(anchor) || body === undefined) return { ok: false, reason: "the comment is empty or too long." };
      return this.writeComment(preview, (author, now) => (threads) =>
        addThread(threads, { threadId: newId("t_"), commentId: newId("c_"), anchor, author, body, now })
          ?? "the comments file is full");
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-070
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-074
  private handleReply(preview: PreviewSession, message: PageMessageOf<"previewCommentReply">): Promise<void> {
    const body = normalizeBody(message.body);
    const threadId = typeof message.threadId === "string" ? message.threadId : undefined;
    return this.answer(preview, "reply", threadId, async () => {
      if (threadId === undefined || body === undefined) return { ok: false, reason: "the reply is empty or too long." };
      return this.writeComment(preview, (author, now) => (threads) =>
        addReply(threads, threadId, { commentId: newId("c_"), author, body, now })
          ?? "the thread no longer exists or has too many comments");
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-071
  private handleResolve(preview: PreviewSession, message: PageMessageOf<"previewCommentResolve">): Promise<void> {
    const threadId = typeof message.threadId === "string" ? message.threadId : undefined;
    const resolved = message.resolved === true;
    return this.answer(preview, "resolve", threadId, async () => {
      if (threadId === undefined) return { ok: false, reason: "the thread is unknown." };
      return this.writeComment(preview, () => (threads) =>
        setResolved(threads, threadId, resolved) ?? "the thread no longer exists");
    });
  }

  private handleDelete(preview: PreviewSession, message: PageMessageOf<"previewCommentDelete">): Promise<void> {
    const threadId = typeof message.threadId === "string" ? message.threadId : undefined;
    return this.answer(preview, "delete", threadId, async () => {
      if (threadId === undefined) return { ok: false, reason: "the thread is unknown." };
      // The file stays, with an empty list, when the last thread goes.
      return this.writeComment(preview, () => (threads) =>
        deleteThread(threads, threadId) ?? "the thread no longer exists");
    });
  }

  /** Stops the timer and the sidecar watch of a preview. */
  public clear(preview: PreviewSession): void {
    const state = preview.comments;
    if (state.timer) clearTimeout(state.timer);
    state.timer = undefined;
    state.watch?.watcher.dispose();
    state.watch = undefined;
  }
}
