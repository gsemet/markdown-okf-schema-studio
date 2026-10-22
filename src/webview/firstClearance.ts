/**
 * Keeps the gap above the first element uniform (40px) while the floating toolbar stays clear of
 * everything clickable. Self-contained: it is injected into the page script with `.toString()`, so
 * it must not use anything defined outside its own body.
 *
 * The page always starts its first element 40px below the top. The toolbar (fixed, top right, two
 * rows) reaches lower than that, so only an interactive first element that really sits under it
 * needs a remedy, and it is looked up by the element's own rectangle, never by the whole column:
 * - an open first-block editor (a full-width frame) loses the width the toolbar covers, through
 *   `--sphinx-preview-first-inset` (its inline-end margin), so it keeps its 40px gap; when that
 *   would leave it under 320px wide (a narrow pane) it is pushed down instead;
 * - the Start writing button and the controls of a leading properties table are pushed down only
 *   when the control itself sits under the toolbar; its right-aligned Description toggle makes the
 *   table give up the toolbar's width like a first-block editor.
 * The push is published as `--sphinx-preview-first-clearance`: 0 whenever nothing overlaps.
 *
 * The same overlap test publishes `--sphinx-preview-toolbar-bottom`: the toolbar's bottom edge in
 * viewport coordinates (plus a small margin) while it shares horizontal space with the column, 0
 * otherwise. The edition palette sticks below it, except the palette of a first-block editor that
 * gave up the toolbar's width, which uses `--sphinx-preview-first-bar-bottom` (0 in that case).
 */
export function installFirstClearance(
  document: Document,
  window: Window & typeof globalThis,
): { update(): void; value(): number; inset(): number } {
  const contentId = "sphinx-myst-preview-content";
  const property = "--sphinx-preview-first-clearance";
  const insetProperty = "--sphinx-preview-first-inset";
  const gap = 40;
  const margin = 8;
  const minimumFrameWidth = 320;
  let current = -1;
  let currentInset = -1;

  const bottomProperty = "--sphinx-preview-toolbar-bottom";
  let currentBottom = -1;
  // The same edge for the palette of a first-block editor: 0 when the frame gave up the toolbar's
  // width (nothing of it is under the toolbar), so the palette stays in its 40px place.
  const firstBottomProperty = "--sphinx-preview-first-bar-bottom";
  let currentFirstBottom = -1;

  type Box = { top: number; left: number; right: number; bottom: number; width: number; height: number };
  const sharesColumn = (a: Box, b: Box): boolean => a.left < b.right && a.right > b.left;

  // The toolbar's bottom edge (viewport coordinates, margin included), the extra room below the
  // 40px gap and the width the toolbar takes from a first-block editor.
  const measure = (): { clearance: number; inset: number; bottom: number } => {
    const none = { clearance: 0, inset: 0, bottom: 0 };
    const content = document.getElementById(contentId);
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (!content || !toolbar) return none;
    const column = content.getBoundingClientRect();
    const bar = toolbar.getBoundingClientRect();
    if (!bar.width || !bar.height) return none;
    const style = window.getComputedStyle(content);
    const left = column.left + (parseFloat(style.paddingLeft) || 0);
    const right = column.right - (parseFloat(style.paddingRight) || 0);
    if (!(bar.left < right && bar.right > left)) return none;
    const contentTop = column.top + window.scrollY;
    const barBottom = Math.max(0, Math.ceil(bar.bottom + margin));
    // Pushing an element down to this offset puts its top just under the toolbar.
    const below = (top: number): number => Math.max(0, Math.ceil(bar.bottom + margin - top));
    const result = { clearance: 0, inset: 0, bottom: barBottom };
    // Room the toolbar's rectangle takes below the 40px gap: nothing to do when it ends above it.
    if (barBottom <= contentTop + gap) return result;

    // The Start writing button: only its own rectangle counts.
    const start = document.querySelector("#" + contentId + " .sphinx-preview-insert-point--first button");
    const startBox = start ? start.getBoundingClientRect() : undefined;
    // A hidden button (the editor replaced it) is not the first element any more.
    if (startBox && startBox.width && startBox.height) {
      if (sharesColumn(startBox, bar)) result.clearance = below(contentTop + gap);
      return result;
    }
    // A leading properties table: its clickable controls count. Their positions are taken relative
    // to the table (never from the pushed or narrowed layout), so the answer cannot depend on what
    // it decided before. The right-aligned Description toggles make the table give up the toolbar's
    // width; a left-aligned badge or link pushes it down.
    const section = document.querySelector("#" + contentId + " > [data-okf-properties]");
    if (section) {
      const frame = section.getBoundingClientRect() as Box;
      const visible = (list: NodeListOf<Element>, rightAligned: boolean) => Array.from(list)
        .map((control) => control.getBoundingClientRect() as Box)
        .filter((box) => box.width && box.height)
        .map((box) => {
          const top = contentTop + gap + (box.top - frame.top);
          const boxRight = rightAligned ? right - (frame.right - box.right) : box.right;
          return { top, bottom: top + box.height, left: boxRight - box.width, right: boxRight };
        })
        .filter((box) => box.left < bar.right && box.right > bar.left
          && box.top < bar.bottom + margin && box.bottom > bar.top);
      const toggles = visible(section.querySelectorAll("[data-okf-description-toggle]"), true);
      const others = visible(section.querySelectorAll("button:not([data-okf-description-toggle]), a[href]"), false);
      const inset = Math.max(0, Math.ceil(right - bar.left + margin));
      let needed = 0;
      for (const box of others) needed = Math.max(needed, below(box.top));
      if (toggles.length) {
        if (right - left - inset >= minimumFrameWidth) result.inset = inset;
        else for (const box of toggles) needed = Math.max(needed, below(box.top));
      }
      result.clearance = needed;
      return result;
    }
    // Otherwise the first block is (or is about to become) an open first-block editor: narrow it, or
    // push it down when too little would remain. It is decided before the editor exists, so the frame
    // is created in its final place and the page never jumps.
    const inset = Math.max(0, Math.ceil(right - bar.left + margin));
    if (right - left - inset >= minimumFrameWidth) result.inset = inset;
    else result.clearance = below(contentTop + gap);
    return result;
  };

  // The observers below watch what update() changes: a layout that never settles must not loop.
  // More than 200 updates inside one second are skipped (the next event after that updates again).
  let windowStart = 0;
  let burst = 0;
  const update = (): void => {
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      burst = 0;
    }
    if (++burst > 200) return;
    const measured = measure();
    if (measured.bottom !== currentBottom) {
      currentBottom = measured.bottom;
      document.documentElement.style.setProperty(bottomProperty, measured.bottom + "px");
    }
    const firstBottom = measured.inset > 0 ? 0 : measured.bottom;
    if (firstBottom !== currentFirstBottom) {
      currentFirstBottom = firstBottom;
      document.documentElement.style.setProperty(firstBottomProperty, firstBottom + "px");
    }
    if (measured.inset !== currentInset) {
      currentInset = measured.inset;
      document.documentElement.style.setProperty(insetProperty, measured.inset + "px");
    }
    const next = measured.clearance;
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
    // The first-block editor and the Start writing button come and go inside the column.
    const content = document.getElementById(contentId);
    // Link states, hidden toggles and text changes resize controls without adding or removing nodes.
    if (content) {
      new MutationObserver(update).observe(content, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["data-sphinx-preview-link-state", "hidden", "href"],
      });
    }
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-sphinx-preview-edit-mode", "data-sphinx-preview-zoom", "data-sphinx-preview-width"] });
  }
  // A late web font (the toolbar icons, the text) changes widths without any element event.
  (document as Document & { fonts?: { addEventListener?: (type: string, listener: () => void) => void } })
    .fonts?.addEventListener?.("loadingdone", update);
  update();
  return { update, value: () => Math.max(0, current), inset: () => Math.max(0, currentInset) };
}
