/**
 * The hover detail of the charts (the tooltip handler of the live Vega view): one shared box in
 * the page's colours, outside the content so the export snapshot and the keyed morph never see it.
 * Rows are built as text, never as HTML; the position is set through the CSSOM (no `style`
 * attribute, which the page's Content Security Policy refuses).
 */

const OFFSET = 10;

let box: HTMLElement | undefined;
let wired = false;

function tooltipBox(): HTMLElement {
  if (box === undefined) {
    box = document.createElement("div");
    box.setAttribute("class", "myst-vega-tooltip");
    box.setAttribute("role", "tooltip");
    box.setAttribute("hidden", "");
    document.body.appendChild(box);
  }
  if (!wired) {
    wired = true;
    window.addEventListener("scroll", hideChartTooltip, true);
    document.addEventListener("studio:content-replaced", hideChartTooltip);
  }
  return box;
}

/** Hides the box (a scroll, a content patch, a chart drawn again or released). */
export function hideChartTooltip(): void {
  box?.setAttribute("hidden", "");
}

const asText = (value: unknown): string => {
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
};

function row(key: string | undefined, value: unknown): HTMLElement {
  const line = document.createElement("div");
  line.setAttribute("class", "myst-vega-tooltip-row");
  if (key !== undefined) {
    const label = document.createElement("span");
    label.setAttribute("class", "myst-vega-tooltip-key");
    label.textContent = key;
    line.appendChild(label);
  }
  const text = document.createElement("span");
  text.setAttribute("class", "myst-vega-tooltip-value");
  text.textContent = asText(value);
  line.appendChild(text);
  return line;
}

function place(element: HTMLElement, event: MouseEvent): void {
  const { width, height } = element.getBoundingClientRect();
  let left = event.clientX + OFFSET;
  let top = event.clientY + OFFSET;
  if (left + width > window.innerWidth) left = event.clientX - OFFSET - width;
  if (top + height > window.innerHeight) top = event.clientY - OFFSET - height;
  element.style.setProperty("left", `${Math.max(0, left)}px`);
  element.style.setProperty("top", `${Math.max(0, top)}px`);
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
/** The Vega tooltip handler: shows `value` at the pointer, hides the box when there is none. */
export function chartTooltip(_handler: unknown, event: MouseEvent, _item: unknown, value: unknown): void {
  if (value === null || value === undefined) {
    hideChartTooltip();
    return;
  }
  const element = tooltipBox();
  const isRecord = typeof value === "object" && !Array.isArray(value);
  element.textContent = "";
  const rows = isRecord
    ? Object.entries(value as Record<string, unknown>).map(([key, field]) => row(key, field))
    : [row(undefined, value)];
  for (const line of rows) element.appendChild(line);
  element.removeAttribute("hidden");
  place(element, event);
}
