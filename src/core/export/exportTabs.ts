/**
 * MyST tab sets of an exported page, with no JavaScript. The page marks a tab set with one `button`
 * per tab and shows one panel at a time with `hidden`; the file has one radio input per tab (hidden
 * visually, still focusable: the arrow keys move between them natively), a `label` in the place of
 * each button, and the sheet of `exportStyles.ts` shows the panel of the checked radio. Pure module:
 * no host API, no DOM, no Node built-ins.
 */

import {
  attr,
  childElements,
  elementFromHtml,
  hasClass,
  insertAt,
  removeAttr,
  replaceWith,
  setAttr,
  textNode,
  textOf,
  walkElements,
  type HtmlElement,
  type HtmlParent,
} from "./exportDom";

/** The result of {@link convertTabSets}. */
export interface ConvertedTabs {
  /** The most tabs one set has (the sheet writes one rule per tab position). */
  maxTabs: number;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-137
/**
 * Turns every `.myst-tab-set` under `root` into a CSS-only tab set. `shown` holds the index of the
 * tab each set shows, in document order; a set without an entry shows the tab its markup selects,
 * else the first. The radio names are unique per set.
 */
export function convertTabSets(root: HtmlParent, shown: readonly number[]): ConvertedTabs {
  const sets: HtmlElement[] = [];
  walkElements(root, (element) => {
    if (hasClass(element, "myst-tab-set")) sets.push(element);
  });
  let maxTabs = 0;
  sets.forEach((set, setIndex) => {
    const list = childElements(set).find((child) => hasClass(child, "myst-tab-list"));
    const buttons = list ? childElements(list).filter((child) => hasClass(child, "myst-tab")) : [];
    const panels = childElements(set).filter((child) => hasClass(child, "myst-tab-panel"));
    if (!list || buttons.length === 0) return;
    maxTabs = Math.max(maxTabs, buttons.length);
    const markedIndex = buttons.findIndex((button) => attr(button, "aria-selected") === "true");
    const requested = shown[setIndex] ?? (markedIndex >= 0 ? markedIndex : 0);
    const selected = requested >= 0 && requested < buttons.length ? requested : 0;
    const name = `myst-tabset-${setIndex + 1}`;
    const radios: HtmlElement[] = [];
    buttons.forEach((button, index) => {
      const tab = index + 1;
      const radioId = `${name}-${tab}`;
      radios.push(elementFromHtml(
        `<input type="radio" class="myst-tab-radio" name="${name}" id="${radioId}" data-export-tab="${tab}"${index === selected ? " checked" : ""}>`,
      ));
      const label = elementFromHtml(`<label class="myst-tab" role="tab" for="${radioId}" data-export-tab="${tab}"></label>`);
      const tabId = attr(button, "id");
      if (tabId !== undefined) setAttr(label, "id", tabId);
      label.childNodes = [textNode(textOf(button))];
      label.childNodes[0]!.parentNode = label;
      replaceWith(button, [label]);
      const panel = panels[index];
      if (panel) {
        removeAttr(panel, "hidden");
        setAttr(panel, "data-export-tab", String(tab));
      }
    });
    radios.forEach((radio, index) => insertAt(set, radio, index));
  });
  return { maxTabs };
}
