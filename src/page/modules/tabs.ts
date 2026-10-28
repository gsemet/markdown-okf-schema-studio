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
}

export function installTabs(document: TabsDocument): TabsControl {
  // Which tab (by position) each tab set shows, by the position of the set in the document; and the
  // sync key last chosen in each sync group.
  const chosenIndex = new Map<number, number>();
  const chosenSync = new Map<string, string>();

  const tabSets = (): Element[] => Array.from(document.querySelectorAll(".myst-tab-set"));
  // The tabs of a set itself, not those of a tab set nested in one of its panels.
  const tabsOf = (set: Element): HTMLElement[] =>
    Array.from(set.querySelectorAll<HTMLElement>(".myst-tab")).filter((tab) => tab.closest(".myst-tab-set") === set);
  const panelOf = (tab: Element): HTMLElement | null => {
    const id = tab.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  };

  const show = (set: Element, index: number): void => {
    tabsOf(set).forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      const panel = panelOf(tab);
      if (panel) panel.hidden = !selected;
    });
  };

  const syncKey = (tab: Element): string | null => tab.getAttribute("data-myst-tab-sync");
  const groupOf = (set: Element): string => set.getAttribute("data-myst-tab-group") ?? "tab";

  // @implements_req SwRS-MDOKFSTUDIO-MYST-099
  const select = (tab: HTMLElement, focus: boolean): void => {
    const set = tab.closest(".myst-tab-set");
    if (!set) return;
    const tabs = tabsOf(set);
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    show(set, index);
    if (focus) tab.focus();
    const sets = tabSets();
    chosenIndex.set(sets.indexOf(set), index);
    const key = syncKey(tab);
    if (key === null) return;
    const group = groupOf(set);
    chosenSync.set(group, key);
    sets.forEach((other, position) => {
      if (other === set || groupOf(other) !== group) return;
      const match = tabsOf(other).findIndex((candidate) => syncKey(candidate) === key);
      if (match < 0) return;
      show(other, match);
      chosenIndex.set(position, match);
    });
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
    apply() {
      const sets = tabSets();
      sets.forEach((set, position) => {
        const tabs = tabsOf(set);
        const key = chosenSync.get(groupOf(set));
        const bySync = key === undefined ? -1 : tabs.findIndex((tab) => syncKey(tab) === key);
        const remembered = chosenIndex.get(position);
        if (bySync >= 0) show(set, bySync);
        else if (remembered !== undefined && remembered < tabs.length) show(set, remembered);
      });
      for (const position of Array.from(chosenIndex.keys())) {
        if (position >= sets.length) chosenIndex.delete(position);
      }
    },
  };
}
