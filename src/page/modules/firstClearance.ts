/**
 * Keeps the gap above the first element uniform (40px) while the floating toolbar stays clear of
 * everything clickable.
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
/** What the page published, what its layout gives now, and which event measured last (tests only). */
export interface FirstClearanceDiagnostics {
  published: { clearance: number; inset: number; toolbarBottom: number };
  measuredNow: { clearance: number; inset: number; bottom: number };
  lastTrigger: string;
  lastChangeTrigger: string;
  updates: number;
  settling: boolean;
}

export function installFirstClearance(
  document: Document,
  window: Window & typeof globalThis,
): { update(): void; value(): number; inset(): number; describe(): FirstClearanceDiagnostics } {
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

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-011
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
  // More than 200 updates inside one second are skipped, and one trailing update runs when that
  // second ends: the last change of a busy second must never be left unmeasured.
  let windowStart = 0;
  let burst = 0;
  let trailing: number | undefined;
  // The leading properties table can change size or controls without resizing the column (a
  // toggle shown, a heading wrapped, a font applied), so it is observed itself, and again when
  // the section is replaced by a new one.
  let observedSection: Element | null = null;
  let sectionObserver: ResizeObserver | undefined;
  const armSection = (): void => {
    if (!sectionObserver) return;
    const section = document.querySelector("#" + contentId + " > [data-okf-properties]");
    if (section === observedSection) return;
    sectionObserver.disconnect();
    observedSection = section;
    if (section) sectionObserver.observe(section);
  };
  // Diagnostics only: the event that ran the last update and the last one that changed a value.
  let trigger = "install";
  let lastTrigger = "";
  let lastChangeTrigger = "";
  let updates = 0;
  const on = (name: string) => (): void => {
    trigger = name;
    update();
  };
  const update = (): void => {
    lastTrigger = trigger;
    trigger = "page call";
    updates += 1;
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      burst = 0;
    }
    if (++burst > 200) {
      if (trailing === undefined) {
        trailing = window.setTimeout(() => {
          trailing = undefined;
          trigger = "trailing update";
          update();
        }, Math.max(0, windowStart + 1000 - now) + 1);
      }
      return;
    }
    armSection();
    const changed = apply();
    if (changed) lastChangeTrigger = lastTrigger;
    // Whatever moved the layout, it may not be done: look again on the next frames until nothing
    // changes for a while (see settle).
    if (changed) settle();
  };

  // Publishes one measurement; true when any published value changed.
  const apply = (): boolean => {
    let changed = false;
    const measured = measure();
    if (measured.bottom !== currentBottom) {
      currentBottom = measured.bottom;
      changed = true;
      document.documentElement.style.setProperty(bottomProperty, measured.bottom + "px");
    }
    const firstBottom = measured.inset > 0 ? 0 : measured.bottom;
    if (firstBottom !== currentFirstBottom) {
      currentFirstBottom = firstBottom;
      changed = true;
      document.documentElement.style.setProperty(firstBottomProperty, firstBottom + "px");
    }
    if (measured.inset !== currentInset) {
      currentInset = measured.inset;
      changed = true;
      document.documentElement.style.setProperty(insetProperty, measured.inset + "px");
    }
    const next = measured.clearance;
    if (next !== current) {
      current = next;
      changed = true;
      document.documentElement.style.setProperty(property, next + "px");
    }
    return changed;
  };

  // The observers cover the events a layout announces. CI run 39916805010 published no inset while
  // a Description toggle sat under the toolbar, with the toolbar's own bottom already final: some
  // input of measure() moved after the last measurement without an observed event, and which one
  // is not proved (describe() now tells on the next failure). After a change, the layout is
  // therefore measured again on every animation frame until it has been unchanged for quietFrames
  // frames in a row, so a late layout always gets a final measurement. A layout that never settles
  // stops at maxFrames.
  const quietFrames = 60;
  const maxFrames = 300;
  let quiet = 0;
  let frames = 0;
  let frameRequested = false;
  const settle = (): void => {
    quiet = 0;
    if (frameRequested || typeof window.requestAnimationFrame !== "function") return;
    frameRequested = true;
    frames = 0;
    const tick = (): void => {
      frames += 1;
      armSection();
      if (apply()) {
        quiet = 0;
        lastChangeTrigger = "animation frame " + frames;
      } else {
        quiet += 1;
      }
      if (quiet < quietFrames && frames < maxFrames) {
        window.requestAnimationFrame(tick);
        return;
      }
      frameRequested = false;
    };
    window.requestAnimationFrame(tick);
  };

  // @implements_req SwRS-MDOKFSTUDIO-LAYOUT-018
  window.addEventListener("resize", on("window resize"));
  if (typeof ResizeObserver !== "undefined") {
    sectionObserver = new ResizeObserver(on("properties section resize"));
    const observer = new ResizeObserver(on("content or toolbar resize"));
    const content = document.getElementById(contentId);
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (content) observer.observe(content);
    if (toolbar) observer.observe(toolbar);
  }
  // Toolbar rows appear and disappear (edit mode, width mode, zoom) through attributes.
  if (typeof MutationObserver !== "undefined") {
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    if (toolbar) new MutationObserver(on("toolbar mutation")).observe(toolbar, { childList: true, subtree: true, attributes: true });
    // The first-block editor and the Start writing button come and go inside the column.
    const content = document.getElementById(contentId);
    // Link states, hidden toggles and text changes resize controls without adding or removing nodes.
    if (content) {
      new MutationObserver(on("content mutation")).observe(content, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["data-sphinx-preview-link-state", "hidden", "href"],
      });
    }
    new MutationObserver(on("root attribute")).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-sphinx-preview-edit-mode", "data-sphinx-preview-zoom", "data-sphinx-preview-width"] });
  }
  // A late web font (the toolbar icons, the text) changes widths without any element event.
  (document as Document & { fonts?: { addEventListener?: (type: string, listener: () => void) => void } })
    .fonts?.addEventListener?.("loadingdone", on("fonts loadingdone"));
  // Stylesheets, images and fonts that finish after the script ran move the controls without an event.
  window.addEventListener("load", on("window load"));
  (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(on("fonts ready"), () => undefined);
  on("install")();
  return {
    update,
    value: () => Math.max(0, current),
    inset: () => Math.max(0, currentInset),
    // Read-only: measuredNow differing from published means no event re-measured the last change.
    describe: () => ({
      published: { clearance: current, inset: currentInset, toolbarBottom: currentBottom },
      measuredNow: measure(),
      lastTrigger,
      lastChangeTrigger,
      updates,
      settling: frameRequested,
    }),
  };
}
