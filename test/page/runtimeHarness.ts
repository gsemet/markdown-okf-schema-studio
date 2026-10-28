/**
 * The fake page of the preview runtime unit tests: a minimal DOM, window and webview API in which
 * the runtime script runs under `node:vm`, with the queues (frames, timers, microtasks) the tests
 * drive by hand. Moved out of `scrollSync.test.ts` so other test files can boot the page; the
 * delay-aware clock (`advanceTimers`, `virtualClock`) and `runtimeScript` are opt-in additions that
 * leave the behaviour the existing tests see unchanged.
 */
import type { ViewPreferences } from "../../src/core/state/previewViewPreferences";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vm from "node:vm";

import { buildSync, type BuildOptions } from "esbuild";

import { RUNTIME_CONTEXT_ATTRIBUTE, serializeRuntimeContext } from "../../src/core/protocol/bootContext";
import { highlightLanguageNames } from "../../src/core/render/highlight";
import { HARNESS_PAGE } from "../shared/previewIdentity";

const repositoryRoot = path.resolve(__dirname, "../../..");

let pageBundle: string | undefined;

/**
 * The page runtime the tests run: the page bundle (src/page/main.ts) built in memory with the
 * options of the shipped bundle (scripts/page-bundle.mjs), not minified, once per test process.
 */
export function pageRuntimeScript(): string {
  if (pageBundle === undefined) {
    const { pageBundleOptions } = require(path.join(repositoryRoot, "scripts", "page-bundle.mjs")) as {
      pageBundleOptions(options: { highlightLanguages: readonly string[]; minify: boolean }): BuildOptions;
    };
    const result = buildSync({
      ...pageBundleOptions({ highlightLanguages: highlightLanguageNames(), minify: false }),
      absWorkingDir: repositoryRoot,
      write: false,
      logLevel: "silent",
    });
    pageBundle = result.outputFiles[0]!.text;
  }
  return pageBundle;
}

export type RuntimeListener = (event: unknown) => void;

export class RuntimeElement {
  private readonly attributes: Record<string, string>;
  private readonly listeners = new Map<string, RuntimeListener[]>();
  private readonly styleValues = new Map<string, string>();
  public readonly tagName: string;

  public readonly style = {
    height: "",
    getPropertyValue: (name: string): string => this.styleValues.get(name) ?? "",
    setProperty: (name: string, value: string): void => {
      this.styleValues.set(name, value);
    },
  };

  public constructor(
    attributes: Record<string, string>,
    private readonly windowState: { scrollY: number; paletteHeight?: number; panelHeight?: number },
    public top: number,
    public height = 40,
    tagName = "div",
  ) {
    this.attributes = attributes;
    this.tagName = tagName.toUpperCase();
  }

  public scrollHeight = 2_000;
  public scrollWidth = 0;
  public clientWidth = 0;
  public className = "";
  public textContent = "";
  public innerHTML = "";
  public value = "";
  public selectionStart = 0;
  public selectionEnd = 0;
  public type = "";
  public step = "";
  public checked = false;
  public hidden = true;
  public selected = false;
  public colSpan = 0;
  public disabled = false;
  public rows: number | RuntimeElement[] = 2;
  public cells: RuntimeElement[] = [];
  public rowIndex = 0;
  public cellIndex = 0;
  public focusOptions: FocusOptions | undefined;
  public selectionRange: [number, number] | undefined;
  public parentElement: RuntimeElement | undefined;
  public readonly childElements: RuntimeElement[] = [];
  public readonly insertedElements: RuntimeElement[] = [];
  public removed = false;
  public rectProvider: (() => { top: number; height: number; bottom?: number; left?: number; width?: number }) | undefined;
  public rectReadCount = 0;

  public get childNodes(): RuntimeElement[] {
    return this.childElements;
  }

  public get children(): RuntimeElement[] {
    return this.childElements;
  }

  public get childElementCount(): number {
    return this.childElements.length;
  }

  public get firstChild(): RuntimeElement | null {
    return this.childElements[0] ?? null;
  }

  public get firstElementChild(): RuntimeElement | null {
    return this.childElements[0] ?? null;
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  public querySelector(selector: string): RuntimeElement | null {
    if (selector === ".okf-name-cell") {
      return this.childElements.find((child) => child.getAttribute("class") === "okf-name-cell") ?? null;
    }
    if (selector === "[data-okf-value-display]") {
      return this.childElements.find((child) => child.getAttribute("data-okf-value-display") !== null) ?? null;
    }
    if (selector === "[data-okf-value-cell]") {
      return this.childElements.find((child) => child.getAttribute("data-okf-value-cell") !== null) ?? null;
    }
    if (selector === '[data-okf-edit-cell="value"]') {
      return this.childElements.find((child) => child.getAttribute("data-okf-edit-cell") === "value") ?? null;
    }
    if (selector === "[data-okf-list-item-input]") {
      return this.querySelectorAll(selector)[0] ?? null;
    }
    return null;
  }

  public querySelectorAll(selector: string): RuntimeElement[] {
    const matches = (element: RuntimeElement): boolean => {
      if (selector === "[data-okf-list-item-input]") {
        return element.getAttribute("data-okf-list-item-input") !== null;
      }
      if (selector === "input, button") {
        return element.tagName === "INPUT" || element.tagName === "BUTTON";
      }
      if (selector === "th, td") {
        return element.tagName === "TH" || element.tagName === "TD";
      }
      if (selector === "button, input, textarea, select, a, span, p") {
        return ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "SPAN", "P"].includes(element.tagName);
      }
      if (selector === "table, figure, img, pre, .myst-mermaid-diagram") {
        return ["TABLE", "FIGURE", "IMG", "PRE"].includes(element.tagName)
          || element.className.split(" ").includes("myst-mermaid-diagram");
      }
      return false;
    };
    const descendants = (element: RuntimeElement): RuntimeElement[] => element.childElements
      .flatMap((child) => [
        ...(matches(child) ? [child] : []),
        ...descendants(child),
      ]);
    return descendants(this);
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  public removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  public getBoundingClientRect(): { top: number; height: number; left?: number; bottom?: number; width?: number } {
    this.rectReadCount += 1;
    if (this.rectProvider) return this.rectProvider();
    if (this.getAttribute("data-sphinx-preview-editing") === "true") {
      return { top: 0, height: 0 };
    }
    const top = this.top - this.windowState.scrollY;
    return { top, height: this.height, left: 0, bottom: top + this.height, width: 200 };
  }

  public closest(selector: string): RuntimeElement | null {
    if (selector === "a") return null;
    let current: RuntimeElement | undefined = this;
    while (current) {
      if (
        (selector === "a.okf-frontmatter-link" && current.tagName === "A"
          && current.getAttribute("class") === "okf-frontmatter-link")
        || (selector === '.okf-frontmatter-link:not([data-okf-link-status="pending"])'
          && (current.getAttribute("class") ?? "").split(" ").includes("okf-frontmatter-link")
          && current.getAttribute("data-okf-link-status") !== "pending")
        || (selector === "[data-okf-badge]" && current.getAttribute("data-okf-badge") !== null)
        || (selector === "a[data-sphinx-preview-navigation]" && current.tagName === "A"
          && current.getAttribute("data-sphinx-preview-navigation") !== null)
        || (selector === 'a[data-sphinx-preview-navigation^="okf-link:"]' && current.tagName === "A"
          && (current.getAttribute("data-sphinx-preview-navigation") ?? "").startsWith("okf-link:"))
        || (selector === "[data-okf-edit-cell]" && current.getAttribute("data-okf-edit-cell") !== null)
        || (selector === "[data-okf-description-toggle]" && current.getAttribute("data-okf-description-toggle") !== null)
        || (selector === "[data-okf-frontmatter-editor]" && current.getAttribute("data-okf-frontmatter-editor") !== null)
        || (selector === "[data-okf-frontmatter-menu]" && current.getAttribute("data-okf-frontmatter-menu") !== null)
        || (selector === "tr[data-okf-field]" && current.tagName === "TR" && current.getAttribute("data-okf-field") !== null)
        || (selector === "td, th" && ["TD", "TH"].includes(current.tagName))
        || (selector === "table" && current.tagName === "TABLE")
        || (selector === "[data-okf-row-handle]" && current.getAttribute("data-okf-row-handle") !== null)
        || (selector === "[data-okf-col-handle]" && current.getAttribute("data-okf-col-handle") !== null)
        || (selector === "ul, ol" && ["UL", "OL"].includes(current.tagName))
        || (selector === "[data-sphinx-preview-block-editor]"
          && current.getAttribute("data-sphinx-preview-block-editor") !== null)
        || (selector === "pre" && current.tagName === "PRE")
        || (selector === ".sphinx-preview-insert-point"
          && current.className.split(" ").includes("sphinx-preview-insert-point"))
        || (selector === "[data-okf-properties]" && current.getAttribute("data-okf-properties") !== null)
        || (selector === "input.myst-checkbox" && current.tagName === "INPUT"
          && current.getAttribute("class") === "myst-checkbox")
        || (selector.includes("data-sphinx-source-line") && current.getAttribute("data-sphinx-source-line") !== null)
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  public addEventListener(type: string, listener: RuntimeListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  public appendChild(child: RuntimeElement): RuntimeElement {
    child.parentElement?.removeChild(child);
    child.parentElement = this;
    this.childElements.push(child);
    if (this.tagName === "SELECT" && child.selected) this.value = child.value;
    return child;
  }

  public insertBefore(child: RuntimeElement, reference: RuntimeElement | null): RuntimeElement {
    child.parentElement?.removeChild(child);
    child.parentElement = this;
    // Inserted children sit where their parent sits (the fake has no layout of its own).
    if (child.top === 0 && child.tagName === "DIV") child.top = reference?.top ?? this.top;
    // Opt-in layout for the edition palette: it pushes what follows it down, with the content of
    // those siblings (the palette now sits in a host above the editor frame, not inside it).
    if (child.className === "sphinx-preview-edit-palette" && this.windowState.paletteHeight) {
      const push = (element: RuntimeElement): void => {
        element.top += this.windowState.paletteHeight!;
        element.childElements.forEach(push);
      };
      const at = reference ? this.childElements.indexOf(reference) : -1;
      (at < 0 ? [] : this.childElements.slice(at)).forEach(push);
    }
    // The link panel is laid out the same way, and its removal gives the height back.
    if (child.className === "sphinx-preview-link-panel" && this.windowState.panelHeight) {
      for (const sibling of this.childElements) sibling.top += this.windowState.panelHeight;
    }
    const index = reference ? this.childElements.indexOf(reference) : -1;
    if (index < 0) {
      this.childElements.push(child);
    } else {
      this.childElements.splice(index, 0, child);
    }
    return child;
  }

  public removeChild(child: RuntimeElement): RuntimeElement {
    const index = this.childElements.indexOf(child);
    if (index >= 0) this.childElements.splice(index, 1);
    child.parentElement = undefined;
    return child;
  }

  public remove(): void {
    this.removed = true;
    if (this.className === "sphinx-preview-link-panel" && this.windowState.panelHeight) {
      for (const sibling of this.parentElement?.childElements ?? []) {
        if (sibling !== this) sibling.top -= this.windowState.panelHeight;
      }
    }
    this.parentElement?.removeChild(this);
    this.onRemove?.();
  }

  public onRemove: (() => void) | undefined;
  public adjacentHtmlHandler: ((position: string, markup: string) => void) | undefined;

  public insertAdjacentHTML(position: string, markup: string): void {
    this.adjacentHtmlHandler?.(position, markup);
  }

  public contains(candidate: RuntimeElement): boolean {
    return this.childElements.some((child) => child === candidate || child.contains(candidate));
  }

  /** ChildNode.before: the node takes this element's place in its parent, at its position. */
  public before(node: RuntimeElement): void {
    node.parentElement?.removeChild(node);
    node.parentElement = this.parentElement;
    if (node.top === 0 && node.tagName === "DIV") node.top = this.top;
    const siblings = this.parentElement?.childElements;
    const index = siblings ? siblings.indexOf(this) : -1;
    if (siblings && index >= 0) siblings.splice(index, 0, node);
  }

  /** Opt-in: `nextElementSibling` answers with the last element inserted after this one. */
  public siblingsFollowInsertions = false;

  public get nextElementSibling(): RuntimeElement | null {
    return this.siblingsFollowInsertions ? (this.insertedElements.at(-1) ?? null) : null;
  }

  public insertAdjacentElement(_position: string, element: RuntimeElement): RuntimeElement {
    element.parentElement = this.parentElement;
    element.top = this.top;
    this.insertedElements.push(element);
    return element;
  }

  public focus(options?: FocusOptions): void {
    this.focusOptions = options;
    if (!options?.preventScroll) this.windowState.scrollY = this.top;
  }

  public selectionDirection = "none";

  public setSelectionRange(start: number, end: number, direction = "none"): void {
    this.selectionDirection = direction;
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionRange = [start, end];
  }

  public scrollIntoView(): void {
    this.windowState.scrollY = Math.max(0, this.top - 20);
  }

  public dispatch(type: string, event: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

export interface RuntimeHarness {
  readonly anchor: RuntimeElement;
  readonly image: RuntimeElement;
  readonly mappings: RuntimeElement[];
  readonly headings: RuntimeElement[];
  readonly stickyHeadings: RuntimeElement;
  readonly toolbar: RuntimeElement;
  readonly previewContent: RuntimeElement;
  readonly body: RuntimeElement;
  readonly observedResizeTarget: RuntimeElement | undefined;
  readonly themeButton: RuntimeElement;
  readonly refreshButton: RuntimeElement;
  readonly zoomOutButton: RuntimeElement;
  readonly zoomInButton: RuntimeElement;
  readonly widthButton: RuntimeElement;
  readonly diffButton: RuntimeElement;
  readonly sideBySideButton: RuntimeElement;
  readonly collapseButton: RuntimeElement;
  readonly moreRows: RuntimeElement;
  readonly backButton: RuntimeElement;
  readonly nextButton: RuntimeElement;
  readonly anchorButton: RuntimeElement;
  readonly editModeButton: RuntimeElement;
  readonly checkbox: RuntimeElement;
  readonly descriptionButton: RuntimeElement;
  readonly frontmatterNameCell: RuntimeElement;
  readonly frontmatterNameDisplay: RuntimeElement;
  readonly frontmatterValueCell: RuntimeElement;
  readonly frontmatterValueDisplay: RuntimeElement;
  readonly frontmatterRow: RuntimeElement;
  readonly documentElement: RuntimeElement;
  readonly createdElements: RuntimeElement[];
  readonly contentTables: RuntimeElement[];
  /** The status region the page was loaded with (null when the harness has none). */
  readonly statusRegion: RuntimeElement | null;
  /** The links of the content, as `a[data-sphinx-preview-navigation]` finds them. */
  readonly contentLinks: RuntimeElement[];
  /** The `details` elements of the content (each may carry an `open` property). */
  readonly details: RuntimeElement[];
  /** Links the fake IntersectionObserver was asked to observe (needs `intersectionObserver`). */
  readonly observedLinks: RuntimeElement[];
  /** Reports the observed link as visible, like the real observer would. */
  intersect(link: RuntimeElement): void;
  flushMicrotasks(): void;
  /** Types of the events dispatched on the document. */
  readonly dispatchedEvents: string[];
  readonly messages: Array<Record<string, unknown>>;
  readonly htmlInsertions: Array<{ position: string; markup: string }>;
  readonly frontmatterProperties: RuntimeElement;
  currentProperties(): RuntimeElement | null;
  readonly windowState: { scrollY: number; paletteHeight?: number; panelHeight?: number };
  /** The fake `window` / `document`: tests stub measurement and `execCommand` on them. */
  readonly window: Record<string, unknown>;
  readonly document: Record<string, unknown>;
  getWebviewState(): Record<string, unknown>;
  /** How many times the runtime wrote the webview state. */
  readonly setStateCalls: number;
  dispatchDocument(type: string, event: unknown): void;
  /** How many listeners the page registered on the document for an event type. */
  documentListenerCount(type: string): number;
  dispatchMessage(message: Record<string, unknown>): void;
  dispatchVisualViewportResize(): void;
  dispatchWindow(type: string, event?: unknown): void;
  setVisibilityState(state: string): void;
  flushFrames(): void;
  flushTimers(): void;
  pendingTimerCount(): number;
  triggerResizeObserver(): void;
  /**
   * Runs, in due order, the timers due within the next `ms` milliseconds of the page clock, then
   * moves the clock to that time. Timers keep their requested delay; `flushTimers` ignores it.
   */
  advanceTimers(ms: number): void;
  /** The page clock in milliseconds (moved by `advanceTimers` only). */
  now(): number;
}

export function createRuntimeHarness(configuration: Partial<{
  scrollPreviewWithEditor: boolean;
  scrollEditorWithPreview: boolean;
  markEditorSelection: boolean;
  stickyHeadingDepth: number;
  toolbarBottom: number;
  controlsHeight: number;
  tocReserve: number;
  viewportHeight: number;
  viewportWidth: number;
  firstMappedSourceLine: number;
  /** Last source line of the second mapped block (it starts at line 50). */
  secondBlockEndLine: number;
  firstMappedTop: number;
  frontmatterHeight: number;
  mapFrontmatter: boolean;
  initialState: { descriptionsCollapsed: boolean };
  initialPin: { line: number; viewportTop: number };
  initialAnchor: number;
  savedDescriptionsCollapsed: boolean;
  editingEnabled: boolean;
  emptyBody: boolean;
  propertiesMapped: boolean;
  previewStatus: string;
  requestId: number;
  savedState: Record<string, unknown>;
  frontmatterRowAttributes: Record<string, string>;
  pairedTextEditor: boolean;
  initialEditMode: boolean;
  initialPaletteMode: "strict" | "gfm" | "myst" | "full";
  initialViewPreferences: ViewPreferences;
  commentsEnabled: boolean;
  /** The reason a read-only page gives for its disabled checkboxes. */
  readOnlyReason: string;
  intersectionObserver: boolean;
  /** `navigator.platform` of the page (absent: no navigator, like a non-Apple platform). */
  platform: string;
  /**
   * True gives the page `window.performance.now()` read from the harness clock, so time-based
   * throttles follow `advanceTimers` instead of the wall clock (absent: no `performance`).
   */
  virtualClock: boolean;
  /**
   * A runtime script to run instead of the test build of the page bundle (the shipped, minified
   * file). The page carries the context as the JSON element the runtime reads.
   */
  runtimeScript: string;
}> = {}, savedThemeMode?: string, sharedThemeMode?: "current" | "dark" | "white", savedAnchorMode?: boolean): RuntimeHarness {
  const {
    firstMappedSourceLine = 1,
    secondBlockEndLine = 52,
    firstMappedTop = 0,
    frontmatterHeight = 0,
    mapFrontmatter = false,
    toolbarBottom = 0,
    controlsHeight = 0,
    tocReserve = 0,
    savedDescriptionsCollapsed,
    editingEnabled = true,
    emptyBody = false,
    propertiesMapped = false,
    previewStatus,
    savedState = {},
    frontmatterRowAttributes = {},
    intersectionObserver = false,
    platform,
    virtualClock = false,
    runtimeScript,
    ...runtimeConfiguration
  } = configuration;
  const windowState = { scrollY: 0 };
  const mappings = emptyBody ? [] : [
    ...(frontmatterHeight > 0 ? [new RuntimeElement(
      {
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-end-line": String(firstMappedSourceLine - 1),
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "1",
      },
      windowState,
      0,
      frontmatterHeight,
      "section",
    )] : []),
    new RuntimeElement(
      {
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-end-line": String(firstMappedSourceLine),
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": String(firstMappedSourceLine),
      },
      windowState,
      firstMappedTop,
    ),
    new RuntimeElement(
      {
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-end-line": String(secondBlockEndLine),
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "50",
      },
      windowState,
      500,
    ),
    new RuntimeElement(
      {
        "data-sphinx-preview-document": "file:///active.md",
        "data-sphinx-source-end-line": "100",
        "data-sphinx-source-file": "/workspace/active.md",
        "data-sphinx-source-line": "100",
      },
      windowState,
      1_000,
    ),
  ];
  const headings = [
    new RuntimeElement({}, windowState, 10, 24, "h1"),
    new RuntimeElement({}, windowState, 160, 24, "h2"),
    new RuntimeElement({}, windowState, 300, 24, "h3"),
    new RuntimeElement({}, windowState, 500, 24, "h2"),
  ];
  headings[0].textContent = "Chapter";
  headings[1].textContent = "Section";
  headings[2].textContent = "Topic";
  headings[3].textContent = "Next section";
  const image = new RuntimeElement({}, windowState, 0, 0);
  const anchor = new RuntimeElement({}, windowState, 800, 40);
  const themeButton = new RuntimeElement({ "data-theme-mode": "current" }, windowState, 0, 34);
  const refreshButton = new RuntimeElement({}, windowState, 0, 30);
  const zoomOutButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const zoomInButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const widthButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const diffButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const sideBySideButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const collapseButton = new RuntimeElement({ "aria-expanded": "true" }, windowState, 0, 30, "button");
  const moreRows = new RuntimeElement({}, windowState, 0, 60);
  const backButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const nextButton = new RuntimeElement({}, windowState, 0, 30, "button");
  const anchorButton = new RuntimeElement({}, windowState, 0, 30);
  // A read-only page keeps the Edit button, greyed with aria-disabled (core/preview/previewToolbar.ts).
  const editModeButton = new RuntimeElement(editingEnabled ? {} : { "aria-disabled": "true", title: "Editing is unavailable: this file is not in a trusted workspace", "data-tooltip": "Editing is unavailable: this file is not in a trusted workspace" }, windowState, 0, 30);
  const toolbar = new RuntimeElement({}, windowState, 12, Math.max(0, toolbarBottom - 12));
  toolbar.rectProvider = () => ({
    top: 12,
    height: toolbar.height,
    bottom: 12 + toolbar.height,
  });
  const checkbox = new RuntimeElement({
    class: "myst-checkbox",
    "data-myst-checkbox-line": "51",
    "data-myst-checkbox-column": "2",
  }, windowState, 510, 14, "input");
  if (mappings.length >= 2) mappings[mappings.length - 2].appendChild(checkbox);
  const stickyHeadings = new RuntimeElement({}, windowState, 0, 0);
  stickyHeadings.rectProvider = () => ({ top: 116, height: stickyHeadings.height, bottom: 116 + stickyHeadings.height });
  const descriptionButton = new RuntimeElement({ "data-okf-description-toggle": "" }, windowState, 0, 24, "button");
  const frontmatterRow = new RuntimeElement({
    "data-okf-editable": "true",
    "data-okf-enums": '["draft","active"]',
    "data-okf-field": "lifecycle",
    "data-okf-schema-found": "true",
    "data-okf-type": "enum",
    "data-okf-value": '"draft"',
    "data-okf-value-yaml": "draft\n",
    ...frontmatterRowAttributes,
  }, windowState, 0, 30, "tr");
  const frontmatterNameCell = new RuntimeElement({ "data-okf-edit-cell": "name" }, windowState, 0, 30, "th");
  const frontmatterNameDisplay = new RuntimeElement({ class: "okf-name-cell" }, windowState, 0, 30, "span");
  const frontmatterValueCell = new RuntimeElement({
    "data-okf-edit-cell": "value",
    "data-okf-value-cell": "true",
  }, windowState, 0, 30, "td");
  const frontmatterValueDisplay = new RuntimeElement({ "data-okf-value-display": "true" }, windowState, 0, 30, "span");
  const frontmatterProperties = new RuntimeElement({
    "data-okf-properties": "true",
    "data-okf-available-keys": '["status","owner"]',
    "data-okf-available-fields": '[{"name":"status","fieldType":"enum","enums":["draft","active"],"defaultValue":"draft"},{"name":"owner","fieldType":"text","enums":null,"defaultValue":""}]',
    ...(mapFrontmatter ? {
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": "1",
    } : {}),
  }, windowState, 0, mapFrontmatter ? 30 : 0, "section");
  const frontmatterTable = new RuntimeElement({}, windowState, 0, 0, "table");
  const frontmatterBody = new RuntimeElement({}, windowState, 0, 0, "tbody");
  frontmatterNameCell.appendChild(frontmatterNameDisplay);
  frontmatterValueCell.appendChild(frontmatterValueDisplay);
  frontmatterRow.appendChild(frontmatterNameCell);
  frontmatterRow.appendChild(frontmatterValueCell);
  frontmatterProperties.appendChild(frontmatterTable);
  frontmatterTable.appendChild(frontmatterBody);
  frontmatterBody.appendChild(frontmatterRow);
  const documentElement = new RuntimeElement({}, windowState, 0);
  const body = new RuntimeElement({}, windowState, 0, 0, "body");
  const previewContent = new RuntimeElement({}, windowState, 0, 1, "main");
  // The properties section as the runtime finds it in the content. Markup inserted through
  // insertAdjacentHTML becomes a new section whose edit cells are counted from the markup.
  let currentProperties: RuntimeElement | null = frontmatterProperties;
  let pendingReplacement: RuntimeElement | undefined;
  const htmlInsertions: Array<{ position: string; markup: string }> = [];
  const makeSection = (markup: string): RuntimeElement => {
    const section = new RuntimeElement({ "data-okf-properties": "true" }, windowState, 0, 0, "section");
    section.innerHTML = markup;
    for (let index = 0; index < (markup.match(/data-okf-edit-cell/gu) ?? []).length; index += 1) {
      section.appendChild(new RuntimeElement({ "data-okf-edit-cell": "value" }, windowState, 0, 30, "td"));
    }
    section.adjacentHtmlHandler = (position, inserted) => {
      htmlInsertions.push({ position, markup: inserted });
      if (position === "beforebegin") pendingReplacement = makeSection(inserted);
    };
    section.onRemove = () => {
      if (currentProperties === section) currentProperties = pendingReplacement ?? null;
      pendingReplacement = undefined;
    };
    return section;
  };
  frontmatterProperties.adjacentHtmlHandler = (position, markup) => {
    htmlInsertions.push({ position, markup });
    if (position === "beforebegin") pendingReplacement = makeSection(markup);
  };
  frontmatterProperties.onRemove = () => {
    if (currentProperties === frontmatterProperties) currentProperties = pendingReplacement ?? null;
    pendingReplacement = undefined;
  };
  previewContent.querySelector = (selector: string): RuntimeElement | null => (
    selector === "[data-okf-properties]" ? currentProperties : null
  );
  previewContent.adjacentHtmlHandler = (position, markup) => {
    htmlInsertions.push({ position, markup });
    if (position === "afterbegin") currentProperties = makeSection(markup);
  };
  const statusElement = previewStatus
    ? new RuntimeElement({ "data-sphinx-preview-status": previewStatus }, windowState, 0, 0, "aside")
    : null;
  const createdElements: RuntimeElement[] = [];
  const contentTables: RuntimeElement[] = [];
  const contentLinks: RuntimeElement[] = [];
  const details: RuntimeElement[] = [];
  const observedLinks: RuntimeElement[] = [];
  const dispatchedEvents: string[] = [];
  const microtaskQueue: Array<() => void> = [];
  let intersectionCallback: ((entries: Array<{ isIntersecting: boolean; target: RuntimeElement }>) => void) | undefined;
  const messages: Array<Record<string, unknown>> = [];
  let setStateCalls = 0;
  let webviewState: Record<string, unknown> = {
    ...(savedDescriptionsCollapsed !== undefined
      ? { documentId: "file:///active.md", descriptionsCollapsed: savedDescriptionsCollapsed } : {}),
    ...(savedThemeMode ? { previewThemeMode: savedThemeMode } : {}),
    ...(savedAnchorMode !== undefined ? { anchorToEditor: savedAnchorMode } : {}),
    ...savedState,
  };
  const windowListeners = new Map<string, RuntimeListener[]>();
  const documentListeners = new Map<string, RuntimeListener[]>();
  const viewportListeners: RuntimeListener[] = [];
  const frameQueue: Array<() => void> = [];
  const timerQueue = new Map<number, () => void>();
  const timerDue = new Map<number, number>();
  let clock = 0;
  let nextTimerId = 1;
  let visibilityState = "visible";
  let resizeObserverCallback: (() => void) | undefined;
  let observedResizeTarget: RuntimeElement | undefined;

  const addListener = (
    listenerMap: Map<string, RuntimeListener[]>,
    type: string,
    listener: RuntimeListener,
  ): void => {
    const listeners = listenerMap.get(type) ?? [];
    listeners.push(listener);
    listenerMap.set(type, listeners);
  };
  const dispatch = (
    listenerMap: Map<string, RuntimeListener[]>,
    type: string,
    event: unknown,
  ): void => {
    for (const listener of listenerMap.get(type) ?? []) {
      listener(event);
      if ((event as { immediatePropagationStopped?: boolean } | undefined)?.immediatePropagationStopped) break;
    }
  };

  const window = {
    // Reads a pasted file synchronously: the test file carries its data URL.
    FileReader: class {
      public result: unknown;
      public onload?: () => void;
      public onerror?: () => void;
      public readAsDataURL(file: { dataUrl?: string }): void {
        if (file.dataUrl === undefined) this.onerror?.();
        else {
          this.result = file.dataUrl;
          this.onload?.();
        }
      }
    },
    getComputedStyle: () => ({
      getPropertyValue: (name: string): string => name === "--sphinx-preview-controls-height"
        ? String(controlsHeight) + "px"
        : name === "--sphinx-preview-toc-reserve" ? String(tocReserve) + "px" : "",
    }),
    get scrollY(): number {
      return windowState.scrollY;
    },
    innerHeight: configuration.viewportHeight ?? 100,
    innerWidth: configuration.viewportWidth ?? 360,
    visualViewport: {
      addEventListener: (type: string, listener: RuntimeListener): void => {
        if (type === "resize") {
          viewportListeners.push(listener);
        }
      },
    },
    addEventListener: (type: string, listener: RuntimeListener): void => {
      addListener(windowListeners, type, listener);
    },
    requestAnimationFrame: (callback: () => void): number => {
      frameQueue.push(callback);
      return frameQueue.length;
    },
    setTimeout: (callback: () => void, _delay?: number): number => {
      const id = nextTimerId;
      nextTimerId += 1;
      timerQueue.set(id, callback);
      timerDue.set(id, clock + Math.max(0, Number(_delay) || 0));
      return id;
    },
    clearTimeout: (id: number | undefined): void => {
      if (id !== undefined) {
        timerQueue.delete(id);
        timerDue.delete(id);
      }
    },
    ...(virtualClock ? { performance: { now: (): number => clock } } : {}),
    scrollTo: ({ top }: { top: number }): void => {
      windowState.scrollY = top;
    },
    queueMicrotask: (callback: () => void): void => {
      microtaskQueue.push(callback);
    },
    ...(intersectionObserver ? {
      IntersectionObserver: class {
        public constructor(callback: (entries: Array<{ isIntersecting: boolean; target: RuntimeElement }>) => void) {
          intersectionCallback = callback;
        }

        public observe(target: RuntimeElement): void {
          observedLinks.push(target);
        }

        public unobserve(): void {}

        public disconnect(): void {}
      },
    } : {}),
  };
  const document = {
    get visibilityState(): string {
      return visibilityState;
    },
    body,
    documentElement,
    getElementById: (id: string): RuntimeElement | null => (
      id === "section" || id === "%41" ? anchor
        : id === "sphinx-myst-preview-content" ? previewContent
          : null
    ),
    querySelector: (selector: string): RuntimeElement | null => {
      if (selector === "[data-sphinx-preview-theme-toggle]") return themeButton;
      if (selector === "[data-sphinx-preview-refresh]") return refreshButton;
      if (selector === "[data-sphinx-preview-zoom-out]") return zoomOutButton;
      if (selector === "[data-sphinx-preview-zoom-in]") return zoomInButton;
      if (selector === "[data-sphinx-preview-width-toggle]") return widthButton;
      if (selector === "[data-sphinx-preview-diff-toggle]") return diffButton;
      if (selector === "[data-sphinx-preview-sbs-toggle]") return sideBySideButton;
      if (selector === "[data-sphinx-preview-toolbar-collapse]") return collapseButton;
      if (selector === "[data-sphinx-preview-toolbar-more]") return moreRows;
      if (selector === "[data-sphinx-preview-back]") return backButton;
      if (selector === "[data-sphinx-preview-next]") return nextButton;
      if (selector === "[data-sphinx-preview-anchor]") return anchorButton;
      if (selector === "[data-sphinx-preview-edit-toggle]") return editModeButton;
      if (selector === "[data-sphinx-preview-toolbar]") return toolbar;
      if (selector === "[data-sphinx-preview-sticky-headings]") return stickyHeadings;
      if (selector === "[data-sphinx-preview-status]") {
        // A status region the runtime built replaces the one of the page.
        return body.childElements.find((child) => child.getAttribute("data-sphinx-preview-status") !== null)
          ?? (statusElement && !statusElement.removed ? statusElement : null);
      }
      if (selector === "tr[data-okf-field].okf-error, tr[data-okf-field].okf-warning, tr[data-okf-field].okf-info") {
        return (frontmatterRow.getAttribute("class") ?? "").split(" ")
          .some((name) => ["okf-error", "okf-warning", "okf-info"].includes(name)) ? frontmatterRow : null;
      }
      return null;
    },
    addEventListener: (type: string, listener: RuntimeListener): void => {
      addListener(documentListeners, type, listener);
    },
    createElement: (tagName: string): RuntimeElement => {
      const element = new RuntimeElement({}, windowState, 0, 0, tagName);
      createdElements.push(element);
      return element;
    },
    dispatchEvent: (event: { type: string }): boolean => {
      dispatchedEvents.push(event.type);
      return true;
    },
    querySelectorAll: (selector: string): RuntimeElement[] => (
      selector === "img" ? [image]
        : selector === "input.myst-checkbox" ? [checkbox]
        : selector === "[data-okf-description-toggle]" ? [descriptionButton]
        : selector === ".okf-info-row th[colspan]" ? []
        : selector === "#sphinx-myst-preview-content table" ? [frontmatterTable, ...contentTables]
        : selector === "[data-okf-edit-cell]" ? (currentProperties === frontmatterProperties
          ? [frontmatterNameCell, frontmatterValueCell]
          : currentProperties?.childElements ?? [])
        : selector === "tr[data-okf-field]" ? [frontmatterRow]
          : selector === "details" ? details
            : selector === "a[data-sphinx-preview-navigation]" ? contentLinks
            : selector === "h1, h2, h3, h4, h5, h6" ? headings
            : propertiesMapped ? [frontmatterProperties, ...mappings] : mappings
    ),
  };
  class ResizeObserver {
    public constructor(callback: () => void) {
      resizeObserverCallback = callback;
    }

    public observe(target: RuntimeElement): void {
      observedResizeTarget = target;
    }
  }
  const context = {
    acquireVsCodeApi: () => ({
      getState: () => webviewState,
      postMessage: (message: Record<string, unknown>): void => {
        messages.push(message);
      },
      setState: (state: Record<string, unknown>): void => {
        setStateCalls += 1;
        webviewState = state;
      },
    }),
    document,
    Element: RuntimeElement,
    ...(platform === undefined ? {} : { navigator: { platform } }),
    ResizeObserver,
    CustomEvent: class {
      public constructor(public readonly type: string) {}
    },
    window,
  };
  const runtimeContext = {
    ...HARNESS_PAGE,
    activeSourceFile: "/workspace/active.md",
    ...(sharedThemeMode ? { previewThemeMode: sharedThemeMode } : {}),
    ...runtimeConfiguration,
  };
  // The boot context is the JSON element the runtime reads first (src/page/bootContext.ts).
  const pageQuerySelector = document.querySelector;
  document.querySelector = (selector: string): RuntimeElement | null => {
    if (selector === `script[${RUNTIME_CONTEXT_ATTRIBUTE}]`) {
      const contextElement = new RuntimeElement({ [RUNTIME_CONTEXT_ATTRIBUTE]: "" }, windowState, 0, 0, "script");
      contextElement.textContent = serializeRuntimeContext(runtimeContext);
      return contextElement;
    }
    return pageQuerySelector(selector);
  };
  vm.runInNewContext(runtimeScript ?? pageRuntimeScript(), context);

  return {
    anchor,
    image,
    mappings,
    headings,
    stickyHeadings,
    descriptionButton,
    previewContent,
    body,
    observedResizeTarget,
    toolbar,
    themeButton,
    refreshButton,
    zoomOutButton,
    zoomInButton,
    widthButton,
    diffButton,
    sideBySideButton,
    collapseButton,
    moreRows,
    backButton,
    nextButton,
    anchorButton,
    editModeButton,
    checkbox,
    frontmatterNameCell,
    frontmatterNameDisplay,
    frontmatterValueCell,
    frontmatterValueDisplay,
    frontmatterRow,
    documentElement,
    createdElements,
    contentTables,
    statusRegion: statusElement,
    contentLinks,
    details,
    observedLinks,
    intersect: (link: RuntimeElement) => intersectionCallback?.([{ isIntersecting: true, target: link }]),
    flushMicrotasks: () => {
      for (let round = 0; microtaskQueue.length > 0; round += 1) {
        assert.ok(round < 100, "Webview microtasks did not settle");
        microtaskQueue.splice(0).forEach((callback) => callback());
      }
    },
    dispatchedEvents,
    messages,
    htmlInsertions,
    currentProperties: () => currentProperties,
    frontmatterProperties,
    windowState,
    window,
    document,
    getWebviewState: () => webviewState,
    get setStateCalls(): number {
      return setStateCalls;
    },
    dispatchDocument: (type, event) => dispatch(documentListeners, type, event),
    documentListenerCount: (type) => documentListeners.get(type)?.length ?? 0,
    dispatchMessage: (message) => dispatch(windowListeners, "message", { data: message }),
    dispatchVisualViewportResize: () => {
      for (const listener of viewportListeners) {
        listener({});
      }
    },
    dispatchWindow: (type, event = {}) => dispatch(windowListeners, type, event),
    setVisibilityState: (state: string) => {
      visibilityState = state;
    },
    flushFrames: () => {
      for (let frame = 0; frameQueue.length > 0; frame += 1) {
        assert.ok(frame < 100, "Webview animation frames did not settle");
        const callbacks = frameQueue.splice(0);
        for (const callback of callbacks) {
          callback();
        }
      }
    },
    flushTimers: () => {
      for (let round = 0; timerQueue.size > 0; round += 1) {
        assert.ok(round < 100, "Webview timers did not settle");
        const callbacks = [...timerQueue.values()];
        timerQueue.clear();
        timerDue.clear();
        for (const callback of callbacks) {
          callback();
        }
      }
    },
    pendingTimerCount: () => timerQueue.size,
    triggerResizeObserver: () => resizeObserverCallback?.(),
    advanceTimers: (ms: number) => {
      const target = clock + ms;
      for (let round = 0; ; round += 1) {
        assert.ok(round < 1_000, "Webview timers did not settle");
        let nextId: number | undefined;
        for (const id of timerQueue.keys()) {
          const due = timerDue.get(id) ?? clock;
          if (due <= target && (nextId === undefined || due < (timerDue.get(nextId) ?? clock))) nextId = id;
        }
        if (nextId === undefined) break;
        const callback = timerQueue.get(nextId)!;
        clock = Math.max(clock, timerDue.get(nextId) ?? clock);
        timerQueue.delete(nextId);
        timerDue.delete(nextId);
        callback();
      }
      clock = target;
    },
    now: () => clock,
  };
}
