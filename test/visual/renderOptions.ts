/**
 * Per-scenario options of the static visual page (the mock of the webview host).
 *
 * Every field is optional and means "different from the default page"; a scenario without
 * `render` keeps the page file it always had. The options are part of the page
 * identity: `pageFileName` appends a hash of them, so two scenarios with the same fixture, theme,
 * sticky depth and PlantUML expectation but other options never share a page.
 */
import { createHash } from "node:crypto";

export interface HostMessage {
  /** Delay after the page script ran (ms, default 0). */
  readonly delayMs?: number;
  /** Dispatched on `window` as a `message` event, like `webview.postMessage`. */
  readonly data: Readonly<Record<string, unknown>>;
}

export interface ScenarioRenderOptions {
  /** `false`: untrusted workspace (PlantUML disabled, external scripts refused). Default trusted. */
  readonly trusted?: false;
  /** `true`: editing disabled like a read-only preview (no Edit button, properties table not editable). Default editing on. */
  readonly readOnly?: true;
  /** `true`: undeclared frontmatter fields are warnings (`strictAdditionalProperties`). Default off. */
  readonly strictAdditionalProperties?: true;
  /** `false`: no properties table (`propertiesTable` setting off). Default on. */
  readonly propertiesTable?: false;
  /** Content width in px (`maxContentWidth` setting). Default: the product default. */
  readonly maxContentWidth?: number;
  /** Initial palette mode (the workspace choice). Default: the runtime default. */
  readonly paletteMode?: "strict" | "gfm" | "myst";
  /** Initial zoom in percent (70 to 200, the stored view preference). Default 100. */
  readonly zoom?: number;
  /** `false`: the Diff toggle starts off (the `incomingChanges` view preference). Default on. */
  readonly incomingChanges?: false;
  /** `true`: the page marks the block under the editor selection (`markEditorSelection` setting). Default off. */
  readonly markEditorSelection?: true;
  /** `true`: a writable review-comment preview (Resolve, Delete and the reply box in the thread popover, `commentsEnabled`). Default off. */
  readonly commentsEnabled?: true;
  /**
   * `true`: a fresh workspace that stored no choice, so the page starts with the built-in defaults
   * (cream theme mode, collapsed toolbar, GFM palette mode). Default: the workspace of
   * `PINNED_WORKSPACE_CHOICES`.
   */
  readonly freshWorkspace?: true;
  /**
   * CR 050: the MyST extensions the governing conf.py enables. Set, the page is rendered with the
   * conf.py checks and carries the host's success status region with their warnings. Default: no
   * conf.py (no checks, no status region).
   */
  readonly mystExtensions?: readonly string[];
  /**
   * Messages the mock host sends to the page after load, in order. The document id, version and
   * request id of the page are added to each message unless `data` sets them.
   */
  readonly hostMessages?: readonly HostMessage[];
}

const OPTION_ORDER: readonly (keyof ScenarioRenderOptions)[] = [
  "trusted", "readOnly", "strictAdditionalProperties", "propertiesTable",
  "maxContentWidth", "paletteMode", "zoom", "incomingChanges", "markEditorSelection", "commentsEnabled", "hostMessages",
  "freshWorkspace", "mystExtensions",
];

/**
 * The choices the mock host reports as stored for the workspace of every page that is not a
 * `freshWorkspace` one: the state the campaign was written against before the fresh defaults
 * changed (theme mode "current", toolbar expanded, MyST palette mode). Pinning them keeps the
 * screenshots and the assertions of those scenarios as they were.
 */
export const PINNED_WORKSPACE_CHOICES = Object.freeze({
  previewThemeMode: "current",
  toolbarCollapsed: false,
  paletteMode: "myst",
} as const);

/** Stable text of the options that are set (empty for none): the cache key part. */
export function renderOptionsKey(options: ScenarioRenderOptions | undefined): string {
  if (options === undefined) return "";
  const entries = OPTION_ORDER
    .filter((name) => options[name] !== undefined)
    .map((name) => [name, options[name]] as const);
  return entries.length === 0 ? "" : JSON.stringify(entries);
}

export interface PageIdentity {
  readonly fixture: string;
  readonly theme: string;
  readonly stickyHeadingDepth: number;
  readonly plantumlExpectation?: string;
  readonly render?: ScenarioRenderOptions;
}

/** The cache key of a page: one rendering per distinct value. */
export function pageKey(identity: PageIdentity): string {
  return [
    identity.fixture,
    identity.theme,
    identity.stickyHeadingDepth,
    identity.plantumlExpectation ?? "default",
    renderOptionsKey(identity.render),
  ].join("\u0000");
}

/** The page file name; unchanged for a scenario without options. */
export function pageFileName(identity: PageIdentity): string {
  const base = `${identity.fixture}--${identity.theme}--sticky-${identity.stickyHeadingDepth}--${identity.plantumlExpectation ?? "default"}`;
  const key = renderOptionsKey(identity.render);
  return key === "" ? `${base}.html` : `${base}--o${createHash("sha1").update(key).digest("hex").slice(0, 8)}.html`;
}
