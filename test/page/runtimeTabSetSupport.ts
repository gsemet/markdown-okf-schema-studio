/**
 * Tab sets for the fake page of the runtime tests: the `.myst-tab-set` / `.myst-tab-list` /
 * `button.myst-tab` / `.myst-tab-panel` structure the renderer writes (src/core/render/mystGridToctree.ts),
 * wired to the page's real `installTabs`. A panel that is hidden, or sits in a closed `details`, has
 * no box (the layout does not list it), like in a browser. The panels of an outer set are mapped
 * blocks; the content of a tab item carries marker lines only (never a mapped block, MYST-098).
 */
import { RuntimeElement, type RuntimeHarness, type FakeTextNode } from "./runtimeHarness";

export interface BuiltTabSet {
  readonly set: RuntimeElement;
  readonly tabs: RuntimeElement[];
  readonly panels: RuntimeElement[];
}

export interface TabSetOptions {
  /** Prefix of the element ids. */
  prefix: string;
  /** Document top of the set; its panels start 20 px lower. */
  top: number;
  /** Source lines of the set (the `{tab-set}` line to its end) and of each tab item. */
  setLines: [number, number];
  itemLines: Array<[number, number]>;
  selected: number;
  /** The parent element of the set (absent: none, the page finds it through the harness lists). */
  parent?: RuntimeElement;
  /** True for a set inside a tab item: its blocks carry marker lines, not mapped lines. */
  nested?: boolean;
  /** The panel is not laid out while this says false (a closed `details` around it). */
  laidOut?: () => boolean;
}

const DOCUMENT = {
  "data-sphinx-preview-document": "file:///active.md",
  "data-sphinx-source-file": "/workspace/active.md",
};

const lines = (range: [number, number], nested: boolean): Record<string, string> => nested
  ? { "data-okf-marker-line": String(range[0]), "data-okf-marker-end-line": String(range[1]) }
  : {
    ...DOCUMENT,
    "data-sphinx-source-line": String(range[0]),
    "data-sphinx-source-end-line": String(range[1]),
  };

export function buildTabSet(harness: RuntimeHarness, options: TabSetOptions): BuiltTabSet {
  const nested = options.nested === true;
  const window = harness.windowState;
  const set = new RuntimeElement(
    { class: "myst-tab-set", ...lines(options.setLines, nested) }, window, options.top, 200, "div");
  const list = new RuntimeElement({ class: "myst-tab-list", role: "tablist" }, window, options.top, 20, "div");
  set.appendChild(list);
  const tabs: RuntimeElement[] = [];
  const panels: RuntimeElement[] = [];
  options.itemLines.forEach((range, index) => {
    tabs.push(list.appendChild(new RuntimeElement({
      class: "myst-tab",
      role: "tab",
      id: `${options.prefix}-tab-${index}`,
      "aria-controls": `${options.prefix}-panel-${index}`,
      "aria-selected": index === options.selected ? "true" : "false",
      tabindex: index === options.selected ? "0" : "-1",
    }, window, options.top, 20, "button")));
    const panel = new RuntimeElement({
      class: "myst-tab-panel",
      role: "tabpanel",
      id: `${options.prefix}-panel-${index}`,
      ...lines(range, nested),
    }, window, options.top + 20, 200, "div");
    panel.hidden = index !== options.selected;
    panel.rectProvider = () => panel.hidden || options.laidOut?.() === false
      ? { top: 0, height: 0 }
      : { top: panel.top - window.scrollY, height: panel.height, bottom: panel.top - window.scrollY + panel.height, left: 0, width: 200 };
    set.appendChild(panel);
    panels.push(panel);
  });
  options.parent?.appendChild(set);
  harness.tabSets.push(set);
  if (!nested) {
    harness.mappings.push(set, ...panels);
  }
  return { set, tabs, panels };
}

/** A soft-wrapped paragraph on source lines `first` to `last`: one text line per source line, 20 px each. */
export function wrappedParagraph(
  harness: RuntimeHarness, parent: RuntimeElement, first: number, top: number, texts: string[],
): RuntimeElement {
  const paragraph = new RuntimeElement({
    "data-okf-marker-line": String(first),
    ...(texts.length > 1 ? { "data-okf-marker-end-line": String(first + texts.length - 1) } : {}),
  }, harness.windowState, top, texts.length * 20, "p");
  const data = texts.join("\n");
  const node: FakeTextNode = {
    data,
    // The character at `index` sits on the text line that counts the line breaks before it.
    topAt: (index) => top + (data.slice(0, index).split("\n").length - 1) * 20 - harness.windowState.scrollY,
  };
  paragraph.textNodes = [node];
  parent.appendChild(paragraph);
  return paragraph;
}

/** A fenced code block on source lines `fence` (opening) to `fence + codeLines + 1` (closing), 20 px per line. */
export function codeBlock(
  harness: RuntimeHarness, parent: RuntimeElement, fence: number, top: number, codeLines: number,
): { block: RuntimeElement; spans: RuntimeElement[] } {
  const block = new RuntimeElement({
    "data-okf-marker-line": String(fence),
    "data-okf-marker-end-line": String(fence + codeLines + 1),
  }, harness.windowState, top, codeLines * 20 + 20, "pre");
  parent.appendChild(block);
  const spans = Array.from({ length: codeLines }, (_, index) => {
    const span = new RuntimeElement({}, harness.windowState, top + 10 + index * 20, 20, "span");
    span.className = "myst-code-line";
    block.appendChild(span);
    return span;
  });
  return { block, spans };
}

/**
 * Logs every change of a property of `element` in `log` as `label=value`, as the page sets it; the
 * element keeps working as before.
 */
export function watchProperty(element: RuntimeElement, name: "hidden" | "open", label: string, log: string[]): void {
  let value: unknown = (element as unknown as Record<string, unknown>)[name];
  Object.defineProperty(element, name, {
    configurable: true,
    get: () => value,
    set: (next: unknown) => {
      if (next !== value) log.push(`${label}=${String(next)}`);
      value = next;
    },
  });
}
