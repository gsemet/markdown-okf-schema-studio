/**
 * The reader's choices that outlive one page: the preview theme mode, the view preferences, the
 * edit and palette mode, the collapsed descriptions per document (stored for the workspace through
 * the `KeyValueStore` port), the warning banners closed during this session, and the author name
 * a new inline thread starts with.
 */

import { resolveAuthor } from "../core/comments/author";
import { COMMENTS_CONFIGURATION_SECTION, readCommentsConfiguration } from "../core/configuration/commentsConfiguration";
import { EDITING_CONFIGURATION_SECTION, initialPaletteModeOf, PaletteMode } from "../core/configuration/editingConfiguration";
import type { HostServices } from "../host-api/index";
import type { KeyValueStore } from "../host-api/keyValueStore";
import { osUserName } from "../node-services/paths";
import {
  BoundedMap,
  loadCollapsedMap,
  migrateLegacyCollapsedKeys,
  saveCollapsedMap,
} from "../core/state/boundedState";
import {
  clearPreviewThemeMode,
  readPreviewThemeMode,
  type PreviewThemeMode,
  writePreviewThemeMode,
} from "../core/state/previewTheme";
import {
  applyViewPreference,
  DEFAULT_VIEW_PREFERENCES,
  readViewPreferences,
  writeViewPreferences,
  type ViewPreferenceKey,
  type ViewPreferences,
} from "../core/state/previewViewPreferences";

/** Storage key of the edit mode the next preview starts in. */
export const EDIT_MODE_STORAGE_KEY = "markdownOkfSchemaStudio.editMode";
/** Storage key of the palette mode the next preview starts in. */
export const PALETTE_MODE_STORAGE_KEY = "markdownOkfSchemaStudio.paletteMode";

/** The reader's workspace choices and session memory. */
export class WorkspaceChoices {
  private storage: KeyValueStore | undefined;
  private themeMode: PreviewThemeMode | undefined;
  private preferences: ViewPreferences = { ...DEFAULT_VIEW_PREFERENCES };
  /** Bounded per-document `descriptionsCollapsed` memory, persisted under one workspace key. */
  private collapsedDescriptions = new BoundedMap<boolean>();
  private author = "";
  /**
   * CR 050: the warning banner closed per document for this session, by the key of the warning set it
   * showed. A new set (another key) shows the banner again.
   */
  public readonly dismissedWarningBanners = new Map<string, string>();

  public constructor(private readonly host: HostServices) {}

  /** Reads the stored choices of the workspace; until then, the choices are the defaults. */
  public load(storage: KeyValueStore): void {
    this.storage = storage;
    this.collapsedDescriptions = loadCollapsedMap(storage);
    void migrateLegacyCollapsedKeys(storage, this.collapsedDescriptions).catch((error: unknown) => {
      console.error("Failed to migrate the per-document description state.", error);
    });
    this.themeMode = readPreviewThemeMode(storage);
    this.preferences = readViewPreferences(storage);
  }

  /** Forgets the storage (the extension is deactivated): later choices are not persisted. */
  public unload(): void {
    this.storage = undefined;
  }

  /** The name a new inline comment thread starts with; the Git user once it is known. */
  public get threadAuthor(): string {
    return this.author;
  }

  /**
   * Resolves the thread author (setting, Git user, OS user) for the next page that loads; the Git
   * user is the one of the repository of `documentId` (a document or folder URI).
   */
  public refreshThreadAuthor(documentId: string | undefined): void {
    void resolveAuthor({
      setting: readCommentsConfiguration(this.host.settings.section(COMMENTS_CONFIGURATION_SECTION)).authorName,
      gitName: documentId ? () => this.host.vcs.userName(documentId) : undefined,
      osUserName,
    }).then((author) => {
      this.author = author;
    }, () => undefined);
  }

  /** The theme mode the reader picked in the page, if any. */
  public get previewThemeMode(): PreviewThemeMode | undefined {
    return this.themeMode;
  }

  /** Remembers the theme mode for the session and the workspace. */
  public setPreviewThemeMode(mode: PreviewThemeMode): void {
    this.themeMode = mode;
    const storage = this.storage;
    if (!storage) {
      return;
    }
    void writePreviewThemeMode(storage, mode).then(undefined, (error: unknown) => {
      console.error("Failed to persist the Markdown preview theme mode.", error);
    });
  }

  /** Forgets the theme mode (session and workspace). */
  public async resetPreviewThemeMode(): Promise<void> {
    this.themeMode = undefined;
    if (this.storage) {
      await clearPreviewThemeMode(this.storage);
    }
  }

  /** The view preferences of the session (toolbar, incoming changes, ...). */
  public get viewPreferences(): ViewPreferences {
    return this.preferences;
  }

  /** Changes one view preference for the session and the workspace. */
  public setViewPreference(key: ViewPreferenceKey, value: unknown): void {
    this.preferences = applyViewPreference(this.preferences, key, value);
    const storage = this.storage;
    if (!storage) {
      return;
    }
    void writeViewPreferences(storage, this.preferences).then(undefined, (error: unknown) => {
      console.error("Failed to persist the Markdown preview view preferences.", error);
    });
  }

  /** The stored edit mode, as stored (`true` starts the next preview in edit mode). */
  public get editMode(): unknown {
    return this.storage?.get(EDIT_MODE_STORAGE_KEY);
  }

  /** Stores the edit mode the next preview starts in. */
  public setEditMode(editMode: boolean): void {
    void this.storage?.update(EDIT_MODE_STORAGE_KEY, editMode);
  }

  /** The palette mode the next page starts in: the stored one, else the setting. */
  public initialPaletteMode(): PaletteMode {
    return initialPaletteModeOf(
      this.storage?.get(PALETTE_MODE_STORAGE_KEY),
      this.host.settings.section(EDITING_CONFIGURATION_SECTION),
    );
  }

  /** Stores the palette mode the next page starts in (`undefined` forgets it). */
  public setPaletteMode(mode: PaletteMode | undefined): PromiseLike<void> | undefined {
    return this.storage?.update(PALETTE_MODE_STORAGE_KEY, mode);
  }

  /** The stored `descriptionsCollapsed` of a document, if any. */
  public collapsedDescriptionsOf(documentUri: string): boolean | undefined {
    return this.collapsedDescriptions.get(documentUri);
  }

  /** Remembers `descriptionsCollapsed` of a document for the workspace when it changed. */
  public recordCollapsedDescriptions(documentUri: string, collapsed: boolean): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }
    if (this.collapsedDescriptions.peek(documentUri) !== collapsed) {
      this.collapsedDescriptions.set(documentUri, collapsed);
      void saveCollapsedMap(storage, this.collapsedDescriptions);
    }
  }

  /**
   * Stores choices as if the reader had made them in the page (integration test seam, see
   * `storeWorkspaceChoicesForTests`).
   */
  public async storeChoices(choices: {
    previewThemeMode: PreviewThemeMode;
    toolbarCollapsed: boolean;
    paletteMode: PaletteMode;
  }): Promise<void> {
    this.themeMode = choices.previewThemeMode;
    this.preferences = applyViewPreference(this.preferences, "toolbarCollapsed", choices.toolbarCollapsed);
    await Promise.all([
      this.storage ? writePreviewThemeMode(this.storage, choices.previewThemeMode) : undefined,
      this.storage ? writeViewPreferences(this.storage, this.preferences) : undefined,
      this.storage?.update(PALETTE_MODE_STORAGE_KEY, choices.paletteMode),
    ]);
  }
}
