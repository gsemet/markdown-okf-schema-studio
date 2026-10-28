import type { CaretRect } from "./caretRect";
import type { EditPaletteMenuEntry } from "./editPalette";

/** The text box the menu watches (a textarea or a one-line input; only these members are read). */
export interface SlashMenuControl {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  focus(options?: { preventScroll?: boolean }): void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getBoundingClientRect?(): { left: number; top: number; bottom: number };
}

export interface SlashMenuDeps {
  getControl(): SlashMenuControl;
  /** The commands to list: the palette's entries for its current mode and scope. */
  getEntries(): EditPaletteMenuEntry[];
  /** Runs the entry in place of the typed `/query` (see `EditPalette.runMenuEntry`). */
  run(key: string, range: { start: number; end: number }): void;
  /** Where the caret is on screen (viewport coordinates), or `undefined` where it cannot be measured. */
  getCaretRect?(): CaretRect | undefined;
  /**
   * The palette group native to the current mode (`myst` in MyST mode): its entries rank before
   * an equivalent entry of another group for the same query (`/note` finds the admonition first).
   */
  preferGroup?(): string | undefined;
}

/** The subset of a keyboard event the menu reads. */
export interface SlashMenuKeyEvent {
  key?: string;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  isComposing?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface SlashMenu {
  /**
   * Feed every `input` event of the text box. Typing `/` at a line start or after whitespace opens
   * the menu; while it is open the typed query filters it and any edit that leaves the `/query`
   * token closes it.
   */
  handleInput(event: { data?: string | null; inputType?: string; isComposing?: boolean }): void;
  /**
   * Feed every `keydown` of the text box first. While the menu is open the arrows move, Enter and
   * Tab apply, Escape closes (keeping the text); reports whether the key was consumed. A chord with
   * Cmd, Ctrl or Alt closes the menu and is left to the page.
   */
  handleKey(event: SlashMenuKeyEvent): boolean;
  /** Re-checks the caret against the open token (call after keyup, mouseup, select). */
  sync(): void;
  isOpen(): boolean;
  /** Closes the menu (blur, save, cancel); the text stays as typed. */
  close(): void;
  destroy(): void;
  /** Whether a `/` at `index` of `value` may open the menu (the trigger rules, without the typing). */
  canOpenAt(value: string, index: number): boolean;
  /** The entries matching `query`, best first: prefix, then word start, then subsequence. */
  match(query: string, entries: EditPaletteMenuEntry[], preferGroup?: string): EditPaletteMenuEntry[];
}

/**
 * The `/` command menu of the Markdown text boxes (Notion and Obsidian style): typing `/` at the
 * start of a line or after whitespace opens a floating list of the palette's actions at the caret,
 * filtered as the user types. It owns no action: entries come from the palette (the same registry
 * and mode filter) and `run` applies one. Styled through the stylesheet and the CSSOM only; entry
 * text is set with `textContent`.
 */
export function createSlashMenu(
  document: Document,
  window: Window,
  deps: SlashMenuDeps,
): SlashMenu {
  const GROUP_LABELS: Record<string, string> = {
    inline: "Text",
    block: "Blocks",
    insert: "Insert",
    annotation: "Annotations",
    github: "GFM",
    myst: "MyST",
    full: "Full",
  };
  const MAX_HEIGHT = 320;
  const EDGE = 8;
  const uid = "sphinx-slash-" + Math.random().toString(36).slice(2, 8);

  let root: HTMLElement | undefined;
  let list: HTMLElement | undefined;
  let live: HTMLElement | undefined;
  // Index of the `/` in the text box while the menu is open.
  let start = -1;
  let query = "";
  let shown: EditPaletteMenuEntry[] = [];
  let options: HTMLElement[] = [];
  let active = 0;
  // Left edge of the menu relative to the text box, taken when it opened (it does not follow the
  // caret to the right as the query grows).
  let anchorLeft: number | undefined;
  let applying = false;
  // The best match is only a loose one (inside a word, or scattered letters) and the user has not moved the highlight: Enter is text.
  let weak = false;
  let moved = false;

  const isSpace = (char: string): boolean => /\s/u.test(char);

  /** True when `index` lies inside an inline code span of the paragraph around it. */
  function inCodeSpan(value: string, index: number): boolean {
    const before = value.slice(0, index);
    const blank = /\n[ \t]*\n/gu;
    let from = 0;
    let match: RegExpExecArray | null;
    while ((match = blank.exec(before)) !== null) from = match.index + match[0].length;
    const rest = value.slice(index);
    const after = /\n[ \t]*\n/u.exec(rest);
    const to = index + (after ? after.index : rest.length);
    const paragraph = value.slice(from, to);
    const runs = /`+/gu;
    let open: { length: number; end: number } | undefined;
    while ((match = runs.exec(paragraph)) !== null) {
      const at = from + match.index;
      if (open && open.length === match[0].length) {
        if (index >= open.end && index < at) return true;
        open = undefined;
      } else if (!open) {
        open = { length: match[0].length, end: at + match[0].length };
      }
    }
    return false;
  }

  function canOpenAt(value: string, index: number): boolean {
    if (value.charAt(index) !== "/") return false;
    // `a/b`, `http://`, `</tag>`: only a line start or whitespace before the slash opens it.
    if (index > 0 && !isSpace(value.charAt(index - 1))) return false;
    const lineStart = value.lastIndexOf("\n", index - 1) + 1;
    let fences = 0;
    for (const line of value.slice(0, lineStart).split("\n")) {
      if (/^\s*(```|~~~)/u.test(line)) fences += 1;
    }
    if (fences % 2 === 1) return false;
    // The info string of a fence opener is not text either.
    if (/^\s*(```|~~~)/u.test(value.slice(lineStart, index))) return false;
    return !inCodeSpan(value, index);
  }

  /** Score of one candidate text for the query: prefix > word start > subsequence, 0 = no match. */
  function scoreText(text: string, wanted: string): number {
    const candidate = text.toLowerCase();
    if (candidate === wanted) return 1000;
    if (candidate.startsWith(wanted)) return 900 - Math.min(60, candidate.length - wanted.length);
    const words = candidate.split(/[^\p{L}\p{N}]+/u).filter((word) => word !== "");
    for (let index = 1; index < words.length; index += 1) {
      if (words[index].startsWith(wanted)) return 700 - index * 10;
    }
    const at = candidate.indexOf(wanted);
    if (at >= 0) return 500 - Math.min(60, at);
    // Subsequence ("cbl" for Code block): 3+ letters, starting at a word start, tightly packed.
    if (wanted.length < 3) return 0;
    const starts: number[] = [];
    for (let index = 0; index < candidate.length; index += 1) {
      if (/[\p{L}\p{N}]/u.test(candidate.charAt(index)) && (index === 0 || !/[\p{L}\p{N}]/u.test(candidate.charAt(index - 1)))) {
        starts.push(index);
      }
    }
    for (const begin of starts) {
      if (candidate.charAt(begin) !== wanted.charAt(0)) continue;
      let cursor = begin + 1;
      let last = begin;
      let ok = true;
      for (let at = 1; at < wanted.length; at += 1) {
        const found = candidate.indexOf(wanted.charAt(at), cursor);
        if (found < 0) {
          ok = false;
          break;
        }
        last = found;
        cursor = found + 1;
      }
      const span = last - begin + 1;
      if (ok && span <= 2 * wanted.length + 2) return Math.max(1, 300 - (span - wanted.length) * 10 - begin);
    }
    return 0;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-240
  /** Scores of the matching entries, best first (ties keep the registry order). */
  function rank(
    text: string,
    entries: EditPaletteMenuEntry[],
    preferGroup?: string,
  ): Array<{ entry: EditPaletteMenuEntry; score: number }> {
    const wanted = text.trim().toLowerCase();
    if (wanted === "") {
      // Every command, clustered by category in the order the categories first appear.
      const order: string[] = [];
      for (const entry of entries) if (!order.includes(entry.group)) order.push(entry.group);
      return order.flatMap((group) => entries.filter((entry) => entry.group === group))
        .map((entry) => ({ entry, score: 1000 }));
    }
    const scored: Array<{ entry: EditPaletteMenuEntry; score: number; order: number }> = [];
    entries.forEach((entry, order) => {
      let best = scoreText(entry.label, wanted) + 10;
      if (best === 10) best = 0;
      for (const alias of entry.aliases) best = Math.max(best, scoreText(alias, wanted));
      if (best <= 0) return;
      // The mode's own group wins a near tie (a longer label costs up to a few points): the bonus is
      // small, so an exact or clearly better match of another group (`/table`, `/tab`) stays first.
      if (preferGroup !== undefined && entry.group === preferGroup && best >= 400 && wanted.length >= 3) {
        best += best >= 1000 ? 5 : 8;
      }
      scored.push({ entry, score: best, order });
    });
    scored.sort((left, right) => right.score - left.score || left.order - right.order);
    return scored.map((item) => ({ entry: item.entry, score: item.score }));
  }

  function rankEntries(text: string, entries: EditPaletteMenuEntry[], preferGroup?: string): EditPaletteMenuEntry[] {
    return rank(text, entries, preferGroup).map((item) => item.entry);
  }

  function setActive(index: number, scroll: boolean): void {
    if (options.length === 0) {
      active = 0;
      return;
    }
    active = (index + options.length) % options.length;
    options.forEach((option, at) => {
      option.setAttribute("aria-selected", at === active ? "true" : "false");
      if (at === active) option.setAttribute("data-active", "true");
      else option.removeAttribute("data-active");
    });
    const control = deps.getControl();
    control.setAttribute("aria-activedescendant", options[active].getAttribute("id") ?? "");
    if (scroll) options[active].scrollIntoView?.({ block: "nearest" });
  }

  function announce(): void {
    if (!live) return;
    live.textContent = shown.length === 0
      ? "No command"
      : shown.length + (shown.length === 1 ? " command" : " commands") + " available";
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-238
  function render(): void {
    if (!list) return;
    list.textContent = "";
    options = [];
    if (shown.length === 0) {
      const none = document.createElement("div");
      none.className = "sphinx-preview-slash-none";
      none.setAttribute("role", "option");
      none.setAttribute("aria-disabled", "true");
      none.setAttribute("aria-selected", "false");
      none.setAttribute("id", uid + "-none");
      none.setAttribute("data-slash-none", "true");
      none.textContent = "No command";
      list.appendChild(none);
      deps.getControl().removeAttribute("aria-activedescendant");
      announce();
      return;
    }
    // Grouped by palette group while the query is empty; a query lists the best match first.
    const grouped = query.trim() === "";
    let section: HTMLElement = list;
    let previousGroup = "";
    shown.forEach((entry, index) => {
      if (grouped && entry.group !== previousGroup) {
        previousGroup = entry.group;
        section = document.createElement("div");
        section.className = "sphinx-preview-slash-group";
        section.setAttribute("role", "group");
        section.setAttribute("data-slash-group", entry.group);
        const heading = document.createElement("div");
        heading.className = "sphinx-preview-slash-heading";
        heading.setAttribute("id", uid + "-group-" + entry.group);
        heading.textContent = GROUP_LABELS[entry.group] ?? entry.group;
        section.setAttribute("aria-labelledby", heading.getAttribute("id") ?? "");
        section.appendChild(heading);
        list!.appendChild(section);
      }
      const option = document.createElement("div");
      option.className = "sphinx-preview-slash-option";
      option.setAttribute("role", "option");
      option.setAttribute("id", uid + "-option-" + index);
      option.setAttribute("aria-selected", "false");
      option.setAttribute("data-slash-id", entry.key);
      const icon = document.createElement("span");
      icon.className = "sphinx-preview-slash-icon";
      icon.setAttribute("aria-hidden", "true");
      // The palette's own static icon markup, never user text.
      icon.innerHTML = entry.icon;
      const label = document.createElement("span");
      label.className = "sphinx-preview-slash-label";
      label.textContent = entry.label;
      option.appendChild(icon);
      option.appendChild(label);
      if (!grouped) {
        const group = document.createElement("span");
        group.className = "sphinx-preview-slash-category";
        group.textContent = GROUP_LABELS[entry.group] ?? entry.group;
        option.appendChild(group);
      }
      if (entry.shortcut) {
        const shortcut = document.createElement("span");
        shortcut.className = "sphinx-preview-slash-shortcut";
        shortcut.textContent = entry.shortcut;
        option.appendChild(shortcut);
      }
      option.addEventListener("mousemove", () => {
        if (active !== index) setActive(index, false);
      });
      option.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        apply(index);
      });
      section.appendChild(option);
      options.push(option);
    });
    setActive(0, false);
    announce();
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-256
  /** Puts the menu under the caret, or above it when there is no room below; keeps it on screen. */
  function place(): void {
    if (!root) return;
    const control = deps.getControl();
    const box = control.getBoundingClientRect?.();
    const caret = deps.getCaretRect?.()
      ?? (box ? { left: box.left, top: box.top, bottom: box.bottom } : undefined);
    if (!caret) return;
    const height = Number(window.innerHeight);
    const width = Number(window.innerWidth);
    if (Number.isFinite(height) && (caret.bottom < 0 || caret.top > height)) {
      // The caret scrolled out of view: the menu has nothing to point at.
      close();
      return;
    }
    const below = height - caret.bottom - EDGE;
    const above = caret.top - EDGE;
    const room = Math.max(below, above);
    if (Number.isFinite(room)) root.style.setProperty("max-height", Math.max(96, Math.min(MAX_HEIGHT, room - 4)) + "px");
    const measured = root.offsetHeight;
    const tall = Number.isFinite(measured) && measured > 0 ? measured : 0;
    const flip = Number.isFinite(below) && tall > below - 4 && above > below;
    let top = flip ? caret.top - 4 - tall : caret.bottom + 4;
    if (!flip && Number.isFinite(height) && tall > 0) top = Math.min(top, height - EDGE - tall);
    const wide = root.offsetWidth || 0;
    let left = box && anchorLeft !== undefined ? box.left + anchorLeft : caret.left;
    if (Number.isFinite(width)) left = Math.min(left, width - wide - EDGE);
    left = Math.max(EDGE, left);
    root.style.setProperty("top", Math.round(Math.max(EDGE, top)) + "px");
    root.style.setProperty("left", Math.round(left) + "px");
    root.setAttribute("data-slash-placement", flip ? "above" : "below");
  }

  function reposition(event?: { target?: unknown }): void {
    // Scrolling the menu's own list is not the page moving.
    if (root && event?.target && root.contains?.(event.target as Node)) return;
    if (root) place();
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-252
  function open(at: number): void {
    const entries = deps.getEntries();
    if (entries.length === 0) return;
    start = at;
    query = "";
    const control = deps.getControl();
    root = document.createElement("div");
    root.className = "sphinx-preview-slash-menu";
    root.setAttribute("data-slash-menu", "true");
    root.addEventListener("mousedown", (event: { preventDefault?: () => void }) => event.preventDefault?.());
    list = document.createElement("div");
    list.className = "sphinx-preview-slash-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("id", uid + "-list");
    list.setAttribute("aria-label", "Commands");
    live = document.createElement("div");
    live.className = "sphinx-preview-slash-live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    root.appendChild(list);
    root.appendChild(live);
    document.body.appendChild(root);
    const box = control.getBoundingClientRect?.();
    const caret = deps.getCaretRect?.();
    anchorLeft = box && caret ? caret.left - box.left : undefined;
    control.setAttribute("aria-expanded", "true");
    control.setAttribute("aria-controls", uid + "-list");
    shown = rankEntries("", entries);
    weak = false;
    moved = false;
    render();
    place();
    window.addEventListener?.("scroll", reposition, true);
    window.addEventListener?.("resize", reposition);
  }

  function close(): void {
    if (!root) return;
    window.removeEventListener?.("scroll", reposition, true);
    window.removeEventListener?.("resize", reposition);
    root.remove();
    root = undefined;
    list = undefined;
    live = undefined;
    options = [];
    shown = [];
    start = -1;
    query = "";
    anchorLeft = undefined;
    const control = deps.getControl();
    control.removeAttribute("aria-expanded");
    control.removeAttribute("aria-controls");
    control.removeAttribute("aria-activedescendant");
  }

  function apply(index: number): void {
    const entry = shown[index];
    if (!entry || start < 0) return;
    const control = deps.getControl();
    const range = { start, end: Math.max(start + 1, Number(control.selectionEnd)) };
    close();
    applying = true;
    try {
      deps.run(entry.key, range);
    } finally {
      applying = false;
    }
  }

  function sync(): void {
    if (!root || applying) return;
    const control = deps.getControl();
    const value = String(control.value ?? "");
    const caret = Number(control.selectionEnd);
    if (
      control.selectionStart !== control.selectionEnd
      || caret <= start
      || value.charAt(start) !== "/"
    ) {
      close();
      return;
    }
    const typed = value.slice(start + 1, caret);
    // A space or a second slash ends the command: `// ` and `/ ` are plain text.
    if (/[\s/]/u.test(typed) || !canOpenAt(value, start)) {
      close();
      return;
    }
    if (typed !== query) {
      query = typed;
      const ranked = rank(query, deps.getEntries(), deps.preferGroup?.());
      shown = ranked.map((item) => item.entry);
      weak = ranked.length > 0 && ranked[0].score < 600;
      moved = false;
      render();
      place();
    }
  }

  return {
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-232
    handleInput(event) {
      if (applying) return;
      if (event.isComposing) {
        close();
        return;
      }
      if (root) {
        sync();
        return;
      }
      const control = deps.getControl();
      if (control.selectionStart !== control.selectionEnd) return;
      if (event.inputType !== undefined && event.inputType !== "insertText") return;
      if (event.data !== undefined && event.data !== "/") return;
      const caret = Number(control.selectionEnd);
      if (canOpenAt(String(control.value ?? ""), caret - 1)) open(caret - 1);
    },
    // @implements_req SwRS-MDOKFSTUDIO-PALETTE-242
    handleKey(event) {
      if (!root || event.isComposing) return false;
      const key = String(event.key);
      if (event.metaKey || event.ctrlKey || event.altKey) {
        if (!["Meta", "Control", "Alt", "AltGraph", "Shift"].includes(key)) close();
        return false;
      }
      const swallow = (): void => {
        event.preventDefault?.();
        event.stopPropagation?.();
      };
      if (key === "ArrowDown" || key === "ArrowUp") {
        swallow();
        moved = true;
        setActive(active + (key === "ArrowDown" ? 1 : -1), true);
        return true;
      }
      if (key === "Escape") {
        // The typed text stays; the next Escape is the editor's own.
        swallow();
        close();
        return true;
      }
      if (key === "Enter" || key === "Tab") {
        // Only fuzzy matches (a literal " /or"): Enter and Tab stay text unless the user chose one.
        if (event.shiftKey || shown.length === 0 || (weak && !moved)) {
          close();
          return false;
        }
        swallow();
        apply(active);
        return true;
      }
      return false;
    },
    sync,
    isOpen: () => root !== undefined,
    close,
    destroy: close,
    canOpenAt,
    match: rankEntries,
  };
}
