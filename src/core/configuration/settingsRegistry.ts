/**
 * The settings registry: one table of every user setting of the extension. Each entry holds the
 * JSON schema a host shows (VS Code: `contributes.configuration` of `package.json`, generated from
 * this table by `just generate-settings` and checked by `just check-settings`), how the core reads
 * the stored value, and whether the page receives it in its boot context and how it reads it there.
 * The section modules (`previewConfiguration.ts`, …) are typed views of this table. Pure module: no
 * host API, no DOM, no Node built-ins.
 */

/** The prefix of every setting name (`markdownOkfSchemaStudio.preview.maxContentWidth`). */
export const SETTINGS_NAMESPACE = "markdownOkfSchemaStudio";

/**
 * The fields of one setting as `package.json` declares them, written as they are, in this order.
 * `default` is also the value the core uses when the setting is not set.
 */
export interface SettingSchema<T> {
  /** The JSON type of the value. */
  type: "boolean" | "number" | "string";
  /** Allowed values of a string setting, with `enumDescriptions` in the same order. */
  enum?: readonly string[];
  /** One line per `enum` value, shown by the settings editor. */
  enumDescriptions?: readonly string[];
  /** The value used when the user has not set one. */
  default: T;
  /** Smallest value of a number setting (settings editor validation). */
  minimum?: number;
  /** Largest value of a number setting (settings editor validation). */
  maximum?: number;
  /** Step of the settings editor's number field. */
  step?: number;
  /** The description shown by the settings editor, in Markdown. */
  markdownDescription: string;
  /** Position of the setting in the settings editor (the generated schema is sorted by it). */
  order: number;
}

/** When the page reads a boot setting: once at startup, or also live through host messages. */
export type BootReadTime = "startup" | "live";

/**
 * How the page reads a setting from its boot context (`PreviewRuntimeContext`), where the key has
 * the setting's name. `startup`: read once; a change needs a new page document (the content patch
 * compares these, see `runtimeContextKey`). `live`: the page also follows changes through a host
 * message.
 */
export interface SettingBootRead<T, W extends BootReadTime = BootReadTime> {
  /** When the page reads it (see the interface comment). */
  when: W;
  /** The page's value for the boot context entry, which may be absent or of another type. */
  read(value: unknown): T;
}

/** One setting: its schema, how the core normalizes the stored value, and its page use. */
export interface SettingDescriptor<T> {
  /** The fields `package.json` declares (see {@link SettingSchema}). */
  readonly schema: SettingSchema<T>;
  /** The value the core uses for what the host's settings store returned (maybe of another type). */
  readonly normalize: (value: unknown) => T;
  /** Set when the page gets the setting in its boot context. */
  readonly boot?: SettingBootRead<T>;
}

/** A setting the page gets in its boot context. */
export interface BootSettingDescriptor<T, W extends BootReadTime = BootReadTime> extends SettingDescriptor<T> {
  /** How the page reads it (see {@link SettingBootRead}). */
  readonly boot: SettingBootRead<T, W>;
}

/** The settings of one section, by key (the last part of the setting name). */
export type SettingsTable = Readonly<Record<string, SettingDescriptor<unknown>>>;

/** The values of a settings table, by key. */
export type SettingValues<D> = { -readonly [K in keyof D]: D[K] extends SettingDescriptor<infer T> ? T : never };

/** The keys of a table whose settings the page gets in its boot context (read at `W`). */
export type BootSettingKeys<D, W extends BootReadTime = BootReadTime> = {
  [K in keyof D]: D[K] extends BootSettingDescriptor<unknown, W> ? K : never;
}[keyof D];

function setting<T>(schema: SettingSchema<T>, normalize: (value: unknown) => T): SettingDescriptor<T> {
  return { schema, normalize };
}

/** A setting the page reads from its boot context once, at startup. */
function startupSetting<T>(
  schema: SettingSchema<T>,
  normalize: (value: unknown) => T,
  read: (value: unknown) => T,
): BootSettingDescriptor<T, "startup"> {
  return { schema, normalize, boot: { when: "startup", read } };
}

/** A setting the page reads from its boot context and then follows through host messages. */
function liveSetting<T>(
  schema: SettingSchema<T>,
  normalize: (value: unknown) => T,
  read: (value: unknown) => T,
): BootSettingDescriptor<T, "live"> {
  return { schema, normalize, boot: { when: "live", read } };
}

/** The stored value as is: the host's settings store already checks the type. */
function asStored<T>(value: unknown): T {
  return value as T;
}

/** A boot context flag: anything but `false` is on for a default-on flag; only `true` otherwise. */
function bootFlag(defaultValue: boolean): (value: unknown) => boolean {
  return defaultValue ? (value) => value !== false : (value) => value === true;
}

/** Upper bound of `preview.maxContentWidth`, in pixels (0 means the full panel width). */
export const MAX_PREVIEW_CONTENT_WIDTH = 2400;
/** Default of `preview.maxContentWidth`, in pixels. */
export const DEFAULT_PREVIEW_CONTENT_WIDTH = 960;
/** Upper bound of `preview.stickyHeadingDepth`. */
export const MAX_STICKY_HEADING_DEPTH = 6;
/** Default of `preview.stickyHeadingDepth`. */
export const DEFAULT_STICKY_HEADING_DEPTH = 3;

// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-002
/** The column width of a `preview.maxContentWidth` value: rounded, at most 2400, else the default. */
export function normalizePreviewContentWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_PREVIEW_CONTENT_WIDTH;
  }
  return Math.min(MAX_PREVIEW_CONTENT_WIDTH, Math.round(value));
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-022
/** The sticky band depth of a `preview.stickyHeadingDepth` value: rounded, clamped to 1..6, else 3. */
export function normalizeStickyHeadingDepth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_STICKY_HEADING_DEPTH;
  }
  return Math.max(1, Math.min(MAX_STICKY_HEADING_DEPTH, Math.round(value)));
}

/** The palette modes, from the fewest buttons to the most (each mode adds to the previous one). */
export const PALETTE_MODES = ["strict", "gfm", "myst"] as const;

/** A palette mode: which buttons the edition palette shows. */
export type PaletteMode = (typeof PALETTE_MODES)[number];

/** True for one of the {@link PALETTE_MODES}. */
export function isPaletteMode(value: unknown): value is PaletteMode {
  return typeof value === "string" && (PALETTE_MODES as readonly string[]).includes(value);
}

/** The `markdownOkfSchemaStudio.preview.*` settings. Table order is the boot context order. */
export const PREVIEW_SETTINGS = {
  /** The page follows the text editor's scroll position (the anchor button overrides it per panel). */
  scrollPreviewWithEditor: startupSetting<boolean>({
    type: "boolean",
    default: true,
    markdownDescription: "Makes the preview follow the editor: scrolling the source editor scrolls the preview to the same place. **On**: the preview follows. **Off**: the preview stays where it is. The toolbar anchor button in each preview panel overrides this setting for that panel.",
    order: 30,
  }, asStored, bootFlag(true)),
  /** The text editor follows the page's scroll position. */
  scrollEditorWithPreview: startupSetting<boolean>({
    type: "boolean",
    default: true,
    markdownDescription: "Makes the editor follow the preview: scrolling or clicking in the preview reveals the matching source line in the editor. **On**: the editor follows. **Off**: the editor is never moved by the preview, and `#markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor#` has no effect.",
    order: 31,
  }, asStored, bootFlag(true)),
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-128
  /** The page marks the block of the editor selection. */
  markEditorSelection: startupSetting<boolean>({
    type: "boolean",
    default: false,
    markdownDescription: "Marks, in the preview, the block that holds the editor cursor line. The mark is refreshed when the editor scrolls or the preview re-renders, not on every cursor move. **On**: the matching block is marked. **Off**: no mark. Works even when `#markdownOkfSchemaStudio.preview.scrollPreviewWithEditor#` is off.",
    order: 32,
  }, asStored, bootFlag(false)),
  /** A double click outside edit mode reveals the source line. */
  doubleClickToSwitchToEditor: startupSetting<boolean>({
    type: "boolean",
    default: false,
    markdownDescription: "Lets you double-click rendered content in the preview to jump to its source line in the editor. **On**: double-click reveals the source line. **Off**: double-click does nothing special. Requires `#markdownOkfSchemaStudio.preview.scrollEditorWithPreview#` to be on, and is ignored while a block is being edited in the preview.",
    order: 33,
  }, asStored, bootFlag(false)),
  /** How many heading levels the sticky band shows (1..6). */
  stickyHeadingDepth: startupSetting<number>({
    type: "number",
    default: DEFAULT_STICKY_HEADING_DEPTH,
    minimum: 1,
    maximum: MAX_STICKY_HEADING_DEPTH,
    step: 1,
    markdownDescription: "Sets how many heading levels stay pinned at the top of the preview while you scroll. **1**: only the top-level heading. **3** (default): up to three levels. **6**: every level.",
    order: 11,
  }, normalizeStickyHeadingDepth, normalizeStickyHeadingDepth),
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-152
  /** Show the gray chips of HTML comments; TODO chips always show (T15). */
  showComments: liveSetting<boolean>({
    type: "boolean",
    default: true,
    markdownDescription: "Shows HTML comments (`<!-- ... -->`) in the preview as small gray chips that open into a box with the comment text when clicked. **On**: the gray comment chips show. **Off**: they are hidden at once in open previews. Green TODO chips always show, and comments used by tools (such as `markdownlint-*` or `prettier-ignore`) are always hidden.",
    order: 21,
  }, asStored, bootFlag(true)),
  /** The maximum width of the text column, in pixels; 0 is the full panel width. */
  maxContentWidth: setting<number>({
    type: "number",
    default: DEFAULT_PREVIEW_CONTENT_WIDTH,
    minimum: 0,
    maximum: MAX_PREVIEW_CONTENT_WIDTH,
    step: 50,
    markdownDescription: "Sets the maximum width of the preview text column, in pixels. A value from 1 to 2400 limits the column to that width and centers it. **0**: the column uses the full width of the preview panel.",
    order: 10,
  }, normalizePreviewContentWidth),
  /** Patch the preview content in place instead of reloading the page (kill switch, T34). */
  incrementalUpdates: setting<boolean>({
    type: "boolean",
    default: true,
    markdownDescription: "Controls how the preview refreshes while you type. **On**: the changed parts of the page are updated in place, so scroll position and open sections are kept. **Off**: the whole page reloads on every change; turn this off if the preview shows stale or broken content.",
    order: 20,
  }, asStored),
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-214
  /** Mark blocks changed since the last commit with a green bar (T16). */
  showIncomingChanges: setting<boolean>({
    type: "boolean",
    default: true,
    markdownDescription: "Marks the blocks you changed since the last Git commit with a green bar on their left, like the editor gutter. It compares the file, unsaved edits included, with the version in `HEAD` using the built-in Git extension. **On**: changed blocks are marked and the toolbar toggle for the marks is shown. **Off**: no marks and no toggle. Files that are not in Git show nothing.",
    order: 22,
  }, asStored),
};

/** The `markdownOkfSchemaStudio.editing.*` settings. */
export const EDITING_SETTINGS = {
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-001
  /** The palette buttons a workspace starts with, until the user picks another mode. */
  defaultPaletteMode: setting<PaletteMode>({
    type: "string",
    enum: PALETTE_MODES,
    enumDescriptions: [
      "Strict Markdown: only buttons for plain Markdown syntax.",
      "GitHub Flavored Markdown: the strict buttons plus the GFM ones.",
      "MyST Markdown: the GFM buttons plus the MyST ones.",
    ],
    default: "gfm",
    markdownDescription: "Chooses which buttons the edition palette shows in a workspace that has not picked a mode yet. The select at the start of the palette changes the mode for the workspace, and the choice is remembered. **strict**: plain Markdown only. **gfm** (the default): strict plus GitHub Flavored Markdown. **myst**: GFM plus MyST. The mode only changes the buttons, never how the preview renders.",
    order: 40,
  }, (value) => isPaletteMode(value) ? value : "gfm"),
};

/** The trimmed stored path (the settings store holds a string). */
function trimmedPath(value: unknown): string {
  return (value as string).trim();
}

/** The `markdownOkfSchemaStudio.frontmatter.*` settings. */
export const FRONTMATTER_SETTINGS = {
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-004
  /** Show the frontmatter properties table at the top of the preview. */
  propertiesTable: setting<boolean>({
    type: "boolean",
    default: true,
    markdownDescription: "Shows the frontmatter properties table at the top of the preview. **On**: the table is shown. **Off**: the frontmatter is not displayed.",
    order: 60,
  }, asStored),
  /** Warn about frontmatter fields the matching schema does not declare. */
  strictAdditionalProperties: setting<boolean>({
    type: "boolean",
    default: false,
    markdownDescription: "Controls warnings for frontmatter fields that the matching OKF schema does not declare. **On**: such fields are reported as warnings. **Off**: they are accepted silently.",
    order: 61,
  }, asStored),
  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-060
  /** The bundle root of `x-okf-link` values (trimmed); empty: found from the schema folder. */
  bundleRoot: setting<string>({
    type: "string",
    default: "",
    markdownDescription: "Folder used as the bundle root when resolving `x-okf-link` values. A relative path is resolved from the first workspace folder. **Empty**: the parent folder of the schema folder is used when it contains the document and has an `index.md` or `log.md`; otherwise bundle-relative links cannot be resolved.",
    order: 62,
  }, trimmedPath),
  /** The project root of `x-okf-link` values (trimmed); empty: the document's git root. */
  projectRoot: setting<string>({
    type: "string",
    default: "",
    markdownDescription: "Folder used as the project root when resolving `x-okf-link` values. A relative path is resolved from the first workspace folder. **Empty**: the git root of the document is used when it is inside the workspace; otherwise project-relative links cannot be resolved.",
    order: 63,
  }, trimmedPath),
  /** Resolve document-relative `x-okf-link` values outside the workspace folders. */
  allowOutsideWorkspaceLinks: setting<boolean>({
    type: "boolean",
    default: false,
    markdownDescription: "Controls document-relative `x-okf-link` values that point outside the workspace folders. **On**: such links are resolved. **Off**: they are reported as errors.",
    order: 64,
  }, asStored),
};

/** The `markdownOkfSchemaStudio.comments.*` settings. */
export const COMMENTS_SETTINGS = {
  /** Author of new review comments; empty means Git user.name, then the OS user name (T43). */
  authorName: setting<string>({
    type: "string",
    default: "",
    markdownDescription: "The name stored with the review comments you write in the preview. **Empty** (default): your Git `user.name` is used, and when Git has none, your operating system user name. **A name**: that name is used as it is, up to 100 characters.",
    order: 50,
  }, (value) => typeof value === "string" ? value : ""),
};

/** The `markdownOkfSchemaStudio.plantuml.*` settings. */
export const PLANTUML_SETTINGS = {
  // @implements_req SwRS-MDOKFSTUDIO-DIAG-024
  /** Use the external `java -jar` / `plantuml` pipeline; only a real `true` starts a process. */
  useJar: setting<boolean>({
    type: "boolean",
    default: false,
    markdownDescription: "Chooses the engine that draws PlantUML diagrams. **On**: Java with the JAR of `#markdownOkfSchemaStudio.plantuml.jarPath#`, or the `plantuml` command on your PATH; trusted workspaces only, and needed for `!include` files and remote libraries. **Off** (default): the built-in engine bundled with the extension, with no Java, no process and no network; it also works in Restricted Mode.",
    order: 79,
  }, (value) => value === true),
  /** Path to `plantuml.jar` (trimmed); empty: the `plantuml` command on the PATH. */
  jarPath: setting<string>({
    type: "string",
    default: "",
    markdownDescription: "Path to `plantuml.jar`, used only when `#markdownOkfSchemaStudio.plantuml.useJar#` is on. A relative path is resolved from the workspace folder. **Empty**: the `plantuml` command found on your PATH is used.",
    order: 80,
  }, (value) => typeof value === "string" ? value.trim() : ""),
};

/** One group of the settings editor: a section of the table with its title and position. */
export interface SettingCategory {
  /** The section: the middle part of the setting names (`preview`). */
  readonly section: string;
  /** The group title in the settings editor. */
  readonly title: string;
  /** The group position in the settings editor. */
  readonly order: number;
  /** The settings of the section. */
  readonly settings: SettingsTable;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-156
/** Every section of the table, in the order of `contributes.configuration`. */
export const SETTING_CATEGORIES: readonly SettingCategory[] = [
  { section: "preview", title: "Preview", order: 1, settings: PREVIEW_SETTINGS },
  { section: "editing", title: "Editing", order: 2, settings: EDITING_SETTINGS },
  { section: "frontmatter", title: "Frontmatter", order: 3, settings: FRONTMATTER_SETTINGS },
  { section: "comments", title: "Comments", order: 4, settings: COMMENTS_SETTINGS },
  { section: "plantuml", title: "PlantUML", order: 5, settings: PLANTUML_SETTINGS },
];

/** The full name of a section (`markdownOkfSchemaStudio.preview`). */
export function settingSection(section: string): string {
  return `${SETTINGS_NAMESPACE}.${section}`;
}

/** Where settings are read from: one section of the host's settings store. */
export interface SettingsSource {
  /** The value of `key` in the section, or `defaultValue` when it is not set. */
  get<T>(key: string, defaultValue: T): T;
}

/** The normalized value of one setting of a section. */
export function readSetting<T>(source: SettingsSource, key: string, descriptor: SettingDescriptor<T>): T {
  return descriptor.normalize(source.get(key, descriptor.schema.default));
}

/** The normalized values of every setting of a table, read from its section. */
export function readSettings<D extends SettingsTable>(table: D, source: SettingsSource): SettingValues<D> {
  const values: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(table)) {
    values[key] = readSetting(source, key, descriptor);
  }
  return values as SettingValues<D>;
}

/** The defaults of every setting of a table. */
export function settingDefaults<D extends SettingsTable>(table: D): SettingValues<D> {
  const values: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(table)) {
    values[key] = descriptor.schema.default;
  }
  return values as SettingValues<D>;
}

/** The keys of a table whose settings the page receives in its boot context, maybe only `when`. */
export function bootSettingKeys(table: SettingsTable, when?: BootReadTime): string[] {
  return Object.entries(table)
    .filter(([, descriptor]) => descriptor.boot !== undefined && (when === undefined || descriptor.boot.when === when))
    .map(([key]) => key);
}

/** The `contributes.configuration` of `package.json`, generated from {@link SETTING_CATEGORIES}. */
export function contributedConfiguration(): Array<{
  title: string;
  order: number;
  properties: Record<string, SettingSchema<unknown>>;
}> {
  return SETTING_CATEGORIES.map((category) => {
    const properties: Record<string, SettingSchema<unknown>> = {};
    const entries = Object.entries(category.settings)
      .sort(([, left], [, right]) => left.schema.order - right.schema.order);
    for (const [key, descriptor] of entries) {
      properties[`${settingSection(category.section)}.${key}`] = descriptor.schema;
    }
    return { title: category.title, order: category.order, properties };
  });
}
