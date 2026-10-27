/**
 * The host events of the preview manager: file and dependency changes below a session's root,
 * conf.py events, the filename-stem watchers of workspace roots, and the document, editor,
 * settings, trust, folder and theme events the host forwards. Each turns into work on the sessions
 * concerned, through the manager's controllers. Host-neutral, like the manager: the VS Code
 * activation (`src/host-vscode/activation.ts`) forwards the events here.
 */

import * as path from "node:path";

import { FRONTMATTER_CONFIGURATION_SECTION, readFrontmatterConfiguration } from "../core/configuration/frontmatterConfiguration";
import {
  PLANTUML_CONFIGURATION_SECTION,
  readPlantUmlConfiguration,
  readPlantUmlEngineSettings,
} from "../core/configuration/plantUmlConfiguration";
import { PREVIEW_CONFIGURATION_SECTION, readPreviewConfiguration } from "../core/configuration/previewConfiguration";
import { invalidateStemIndex } from "../core/frontmatter/fileLinks";
import { invalidateConfCache, locateConfFor } from "../core/myst/confLocator";
import { isOutsideChange } from "../core/preview/updatedRanges";
import type { BlockRangeChange } from "../core/state/blockRange";
import { isUnchangedSave } from "../core/state/editLock";
import type { DocumentChange, HostDocument } from "../host-api/documentStore";
import type { Disposable } from "../host-api/events";
import type { SettingsChange } from "../host-api/settings";
import type { PairedEditor } from "../host-api/textEditors";
import type { FileWatcher } from "../host-api/watcher";
import type { WorkspaceFolderInfo } from "../host-api/workspaceInfo";
import { canonicalPath } from "../node-services/paths";
import type { PreviewManager } from "./previewManager";
import type { PreviewSession } from "./previewSession";
import { isDocumentEligible } from "./sessionDocuments";

/** A file the host renamed or moved; `local` when both paths are files of the local file system. */
export interface RenamedFile {
  oldPath: string;
  newPath: string;
  local: boolean;
}

// Directories that churn constantly during builds; watching them would cost far more
// than the preview could ever gain from them.
const IGNORED_WATCH_SEGMENTS = new Set([
  ".git",
  ".venv",
  ".vscode-test",
  "_build",
  "dist",
  "htmlcov",
  "node_modules",
  "out",
  "output",
  "public",
  "tmp",
]);

/**
 * Whether a file event sits below a build or tool folder of the watched root. Only the segments
 * below the root count, so a root stored under such a folder still refreshes; a path outside the
 * root is read whole.
 */
function isIgnoredWatchPath(filePath: string, root: string): boolean {
  const relative = path.relative(root, filePath);
  const inside = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  return (inside ? relative : filePath).split(path.sep).some((segment) => IGNORED_WATCH_SEGMENTS.has(segment));
}

function sameFile(a: string | undefined, b: string): boolean {
  return a !== undefined && canonicalPath(a) === canonicalPath(b);
}

interface StemRootWatcher {
  watcher: FileWatcher;
  subscriptions: Disposable[];
}

/** The host events of one {@link PreviewManager} (its `events`). */
export class HostEvents {
  /** One `.md` watcher per workspace root: it keeps the filename-stem index of links current. */
  private readonly stemRootWatchers = new Map<string, StemRootWatcher>();

  /** The canonical shown path of each session, with the path it was resolved from. */
  private readonly activePaths = new WeakMap<PreviewSession, { raw: string; canonical: string }>();

  public constructor(private readonly manager: PreviewManager) {}

  // ---------------------------------------------------------------------------------------------
  // Files and dependencies
  // ---------------------------------------------------------------------------------------------

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-044
  /** A file below the session's root changed: re-render when the page shows or depends on it. */
  public refreshReferencedPath(session: PreviewSession, filePath: string, canonical?: string): void {
    if (session.disposed || isIgnoredWatchPath(filePath, session.workspaceRoot)) {
      return;
    }
    // A file the finished renders may have read changed: a render of the same revision is stale.
    this.manager.sharedRenders.invalidate();
    const candidate = canonical ?? canonicalPath(filePath);
    if (!this.concerns(session, filePath, candidate)) {
      return;
    }
    if (candidate === this.canonicalActivePath(session)) {
      session.probe.activePathChanges += 1;
      if (session.document
        && session.status !== "missing-source"
        && this.manager.sourceAvailable(session)
        && ["success", "recovery"].includes(
          (session.status === "pending" ? session.shownStatus : session.status) ?? "")
        && isUnchangedSave({
          isActiveDocument: true,
          documentVersion: session.document.revision,
          stageVersion: session.stage?.activeDocumentIdentity === session.documentUri
            ? session.stage.activeDocumentRevision
            : undefined,
        })) {
        // A save of the buffer that is already rendered changes nothing on screen (PERF-06).
        return;
      }
      if (this.manager.sourceAvailable(session) && session.document) {
        this.manager.edits.deferWhileEditing(session, "render", () => this.manager.rendering.refreshOpenDocument(session));
      } else {
        this.manager.rendering.setMissingSource(session);
      }
      return;
    }
    if (session.document && this.manager.frontmatter.watchesLinkedTarget(session, candidate)) {
      // Per-target watchers arm asynchronously; the preview-wide watcher backs them up (debounced).
      this.manager.frontmatter.scheduleLinkEnrichment(session, session.documentUri, session.document.revision);
    }
    // @implements_req SwRS-MDOKFSTUDIO-DIAG-053
    if (session.plantUml.includeWatch.has(candidate)) {
      // The page draws its built-in PlantUML diagrams itself: tell it to read their files again.
      this.manager.edits.deferWhileEditing(session, "plantuml-includes", () => this.manager.plantUml.notifyIncludesChanged(session));
    }
    if (!session.queue.dependsOn(filePath) || !session.document || !this.manager.sourceAvailable(session)) {
      return;
    }
    this.manager.edits.deferWhileEditing(session, "render", () => this.manager.rendering.refreshOpenDocument(session, true));
  }

  /**
   * Whether a change of `canonical` can matter to the session: it is the shown file, a linked
   * target, a PlantUML include or a dependency of the last render. Answered from sets computed
   * once (no file system call), so a change of a file nothing depends on costs the session nothing.
   */
  private concerns(session: PreviewSession, filePath: string, canonical: string): boolean {
    return canonical === this.canonicalActivePath(session)
      || this.manager.frontmatter.watchesLinkedTarget(session, canonical)
      || session.plantUml.includeWatch.has(canonical)
      || session.queue.dependsOn(filePath, canonical);
  }

  /** The canonical path of the shown file, resolved again only when the path itself changes. */
  private canonicalActivePath(session: PreviewSession): string {
    const raw = this.manager.activePathOf(session);
    const cached = this.activePaths.get(session);
    if (cached?.raw === raw) {
      return cached.canonical;
    }
    const canonical = canonicalPath(raw);
    this.activePaths.set(session, { raw, canonical });
    return canonical;
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-062
  /** The missing source came back: render it again. */
  public recoverMissingSource(session: PreviewSession): void {
    if (!this.manager.sourceAvailable(session)) {
      return;
    }
    const document = session.document ?? this.manager.host.documents.get(session.documentUri);
    if (document) {
      session.document = document;
      void this.manager.rendering.refreshPreviewDocument(session, document);
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-MYST-078
  /**
   * A conf.py event refreshes only the previews whose governing conf.py is that file, before or
   * after the event (a created or deleted file can change which one governs). Other previews and
   * unrelated conf.py files are left alone; an open block edit defers the refresh.
   */
  public onConfFileEvent(filePath: string): void {
    const candidates = [...this.manager.sessions()].filter(
      (session) => session.document && !session.disposed && !isIgnoredWatchPath(filePath, session.workspaceRoot));
    if (candidates.length === 0) {
      return;
    }
    const locate = (session: PreviewSession): string | undefined =>
      locateConfFor(this.manager.pathOf(session.document!), session.workspaceRoot);
    const before = new Map(candidates.map((session) => [session, locate(session)]));
    invalidateConfCache();
    this.manager.sharedRenders.invalidate();
    for (const session of candidates) {
      if (sameFile(before.get(session), filePath) || sameFile(locate(session), filePath)) {
        this.manager.edits.deferWhileEditing(session, "render", () => this.manager.rendering.refreshOpenDocument(session, true));
      }
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
  /** Watches the Markdown files of a workspace root for the filename-stem index of links. */
  public watchStemRoot(root: string): void {
    const canonicalRoot = canonicalPath(root);
    if (this.stemRootWatchers.has(canonicalRoot)) return;
    const watcher = this.manager.host.watcher.watch(canonicalRoot, "**/*.md");
    const invalidate = (): void => invalidateStemIndex(canonicalRoot);
    const subscriptions = [
      // Only a file that appears or disappears changes a filename stem: saving one does not.
      watcher.onDidCreate(invalidate),
      watcher.onDidDelete(invalidate),
    ];
    this.stemRootWatchers.set(canonicalRoot, { watcher, subscriptions });
  }

  /** Stops watching a workspace root (see {@link watchStemRoot}). */
  public unwatchStemRoot(root: string): void {
    const canonicalRoot = canonicalPath(root);
    const entry = this.stemRootWatchers.get(canonicalRoot);
    if (!entry) return;
    for (const subscription of entry.subscriptions) {
      subscription.dispose();
    }
    entry.watcher.dispose();
    this.stemRootWatchers.delete(canonicalRoot);
  }

  /** Stops watching every workspace root. */
  public disposeStemRootWatchers(): void {
    for (const root of this.stemRootWatchers.keys()) {
      this.unwatchStemRoot(root);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Host events
  // ---------------------------------------------------------------------------------------------

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-039
  /** The text of a document changed (any document, any change: the store's own edits included). */
  public onDocumentChanged(event: DocumentChange): void {
    if (event.changes.length === 0) {
      return;
    }
    this.noteOutsideChange(event);
    this.manager.scroll.shiftAnchorsForEdits(event);
    this.manager.comments.shiftForEdits(event);
    this.refreshPreview(event.document, event.changes.map((change) => ({
      rangeOffset: change.start,
      rangeLength: change.length,
      text: change.text,
    })));
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-094
  /**
   * Records a change made outside the preview (or an undo / redo) on the previews of its document. A
   * change of the active text editor's document is the user typing there: it does not glow.
   */
  private noteOutsideChange(event: DocumentChange): void {
    const key = event.document.id;
    const activeDocument = this.manager.host.editors.active()?.document;
    const inActiveEditor = activeDocument !== undefined && activeDocument.id === key;
    const reason = event.reason === "undo" ? 1 : event.reason === "redo" ? 2 : undefined;
    if (!isOutsideChange(reason as 1 | 2, this.manager.host.documents.isApplying(key), inActiveEditor)) return;
    for (const session of this.manager.sessions()) {
      if (session.documentUri === key) session.page.outsideChangeVersion = event.document.revision;
    }
  }

  private refreshPreview(document: HostDocument, changes?: readonly BlockRangeChange[]): void {
    // The path of a document no preview shows is resolved once for all the sessions, on demand.
    let foreign: { path: string; canonical: string } | undefined;
    for (const session of this.manager.sessions()) {
      if (document.id === session.documentUri) {
        const edit = session.edits.active;
        if (edit) {
          if (edit.applying) {
            continue;
          }
          if (changes && this.manager.sourceAvailable(session) && this.manager.edits.trackOutsideChange(session, edit, changes)) {
            // The block moved with the change, or the conflict was reported: the editor stays open
            // and the render waits for it (STAB-03, STAB-06).
            this.manager.frontmatter.refresh(session, document);
            this.manager.edits.deferWhileEditing(session, "render", () => this.manager.rendering.refreshOpenDocument(session));
            continue;
          }
          this.manager.edits.releaseActiveBlockEdit(session, true);
        }
        if (this.manager.sourceAvailable(session)) {
          this.manager.frontmatter.refresh(session, document);
          void this.manager.rendering.refreshPreviewDocument(session, document);
        } else {
          this.manager.rendering.setMissingSource(session);
        }
      } else {
        foreign ??= { path: this.manager.pathOf(document), canonical: canonicalPath(this.manager.pathOf(document)) };
        this.refreshReferencedPath(session, foreign.path, foreign.canonical);
      }
    }
  }

  /**
   * A document was saved. A linked target saved in the editor: the refresh its edits triggered read
   * the file before the save wrote it, and the file watchers can lag behind or miss the write. Only
   * the link enrichment is scheduled; a dependency (an include) is re-rendered by its watcher as before.
   */
  public onDocumentSaved(document: HostDocument): void {
    const saved = canonicalPath(this.manager.pathOf(document));
    for (const session of this.manager.sessions()) {
      if (!session.disposed && session.document && document.id !== session.documentUri
        && this.manager.frontmatter.watchesLinkedTarget(session, saved)) {
        this.manager.frontmatter.scheduleLinkEnrichment(session, session.documentUri, session.document.revision);
      }
    }
    void this.manager.comments.persistAnchors(document).catch((error: unknown) => {
      console.error("Failed to save the moved review comment anchors.", error);
    });
  }

  /** A document was closed: its problems go unless a live preview still shows it. */
  public onDocumentClosed(documentId: string): void {
    this.manager.diagnostics.clear(documentId);
  }

  /** Files were renamed or moved: comments files follow, previews of a renamed source stop. */
  public onFilesRenamed(files: readonly RenamedFile[]): void {
    void this.manager.comments.moveSidecars(files);
    this.manager.sharedRenders.invalidate();
    for (const session of this.manager.sessions()) {
      const activePath = this.manager.activePathOf(session);
      for (const file of files) {
        if (canonicalPath(file.oldPath) === canonicalPath(activePath)) {
          this.manager.rendering.setMissingSource(session, "The active Markdown source was renamed or deleted.");
          continue;
        }
      }
      if (!session.document || !this.manager.sourceAvailable(session)) {
        continue;
      }
      const dependencyRenamed = files.some((file) =>
        session.queue.dependsOn(file.oldPath)
        || session.queue.dependsOn(file.newPath));
      if (dependencyRenamed) {
        void this.manager.rendering.refreshPreviewDocument(session, session.document);
      }
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-143
  /** Workspace folders were added or removed: stem watchers follow, previews of a removed folder close. */
  public onFoldersChanged(added: readonly WorkspaceFolderInfo[], removed: readonly WorkspaceFolderInfo[]): void {
    for (const folder of added) {
      this.watchStemRoot(folder.path);
    }
    for (const folder of removed) {
      this.unwatchStemRoot(folder.path);
    }
    for (const session of [...this.manager.sessions()]) {
      const folderRemoved = removed.some(
        (folder) => session.workspaceFolder !== undefined && folder.id === session.workspaceFolder.id,
      );
      if (folderRemoved) {
        this.manager.disposeSession(session, true);
      }
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-001
  /** The user granted trust: open previews become writable and the incoming changes can be read. */
  public onTrustGranted(): void {
    this.manager.refreshTrust();
    for (const session of this.manager.sessions()) this.manager.incoming.schedule(session, 0);
  }

  // @implements_req SwRS-MDOKFSTUDIO-DIAG-024
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-004
  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-002
  /** Settings changed: the previews read theirs again and update the page. */
  public onSettingsChanged(event: SettingsChange): void {
    const { host } = this.manager;
    this.manager.sharedRenders.invalidate();
    if (this.manager.sessions().size === 0
      || (!event.affects(PREVIEW_CONFIGURATION_SECTION)
        && !event.affects(PLANTUML_CONFIGURATION_SECTION)
        && !event.affects(FRONTMATTER_CONFIGURATION_SECTION))) {
      return;
    }
    for (const session of this.manager.sessions()) {
      const plantUmlConfigurationChanged = event.affects(PLANTUML_CONFIGURATION_SECTION);
      if (event.affects(PREVIEW_CONFIGURATION_SECTION)) {
        session.configuration = readPreviewConfiguration(host.settings.section(PREVIEW_CONFIGURATION_SECTION));
        // The switch needs no re-render: the open page follows it at once.
        this.manager.view.postShowComments(session);
        this.manager.incoming.schedule(session, 0);
      }
      if (plantUmlConfigurationChanged) {
        session.plantUmlConfiguration = readPlantUmlConfiguration(host.settings.section(PLANTUML_CONFIGURATION_SECTION));
        session.plantUmlEngineSettings = readPlantUmlEngineSettings(host.settings.section(PLANTUML_CONFIGURATION_SECTION));
      }
      if (event.affects(FRONTMATTER_CONFIGURATION_SECTION)) {
        session.frontmatterConfiguration = readFrontmatterConfiguration(
          host.settings.section(FRONTMATTER_CONFIGURATION_SECTION),
        );
      }
      // Re-run the whole pipeline so the table reflects state and settings.
      const document = host.editors.active()?.document ?? session.document;
      if (document && document.id === session.documentUri) {
        this.manager.frontmatter.refresh(session, document);
      }
      if (plantUmlConfigurationChanged && document && document.id === session.documentUri) {
        void this.manager.rendering.refreshPreviewDocument(session, document);
      } else {
        const lastGood = session.queue.getState().lastGood;
        if (lastGood) {
          this.manager.rendering.updatePreview(session, lastGood);
        }
      }
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-026
  /** The active editor changed: the side preview follows a Markdown document. */
  public onActiveEditorChanged(editor: PairedEditor | undefined): void {
    const session = this.manager.latest((candidate) => candidate.followsActiveEditor);
    const document = editor?.document;
    if (!session || !session.followsActiveEditor || !document) {
      return;
    }
    if (!isDocumentEligible(document)) {
      // Like the built-in Markdown preview: keep the last Markdown document while another kind of
      // editor is active.
      return;
    }
    this.manager.switchAfterFlush(session, document);
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-100
  /** The visible editors changed: each page learns whether its document has an editor beside it. */
  public onVisibleEditorsChanged(): void {
    for (const session of this.manager.sessions()) {
      this.manager.scroll.notifyPairing(session);
    }
  }

  /** An editor scrolled: its pages follow (see {@link ScrollSyncController.syncEditorToPreview}). */
  public onVisibleRangesChanged(editor: PairedEditor): void {
    this.manager.scroll.syncEditorToPreview(editor);
  }

  // @implements_req SwRS-MDOKFSTUDIO-THEME-016
  /** The color theme changed: each page learns its kind. */
  public onThemeChanged(): void {
    for (const session of this.manager.sessions()) {
      this.manager.view.notifyTheme(session);
    }
  }
}
