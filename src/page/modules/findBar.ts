import {
  compileFind,
  expandReplacement,
  MAX_FIND_MATCHES,
  occurrenceStarts,
  type FindOptions,
} from "../../core/find/findMatches";
import { collectTextBlocks, findInBlocks, type PageMatch, type TextBlock } from "./findIndex";

/** The source block a rendered text block belongs to, when its text can be edited from the preview. */
export interface FindSourceBlock {
  readonly line: number;
  readonly endLine: number;
  /** The mapped block's element: matches in it share their occurrence counts. */
  readonly element: Element;
}

/** What the find bar needs from the page. */
export interface FindHooks {
  /** The root of the rendered content. */
  content(): Element | null;
  /** Runs at the start of each search, before the first `sourceBlockOf`. */
  prepare(): void;
  /** The source block of a rendered element, or undefined when its text cannot be replaced from the preview. */
  sourceBlockOf(element: Element): FindSourceBlock | undefined;
  /** Why replacing is not possible now (read-only preview, an open editor), or undefined. */
  replaceBlockedReason(): string | undefined;
  /** Unfolds the folded sections that hold `target`; true when the layout changed. */
  reveal(target: Element): boolean;
  /** Sends a host request and calls back with its answer. */
  ask(type: string, payload: Record<string, unknown>, done: (result: FindReplaceAnswer) => void): void;
  /** Runs after the layout changed. */
  onLayoutChange(): void;
  /** Paints the matches (all, then the current one); an empty list clears the paint. */
  paint(ranges: readonly Range[], current: Range | undefined): void;
  /** A DOM range over one match. */
  createRange(match: PageMatch): Range;
  /** The text the reader selected, to start a search with. */
  selectedText(): string;
  /**
   * False when the element that had the focus before the bar opened must not get it back on close:
   * the text box of an editor whose final save is on its way (the keys typed there would be lost).
   * Absent: the focus always goes back.
   */
  canRestoreFocus?(target: Element): boolean;
}

/** The host's answer to a replace request. */
export interface FindReplaceAnswer {
  ok?: boolean;
  reason?: string;
  replaced?: number;
  skipped?: number;
}

/** The find bar of a page. */
export interface FindBar {
  open(options?: { replace?: boolean }): void;
  close(): void;
  isOpen(): boolean;
  /** Searches again (after the content changed). */
  refresh(): void;
  next(): void;
  previous(): void;
}

const REPLACE_ALL_LIMIT = 5000;
const MAX_FIND_REPLACEMENT = 2000;
/** How long the bar waits after a search before it asks the host which matches it would skip. */
const DRY_RUN_DELAY_MS = 150;

const ICON_CASE = '<path d="M3 17 7 7l4 10M4.4 14h5.2M14 13.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0M20 10.5V17"></path>';
const ICON_WORD = '<path d="M3 17V9M3 13h5v4M8 13V9M13 9v8M13 13h3a2 2 0 0 0 0-4h-3M4 20h16"></path>';
const ICON_REGEX = '<path d="M5 17.5h.01M12 5v9M8.5 7l7 5M15.5 7l-7 5"></path>';
const ICON_PREVIOUS = '<path d="m6 15 6-6 6 6"></path>';
const ICON_NEXT = '<path d="m6 9 6 6 6-6"></path>';
const ICON_CLOSE = '<path d="m6 6 12 12M18 6 6 18"></path>';
const ICON_REPLACE = '<path d="m9 6 6 6-6 6"></path>';
const ICON_REPLACE_ONE = '<path d="M4 7h9a4 4 0 0 1 0 8H6m0 0 3-3m-3 3 3 3M16 5v4M18 7h-4"></path>';
const ICON_REPLACE_ALL = '<path d="M3 6h9M3 12h6M3 18h9m4-12 3 3-3 3m3-3h-6m0 9 3-3-3-3m3 3h-6"></path>';

const isMac = (window: Window): boolean => /Mac|iPhone|iPad/u.test(window.navigator?.platform ?? "");

/** A field that takes typed text: an editor's text box, a table cell, a frontmatter field. */
const isEditingField = (target: Element | undefined): boolean => target !== undefined
  && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || (target as HTMLElement).isContentEditable === true);

/**
 * The text selected inside a text field (`document.getSelection()` does not see into one), or
 * undefined when `element` is not a text field or nothing is selected in it.
 */
const fieldSelection = (element: Element | null): string | undefined => {
  const field = element as HTMLInputElement | null;
  if (!field || (field.tagName !== "TEXTAREA" && field.tagName !== "INPUT")) return undefined;
  const { selectionStart: start, selectionEnd: end, value } = field;
  if (typeof start !== "number" || typeof end !== "number" || end <= start || typeof value !== "string") return undefined;
  return value.slice(start, end);
};

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-010
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-011
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-012
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-014
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-131
/**
 * The find bar: Cmd/Ctrl+F opens it over the preview, the matches in the rendered text are painted,
 * Enter / Shift+Enter / F3 walk them and Escape closes it. The replace row asks the host to edit the
 * matched source spans only (see `core/edits/findReplace.ts`). While the replace row is open, the
 * bar asks the host for a dry run of Replace all after each search, so its note counts the matches
 * that cannot be replaced before any click. Nothing is written to the document by the search itself.
 */
export function installFindBar(
  document: Document,
  window: Window & typeof globalThis,
  hooks: FindHooks,
): FindBar {
  const options: { -readonly [K in keyof FindOptions]: FindOptions[K] } = { matchCase: false, wholeWord: false, regex: false };
  let bar: HTMLElement | undefined;
  let findInput: HTMLInputElement;
  let replaceInput: HTMLInputElement;
  let countLabel: HTMLElement;
  let note: HTMLElement;
  let replaceRow: HTMLElement;
  let replaceToggle: HTMLButtonElement;
  let replaceOne: HTMLButtonElement;
  let replaceAll: HTMLButtonElement;
  let matches: PageMatch[] = [];
  let ranges: Range[] = [];
  let current = -1;
  let opened = false;
  let restoreFocus: Element | null = null;
  /** The index the next search after a replacement starts on. */
  let desiredIndex: number | undefined;
  let busy = false;
  let message = "";
  /** The matches the host's last dry run of Replace all would skip (0 until it answers). */
  let hostSkipped = 0;
  /** Bumped by each search: a dry-run answer of an older one is ignored. */
  let dryRunGeneration = 0;
  let dryRunTimer: number | undefined;

  const mac = isMac(window);
  const modifier = mac ? "Cmd" : "Ctrl";

  const button = (name: string, label: string, icon: string, pressed?: boolean): HTMLButtonElement => {
    const element = document.createElement("button");
    element.setAttribute("type", "button");
    element.setAttribute("data-find-" + name, "");
    element.setAttribute("aria-label", label);
    element.setAttribute("title", label);
    if (pressed !== undefined) element.setAttribute("aria-pressed", String(pressed));
    element.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg>`;
    return element;
  };

  const input = (name: string, label: string): HTMLInputElement => {
    const element = document.createElement("input");
    element.setAttribute("type", "text");
    element.setAttribute("data-find-" + name, "");
    element.setAttribute("aria-label", label);
    element.setAttribute("placeholder", label);
    element.setAttribute("spellcheck", "false");
    element.setAttribute("autocomplete", "off");
    return element;
  };

  /** The source block of each text block of the last search (undefined: not replaceable from the preview). */
  let sourceOf = new Map<TextBlock, FindSourceBlock | undefined>();
  /** The text blocks of each source block, in document order. */
  let groups = new Map<Element, TextBlock[]>();

  const unreplaceableCount = (): number => matches.filter((match) => sourceOf.get(match.block) === undefined).length;

  const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "es"}`;

  const replaceRowOpen = (): boolean => bar !== undefined && replaceRow.hidden === false;

  const updateNote = (): void => {
    if (!bar) return;
    if (message !== "") {
      note.textContent = message;
      return;
    }
    const blocked = hooks.replaceBlockedReason();
    if (blocked !== undefined) {
      note.textContent = blocked;
      return;
    }
    const skipped = unreplaceableCount() + (replaceRowOpen() ? hostSkipped : 0);
    note.textContent = skipped === 0 ? "" : `${plural(skipped, "match")} cannot be replaced from the preview`;
  };

  const updateReplaceState = (): void => {
    if (!bar) return;
    const blocked = hooks.replaceBlockedReason();
    for (const element of [replaceOne, replaceAll, replaceToggle]) {
      const disabled = blocked !== undefined && element === replaceToggle;
      if (disabled) {
        element.setAttribute("aria-disabled", "true");
        element.setAttribute("title", blocked as string);
      } else {
        element.removeAttribute("aria-disabled");
      }
    }
    const off = blocked !== undefined || matches.length === 0 || busy;
    for (const element of [replaceOne, replaceAll]) {
      if (off) {
        element.setAttribute("aria-disabled", "true");
        if (blocked !== undefined) element.setAttribute("title", blocked);
      } else {
        element.removeAttribute("aria-disabled");
      }
    }
    if (blocked === undefined) {
      replaceOne.setAttribute("title", `Replace (Enter in the replace field)`);
      replaceAll.setAttribute("title", `Replace all (${modifier}+Alt+Enter)`);
      replaceToggle.setAttribute("title", "Toggle replace");
    }
    replaceInput.disabled = blocked !== undefined;
  };

  const setCount = (text: string, invalid = false): void => {
    countLabel.textContent = text;
    findInput.setAttribute("aria-invalid", invalid ? "true" : "false");
    if (invalid) findInput.setAttribute("title", text);
    else findInput.removeAttribute("title");
  };

  const paint = (): void => {
    ranges = matches.map((match) => hooks.createRange(match));
    hooks.paint(ranges, ranges[current]);
  };

  const scrollToCurrent = (): void => {
    const match = matches[current];
    if (!match) return;
    const target = match.startNode.parentElement ?? match.block.element;
    if (hooks.reveal(target)) hooks.onLayoutChange();
    const range = ranges[current];
    const rect = range?.getBoundingClientRect?.();
    const viewport = window.innerHeight;
    if (!rect || rect.height === 0 && rect.top === 0 && rect.bottom === 0) {
      target.scrollIntoView?.({ block: "center" });
    } else if (rect.top < 70 || rect.bottom > viewport - 20) {
      target.scrollIntoView?.({ block: "center" });
    }
  };

  const showCurrent = (): void => {
    if (matches.length === 0) return;
    setCount(`${current + 1} of ${matches.length >= MAX_FIND_MATCHES ? MAX_FIND_MATCHES + "+" : matches.length}`);
    // Reveal first: a folded match has no layout until its section is open.
    const match = matches[current]!;
    if (hooks.reveal(match.startNode.parentElement ?? match.block.element)) hooks.onLayoutChange();
    paint();
    scrollToCurrent();
  };

  const findMatches = (keepIndex: boolean): void => {
    if (!bar) return;
    const previous = current;
    const compiled = compileFind(findInput.value, options);
    matches = [];
    ranges = [];
    current = -1;
    if (compiled === undefined) {
      hooks.paint([], undefined);
      setCount("");
      updateNote();
      updateReplaceState();
      return;
    }
    if ("error" in compiled) {
      hooks.paint([], undefined);
      setCount(compiled.error, true);
      updateNote();
      updateReplaceState();
      return;
    }
    hooks.prepare();
    const root = hooks.content();
    const blocks = root ? collectTextBlocks(root) : [];
    sourceOf = new Map();
    groups = new Map();
    for (const block of blocks) {
      const source = hooks.sourceBlockOf(block.element);
      sourceOf.set(block, source);
      if (!source) continue;
      const group = groups.get(source.element);
      if (group) group.push(block);
      else groups.set(source.element, [block]);
    }
    matches = findInBlocks(blocks, compiled.pattern, MAX_FIND_MATCHES);
    if (matches.length === 0) {
      hooks.paint([], undefined);
      setCount("No results");
      updateNote();
      updateReplaceState();
      return;
    }
    const wanted = desiredIndex ?? (keepIndex ? previous : 0);
    desiredIndex = undefined;
    current = Math.min(Math.max(wanted, 0), matches.length - 1);
    showCurrent();
    updateNote();
    updateReplaceState();
  };

  /** Forgets the host's skipped count and drops the planned or pending dry run. */
  const cancelDryRun = (): void => {
    dryRunGeneration += 1;
    hostSkipped = 0;
    if (dryRunTimer !== undefined) window.clearTimeout(dryRunTimer);
    dryRunTimer = undefined;
  };

  /**
   * With the replace row open and matches on the page, asks the host 150 ms later to plan Replace
   * all without applying it; its skipped count joins the note. A refusal keeps the page's count.
   */
  const scheduleDryRun = (): void => {
    cancelDryRun();
    if (!opened || !replaceRowOpen() || matches.length === 0 || hooks.replaceBlockedReason() !== undefined) return;
    const generation = dryRunGeneration;
    dryRunTimer = window.setTimeout(() => {
      dryRunTimer = undefined;
      if (generation !== dryRunGeneration || busy) return;
      // The counts do not depend on the replacement text: the dry run sends none, so a long one
      // (refused only at the click) does not stop the announcement.
      const items = itemsFor(matches, false);
      if (items.length === 0 || items.length > REPLACE_ALL_LIMIT) return;
      hooks.ask("previewFindReplace", { items, dryRun: true }, (answer) => {
        if (generation !== dryRunGeneration || answer.ok !== true) return;
        hostSkipped = answer.skipped ?? 0;
        updateNote();
      });
    }, DRY_RUN_DELAY_MS);
  };

  const search = (keepIndex: boolean): void => {
    cancelDryRun();
    findMatches(keepIndex);
    scheduleDryRun();
  };

  const move = (step: number): void => {
    if (matches.length === 0) return;
    current = (current + step + matches.length) % matches.length;
    showCurrent();
  };

  const syncToggles = (): void => {
    if (!bar) return;
    bar.querySelector("[data-find-case]")?.setAttribute("aria-pressed", String(options.matchCase));
    bar.querySelector("[data-find-word]")?.setAttribute("aria-pressed", String(options.wholeWord));
    bar.querySelector("[data-find-regex]")?.setAttribute("aria-pressed", String(options.regex));
  };

  const toggleOption = (name: keyof FindOptions): void => {
    options[name] = !options[name];
    syncToggles();
    message = "";
    search(false);
  };

  const setReplaceOpen = (open: boolean): void => {
    replaceRow.hidden = !open;
    replaceToggle.setAttribute("aria-expanded", String(open));
    bar?.setAttribute("data-replace", open ? "open" : "closed");
    if (open) scheduleDryRun();
    else cancelDryRun();
    updateNote();
    updateReplaceState();
  };

  /**
   * Turns matches into the items of the host request: where they are and what they become (an
   * empty replacement without `withReplacement`, for a dry run).
   */
  const itemsFor = (selected: readonly PageMatch[], withReplacement = true): Array<Record<string, unknown>> => {
    const items: Array<Record<string, unknown>> = [];
    const compiled = compileFind(findInput.value, options);
    const regex = options.regex && compiled !== undefined && !("error" in compiled);
    for (const match of selected) {
      const source = sourceOf.get(match.block);
      if (!source) continue;
      // The k-th occurrence of the matched text among all the rendered text of the source block.
      let before = 0;
      let total = 0;
      for (const block of groups.get(source.element) ?? []) {
        const starts = occurrenceStarts(block.text, match.text);
        if (block === match.block) before = total + starts.indexOf(match.match.start);
        total += starts.length;
      }
      items.push({
        line: source.line,
        endLine: source.endLine,
        find: match.text,
        occurrence: before,
        occurrences: total,
        replacement: withReplacement ? expandReplacement(replaceInput.value, match.match, regex) : "",
      });
    }
    return items;
  };

  const runReplace = (selected: readonly PageMatch[], afterIndex: number): void => {
    const blocked = hooks.replaceBlockedReason();
    if (blocked !== undefined) {
      message = blocked;
      updateNote();
      return;
    }
    if (busy || selected.length === 0) return;
    const items = itemsFor(selected);
    const pageSkipped = selected.length - items.length;
    if (items.length === 0 || items.length > REPLACE_ALL_LIMIT) {
      message = items.length === 0
        ? `${plural(pageSkipped, "match")} cannot be replaced from the preview`
        : `Too many matches to replace at once (${items.length}). Narrow the search.`;
      updateNote();
      return;
    }
    if (items.some((item) => (item.replacement as string).length > MAX_FIND_REPLACEMENT)) {
      message = "The replacement text is too long.";
      updateNote();
      return;
    }
    busy = true;
    message = "Replacing...";
    updateNote();
    updateReplaceState();
    hooks.ask("previewFindReplace", { items }, (answer) => {
      busy = false;
      if (answer.ok === true) {
        const replaced = answer.replaced ?? 0;
        const skipped = (answer.skipped ?? 0) + pageSkipped;
        message = `Replaced ${replaced} ${replaced === 1 ? "match" : "matches"}`
          + (skipped > 0 ? `; ${plural(skipped, "match")} cannot be replaced from the preview` : "");
        desiredIndex = afterIndex;
      } else {
        message = answer.reason ?? "The replacement failed.";
      }
      updateNote();
      updateReplaceState();
    });
  };

  const replaceCurrent = (): void => {
    const match = matches[current];
    if (!match) return;
    // A replacement that matches the query again must not be replaced a second time by the next click.
    const compiled = compileFind(findInput.value, options);
    const again = compiled !== undefined && !("error" in compiled)
      && new RegExp(compiled.pattern.source, compiled.pattern.flags).test(replaceInput.value);
    runReplace([match], again ? current + 1 : current);
  };

  const replaceEverything = (): void => runReplace(matches, 0);

  const build = (): void => {
    bar = document.createElement("div");
    bar.setAttribute("data-sphinx-preview-find", "");
    bar.setAttribute("role", "search");
    bar.setAttribute("aria-label", "Find in preview");
    bar.setAttribute("data-replace", "closed");
    const findRow = document.createElement("div");
    findRow.setAttribute("data-find-row", "find");
    replaceToggle = button("toggle-replace", "Toggle replace", ICON_REPLACE);
    replaceToggle.setAttribute("aria-expanded", "false");
    findInput = input("input", "Find");
    const caseButton = button("case", `Match case (Alt+C)`, ICON_CASE, false);
    const wordButton = button("word", `Match whole word (Alt+W)`, ICON_WORD, false);
    const regexButton = button("regex", `Use regular expression (Alt+R)`, ICON_REGEX, false);
    countLabel = document.createElement("span");
    countLabel.setAttribute("data-find-count", "");
    countLabel.setAttribute("role", "status");
    countLabel.setAttribute("aria-live", "polite");
    const previousButton = button("prev", "Previous match (Shift+Enter)", ICON_PREVIOUS);
    const nextButton = button("next", "Next match (Enter)", ICON_NEXT);
    const closeButton = button("close", "Close (Escape)", ICON_CLOSE);
    for (const element of [replaceToggle, findInput, caseButton, wordButton, regexButton, countLabel,
      previousButton, nextButton, closeButton]) findRow.appendChild(element);
    replaceRow = document.createElement("div");
    replaceRow.setAttribute("data-find-row", "replace");
    replaceRow.hidden = true;
    replaceInput = input("replace-input", "Replace");
    replaceOne = button("replace", "Replace", ICON_REPLACE_ONE);
    replaceAll = button("replace-all", "Replace all", ICON_REPLACE_ALL);
    for (const element of [replaceInput, replaceOne, replaceAll]) replaceRow.appendChild(element);
    note = document.createElement("div");
    note.setAttribute("data-find-note", "");
    note.setAttribute("role", "status");
    note.setAttribute("aria-live", "polite");
    bar.appendChild(findRow);
    bar.appendChild(replaceRow);
    bar.appendChild(note);
    bar.hidden = true;
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (toolbar?.parentNode) toolbar.parentNode.insertBefore(bar, toolbar.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);

    findInput.addEventListener("input", () => {
      message = "";
      desiredIndex = undefined;
      search(false);
    });
    replaceInput.addEventListener("input", () => {
      message = "";
      updateNote();
    });
    caseButton.addEventListener("click", () => toggleOption("matchCase"));
    wordButton.addEventListener("click", () => toggleOption("wholeWord"));
    regexButton.addEventListener("click", () => toggleOption("regex"));
    previousButton.addEventListener("click", () => move(-1));
    nextButton.addEventListener("click", () => move(1));
    closeButton.addEventListener("click", () => api.close());
    replaceToggle.addEventListener("click", () => {
      if (replaceToggle.getAttribute("aria-disabled") === "true") {
        message = hooks.replaceBlockedReason() ?? "";
        updateNote();
        return;
      }
      setReplaceOpen(replaceRow.hidden !== false);
    });
    replaceOne.addEventListener("click", () => {
      if (replaceOne.getAttribute("aria-disabled") !== "true") replaceCurrent();
    });
    replaceAll.addEventListener("click", () => {
      if (replaceAll.getAttribute("aria-disabled") !== "true") replaceEverything();
    });
  };

  /** Keys inside the bar. */
  const barKeydown = (event: KeyboardEvent): void => {
    const target = event.target as Element | null;
    const inField = target === findInput || target === replaceInput;
    const command = mac ? event.metaKey : event.ctrlKey;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      api.close();
      return;
    }
    if (event.key === "Enter" && inField) {
      // Enter that confirms an input method composition is not a command.
      if (event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      if (target === replaceInput) {
        if (command && event.altKey) replaceEverything();
        else replaceCurrent();
      } else if (command && event.altKey) {
        replaceEverything();
      } else {
        move(event.shiftKey ? -1 : 1);
      }
      return;
    }
    // Cmd/Ctrl+F again from the bar: the query is selected again, as in VS Code's own find.
    if (command && !event.altKey && !event.shiftKey && event.code === "KeyF") {
      event.preventDefault();
      event.stopPropagation();
      findInput.focus();
      findInput.select?.();
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const toggles: Record<string, keyof FindOptions> = { KeyC: "matchCase", KeyW: "wholeWord", KeyR: "regex" };
      const name = toggles[event.code];
      if (name) {
        event.preventDefault();
        event.stopPropagation();
        toggleOption(name);
      }
    }
  };

  const api: FindBar = {
    open(request) {
      const wasOpen = opened;
      // The host's find command can follow a Cmd/Ctrl+F the page already took (the key may reach
      // VS Code too): with the reader already in the bar, it changes nothing, so the query typed
      // since is neither selected again (the next key would replace it) nor searched again.
      const active = document.activeElement;
      if (wasOpen && bar && request?.replace !== true && active !== null && bar.contains(active)) return;
      if (!bar) build();
      if (!wasOpen) {
        restoreFocus = active;
        // The query starts with the selected text: the selection inside the focused text field when
        // the bar opens from an editor (the page selection does not see into a field), else the
        // page selection. Only a short single-line selection is taken.
        const selected = (fieldSelection(active) ?? hooks.selectedText()).trim();
        if (selected !== "" && !/[\r\n]/u.test(selected) && selected.length <= 200) findInput.value = selected;
      }
      opened = true;
      bar!.hidden = false;
      const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
      const bottom = toolbar?.getBoundingClientRect?.().bottom;
      bar!.style.setProperty("--sphinx-find-top", `${Math.max(12, (bottom ?? 0) + 8)}px`);
      if (request?.replace === true && hooks.replaceBlockedReason() === undefined) setReplaceOpen(true);
      findInput.focus();
      findInput.select?.();
      search(false);
    },
    close() {
      if (!opened || !bar) return;
      opened = false;
      bar.hidden = true;
      cancelDryRun();
      matches = [];
      ranges = [];
      current = -1;
      hooks.paint([], undefined);
      const target = restoreFocus;
      restoreFocus = null;
      if (target && (target as HTMLElement).isConnected !== false && typeof (target as HTMLElement).focus === "function"
        && hooks.canRestoreFocus?.(target) !== false) {
        (target as HTMLElement).focus();
      } else {
        // The hidden field lets the focus go, as a browser does with a hidden focused control.
        findInput.blur?.();
      }
    },
    isOpen: () => opened,
    refresh() {
      if (!opened) return;
      search(true);
    },
    next: () => move(1),
    previous: () => move(-1),
  };

  // VS Code hands the focus to the webview container after the shortcut and gives it back to the
  // frame afterwards: the document then reports the body as active. While the bar is open and the
  // focus fell to the page itself (not to another control), the field takes it back.
  window.addEventListener("focus", () => {
    if (!opened || !bar) return;
    const active = document.activeElement;
    if (active === null || active === document.body || active === document.documentElement) findInput.focus();
  });

  // Cmd/Ctrl+F and F3, before VS Code's own handling of the key (it would open the webview find
  // widget). The text editor keeps its own find: this listener lives in the webview only.
  // Cmd/Ctrl+F in a field of an open editor opens the bar too, at once: left to VS Code, the bar
  // opened one host round trip later and the keys typed meanwhile went into the field, then into
  // the Markdown when the field lost the focus. F3 stays with the field.
  window.addEventListener("keydown", (event) => {
    const target = event.target instanceof Element ? event.target : undefined;
    const inBar = bar !== undefined && target !== undefined && bar.contains(target);
    if (inBar) {
      barKeydown(event);
      return;
    }
    const command = mac ? event.metaKey : event.ctrlKey;
    const editing = isEditingField(target);
    if (command && !event.altKey && !event.shiftKey && event.code === "KeyF") {
      event.preventDefault();
      event.stopPropagation();
      api.open();
      return;
    }
    if (event.code === "F3" && opened && !editing) {
      event.preventDefault();
      event.stopPropagation();
      move(event.shiftKey ? -1 : 1);
    }
  }, true);

  return api;
}
