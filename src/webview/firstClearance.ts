/**
 * Room for the first block's editor frame and the Start writing button below the floating toolbar.
 * Self-contained: it is injected into the page script with `.toString()`, so it must not use
 * anything defined outside its own body.
 *
 * Every page keeps a fixed 40px space above its first element. The toolbar (fixed, top right, two
 * rows) can reach lower than that, so an open first-block editor needs extra room, but only when
 * the toolbar and the content column share horizontal space. The runtime publishes that extra room
 * as `--sphinx-preview-first-clearance` on the root element: 0 whenever nothing overlaps.
 */
export function installFirstClearance(
  document: Document,
  window: Window & typeof globalThis,
): { update(): void; value(): number } {
  const contentId = "sphinx-myst-preview-content";
  const property = "--sphinx-preview-first-clearance";
  const gap = 40;
  const margin = 8;
  let current = -1;

  const measure = (): number => {
    const content = document.getElementById(contentId);
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (!content || !toolbar) return 0;
    const column = content.getBoundingClientRect();
    const bar = toolbar.getBoundingClientRect();
    if (!bar.width || !bar.height) return 0;
    const style = window.getComputedStyle(content);
    const left = column.left + (parseFloat(style.paddingLeft) || 0);
    const right = column.right - (parseFloat(style.paddingRight) || 0);
    if (!(bar.left < right && bar.right > left)) return 0;
    const contentTop = column.top + window.scrollY;
    return Math.max(0, Math.ceil(bar.bottom + margin - contentTop - gap));
  };

  const update = (): void => {
    const next = measure();
    if (next === current) return;
    current = next;
    document.documentElement.style.setProperty(property, next + "px");
  };

  window.addEventListener("resize", update);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(update);
    const content = document.getElementById(contentId);
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (content) observer.observe(content);
    if (toolbar) observer.observe(toolbar);
  }
  // Toolbar rows appear and disappear (edit mode, width mode, zoom) through attributes.
  if (typeof MutationObserver !== "undefined") {
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (toolbar) new MutationObserver(update).observe(toolbar, { childList: true, subtree: true, attributes: true });
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-sphinx-preview-edit-mode", "data-sphinx-preview-zoom", "data-sphinx-preview-width"] });
  }
  update();
  return { update, value: () => Math.max(0, current) };
}
