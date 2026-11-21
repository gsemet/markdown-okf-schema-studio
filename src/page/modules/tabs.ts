/**
 * MyST `{tab-set}` in the page: a click, or an arrow, Home or End key on a tab selects a tab and
 * shows only its panel (the markup is `.myst-tab-set` > `.myst-tab-list` of `button.myst-tab` and
 * the `.myst-tab-panel`s, each tab pointing to its panel with `aria-controls`). Tabs with the same
 * `data-myst-tab-sync` key in tab sets of the same `data-myst-tab-group` follow each other. The
 * choices live in the page and are put back on the content after a patch; the saved file never
 * changes.
 */

type TabsDocument = Pick<Document, "addEventListener" | "querySelectorAll" | "getElementById">;

const ARROWS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export interface TabsControl {
  /** Puts the remembered selections back on the current content (after a load or a content patch). */
  apply(): void;
  /**
   * Shows the tab of `panel` the way a click does (the choice is remembered, the sets of its sync
   * group follow, the focus does not move). True when the tab shown by a set changed.
   */
  reveal(panel: Element): boolean;
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-099
/** `onChange` runs after any change of a tab shown by a set: a click, a key, a sync follow, `reveal`. */
export function installTabs(document: TabsDocument, onChange?: () => void): TabsControl {
  // Which tab (by position) each tab set shows, by the position of the set in the document; and the
  // sync key last chosen in each sync group. Each choice carries a stamp (a counter) so that, after
  // a content patch, a set shows the later of its own selection and its group's sync choice.
  const chosenIndex = new Map<number, { index: number; stamp: number }>();
  const chosenSync = new Map<string, { key: string; stamp: number }>();
  let stamps = 0;

  const tabSets = (): Element[] => Array.from(document.querySelectorAll(".myst-tab-set"));
  // The tabs of a set itself, not those of a tab set nested in one of its panels.
  const tabsOf = (set: Element): HTMLElement[] =>
    Array.from(set.querySelectorAll<HTMLElement>(".myst-tab")).filter((tab) => tab.closest(".myst-tab-set") === set);
  const panelOf = (tab: Element): HTMLElement | null => {
    const id = tab.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  };

  // Shows tab `index` of the set; true when another tab was shown before.
  const show = (set: Element, index: number): boolean => {
    let changed = false;
    tabsOf(set).forEach((tab, position) => {
      const selected = position === index;
      if (selected && tab.getAttribute("aria-selected") !== "true") changed = true;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      const panel = panelOf(tab);
      if (panel) panel.hidden = !selected;
    });
    return changed;
  };

  const syncKey = (tab: Element): string | null => tab.getAttribute("data-myst-tab-sync");
  const groupOf = (set: Element): string => set.getAttribute("data-myst-tab-group") ?? "tab";

  // @implements_req SwRS-MDOKFSTUDIO-MYST-099
  // Selects `tab` and records the choice; true when the shown tab of any set changed.
  const choose = (tab: HTMLElement, focus: boolean): boolean => {
    const set = tab.closest(".myst-tab-set");
    if (!set) return false;
    const tabs = tabsOf(set);
    const index = tabs.indexOf(tab);
    if (index < 0) return false;
    let changed = show(set, index);
    if (focus) tab.focus();
    const sets = tabSets();
    stamps += 1;
    chosenIndex.set(sets.indexOf(set), { index, stamp: stamps });
    const key = syncKey(tab);
    if (key === null) return changed;
    const group = groupOf(set);
    chosenSync.set(group, { key, stamp: stamps });
    sets.forEach((other, position) => {
      if (other === set || groupOf(other) !== group) return;
      const match = tabsOf(other).findIndex((candidate) => syncKey(candidate) === key);
      if (match < 0) return;
      if (show(other, match)) changed = true;
      chosenIndex.set(position, { index: match, stamp: stamps });
    });
    return changed;
  };

  const select = (tab: HTMLElement, focus: boolean): boolean => {
    const changed = choose(tab, focus);
    if (changed) onChange?.();
    return changed;
  };

  const tabOf = (target: EventTarget | null): HTMLElement | undefined => {
    const element = target as Element | null;
    return (element && typeof element.closest === "function"
      ? element.closest<HTMLElement>(".myst-tab")
      : null) ?? undefined;
  };

  document.addEventListener("click", (event) => {
    const tab = tabOf(event.target);
    if (tab) select(tab, false);
  });

  // @implements_req SwRS-MDOKFSTUDIO-MYST-099
  document.addEventListener("keydown", (event) => {
    if (!ARROWS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    const tab = tabOf(event.target);
    const set = tab?.closest(".myst-tab-set");
    if (!tab || !set) return;
    const tabs = tabsOf(set);
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    select(tabs[next], true);
  });

  return {
    // @implements_req SwRS-MDOKFSTUDIO-MYST-099
    apply() {
      const sets = tabSets();
      sets.forEach((set, position) => {
        const tabs = tabsOf(set);
        const sync = chosenSync.get(groupOf(set));
        const bySync = sync === undefined ? -1 : tabs.findIndex((tab) => syncKey(tab) === sync.key);
        const own = chosenIndex.get(position);
        const ownValid = own !== undefined && own.index < tabs.length;
        // The later of the set's own selection and its group's last sync choice wins.
        if (bySync >= 0 && (!ownValid || sync!.stamp >= own!.stamp)) show(set, bySync);
        else if (ownValid) show(set, own!.index);
      });
      for (const position of Array.from(chosenIndex.keys())) {
        if (position >= sets.length) chosenIndex.delete(position);
      }
    },
    // @implements_req SwRS-MDOKFSTUDIO-MYST-099
    // @implements_req SwRS-MDOKFSTUDIO-LIFE-193
    reveal(panel) {
      const set = panel.closest(".myst-tab-set");
      const tab = set ? tabsOf(set).find((candidate) => candidate.getAttribute("aria-controls") === panel.getAttribute("id")) : undefined;
      return tab ? select(tab, false) : false;
    },
  };
}
