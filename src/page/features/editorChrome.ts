/**
 * What an open editor shows around its text box: the edition palette above the frame (sticky while
 * it is small), the link panel and the figure form under it, and the table toolbar kept clear of
 * the sticky heading band and the preview controls. Opening a row above the text box scrolls the
 * page so the text the user is editing stays where it was.
 */

import { caretRectOf, caretRevealDelta } from "../modules/caretRect";
import { createFigurePanel } from "../modules/figurePanel";
import { createLinkPanel } from "../modules/linkPanel";
import type { BlockEdit, EditorChrome, PageRuntime } from "./pageRuntime";

/** A rectangle as the toolbar placement reads it (a `DOMRect`, or the parts of one). */
type BarRect = Parameters<EditorChrome["toolbarUsableTop"]>[0];

/** The editor chrome of a page. */
export function installEditorChrome(rt: PageRuntime): EditorChrome {
  const { document, window, state } = rt;
  const { editActions, figureTools } = rt.tools;

  // The top of the strip of the viewport where the table toolbar is fully usable: below the sticky
  // heading band (its measured bottom when that exceeds the reserved reading offset) and, when the
  // toolbar shares horizontal space with the fixed preview controls, below those controls.
  // "content" (optional) is the element behind the rectangle "bar": only its visible controls and
  // text count against the preview controls (a wide toolbar box whose right part is empty does not
  // need to clear a toolbar that only covers that empty part). An element without any visible item
  // yet (a menu that is still being filled) is checked again when it grows.
  function toolbarUsableTop(bar: BarRect, content?: Element): number {
    let usableTop = readingAreaTop();
    const controls = document.querySelector?.("[data-sphinx-preview-toolbar]")?.getBoundingClientRect?.();
    if (controls && Number.isFinite(controls.bottom) && Number.isFinite(controls.left)) {
      const controlsRight = Number.isFinite(controls.right) ? controls.right : controls.left + controls.width;
      const barRight = Number.isFinite(bar.right) ? bar.right as number : bar.left + bar.width;
      if (Number.isFinite(controlsRight) && Number.isFinite(barRight)
        && bar.left < controlsRight && barRight > controls.left) {
        const visible = Array.from(content?.querySelectorAll?.("button, input, textarea, select, a, span, p") ?? [])
          .map((item) => item.getBoundingClientRect?.())
          .filter((box) => box && box.width > 0 && box.height > 0 && Number.isFinite(box.left)
            && Number.isFinite(box.top))
          .map((box) => ({ top: box.top, left: box.left, right: Number.isFinite(box.right) ? box.right : box.left + box.width }));
        const items = visible.filter((box) => box.left < controlsRight && box.right > controls.left);
        if (!content) {
          usableTop = Math.max(usableTop, controls.bottom + 4);
        } else if (items.length > 0) {
          // The bar must move down until its first item sharing columns with the controls clears them.
          const offset = Math.min(...items.map((box) => box.top)) - bar.top;
          usableTop = Math.max(usableTop, controls.bottom + 4 - offset);
        }
      }
    }
    return usableTop;
  }

  // The top of the reading area: the reading offset, or the sticky heading band's measured bottom
  // when it is lower.
  function readingAreaTop(): number {
    const stickyBand = rt.parts.stickyBand;
    stickyBand.refreshReadingOffset();
    let top = stickyBand.readingOffset();
    const stickyHeadings = stickyBand.element;
    if (stickyHeadings && !stickyHeadings.hidden) {
      const band = stickyHeadings.getBoundingClientRect?.();
      if (band && Number.isFinite(band.bottom)) top = Math.max(top, band.bottom);
    }
    return top;
  }

  // @implements_req SwRS-MDOKFSTUDIO-TABLE-064
  // Keeps the table toolbar fully visible while its table is edited: when it sits above the usable
  // top of the viewport (under the sticky band or the preview controls, or off-screen), scroll up
  // just enough to show it, but only if the selected cell stays inside the viewport. The scroll is
  // a preview-owned programmatic one. Called when the toolbar appears and after every anchor
  // restore, so a later layout change (for example a wrapping status line) cannot hide it again.
  function revealTableToolbar(menu: HTMLElement, cell: Element): void {
    const bar = menu.getBoundingClientRect?.();
    const cellRect = cell?.getBoundingClientRect?.();
    if (!bar || !cellRect || !Number.isFinite(bar.top) || !Number.isFinite(cellRect.bottom)) return;
    const wanted = toolbarUsableTop(bar, menu) - bar.top;
    const delta = Math.min(wanted, window.scrollY);
    if (!(delta > 0)) return;
    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
    if (!(viewportHeight > 0) || cellRect.bottom + delta > viewportHeight) return;
    const target = window.scrollY - delta;
    rt.scroll.programmaticScroll(target);
    if (state.editAnchor?.element) state.editAnchor.viewportTop += delta;
    const line = rt.scroll.lineAtScroll(target);
    if (line !== undefined) state.anchor = { line, owner: state.anchor?.owner ?? "preview" };
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
  // After a row (the palette, the link panel) was added above the text box, the page scrolls down
  // by the height it added so the text the user is editing stays where it was. Returns the shift
  // applied: none on a page at its very top, and never more than the room under the sticky band.
  // The palette sits on top of the frame, attached to it, in a host that holds both: the host
  // bounds the palette's sticky position, so it follows a tall frame and leaves with it.
  function placePaletteAboveFrame(edit: BlockEdit, paletteElement: HTMLElement): void {
    if (!edit.host) {
      const frameHost = document.createElement("div");
      frameHost.className = "sphinx-preview-block-editor-host";
      if (edit.element.className?.includes?.("sphinx-preview-block-editor--first")) {
        frameHost.className += " sphinx-preview-block-editor--first";
      }
      frameHost.setAttribute("data-sphinx-preview-block-editor-host", "true");
      // Like the frame, the palette's clicks never reach the page's block click handling.
      frameHost.addEventListener("click", (event) => event.stopPropagation?.());
      edit.element.before(frameHost);
      frameHost.appendChild(edit.element);
      edit.host = frameHost;
    }
    edit.host.insertBefore(paletteElement, edit.element);
  }

  // A frame taller than the viewport: the user's rule for it is a bar stuck at the top of the pane
  // that may cover the first lines, the text scrolling under it (CR 123).
  function isTallFrame(edit: BlockEdit): boolean {
    const height = edit.element.getBoundingClientRect?.()?.height;
    return height !== undefined && Number.isFinite(height) && height > window.innerHeight;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
  // The line a tall frame's bar sticks to: 4 px under the sticky heading band as it shows now (the
  // top of the pane when it is hidden; synced again after the band follows a scroll) when none of the bar's buttons shares columns with the
  // preview controls (they only overlap its empty end), else the stylesheet's line under the
  // controls (no property). Measured again only when the pane, the bar, the band or the tall state
  // change, never on a plain scroll.
  function syncTallPaletteTop(edit: BlockEdit, bar: DOMRect): void {
    const host = edit.host!;
    const tall = isTallFrame(edit);
    const band = rt.parts.stickyBand.element;
    const bandBottom = band && !band.hidden ? band.getBoundingClientRect?.()?.bottom : undefined;
    const reading = bandBottom !== undefined && Number.isFinite(bandBottom) ? Math.max(0, bandBottom) : 0;
    const key = tall
      ? [window.innerWidth, window.innerHeight, Math.round(bar.width), Math.round(bar.height), Math.round(reading)].join("x")
      : "";
    if (key === (edit.paletteTopKey ?? "")) return;
    edit.paletteTopKey = key;
    const clear = tall && toolbarUsableTop(bar, edit.palette!.element) <= readingAreaTop() + 0.5;
    if (clear) {
      host.setAttribute("data-sphinx-palette-top", "true");
      host.style?.setProperty?.("--sphinx-preview-palette-top", Math.ceil(reading) + "px");
    } else {
      host.removeAttribute("data-sphinx-palette-top");
      host.style?.removeProperty?.("--sphinx-preview-palette-top");
    }
  }

  // A tall box scrolls under the stuck palette: the palette stays sticky only while it is small
  // next to the viewport (the CSS also drops it in narrow or short panes), and the page keeps
  // the caret clear of it (scroll-padding for native scrolling, plus a nudge after caret moves).
  function syncPaletteSticky(edit: BlockEdit): void {
    const bar = edit.palette?.element?.getBoundingClientRect?.();
    if (!edit.host || !bar || !Number.isFinite(bar.height)) return;
    const small = bar.height <= window.innerHeight * 0.4;
    if (small) edit.host.removeAttribute("data-sphinx-palette-static");
    else edit.host.setAttribute("data-sphinx-palette-static", "true");
    syncTallPaletteTop(edit, bar);
    const style = window.getComputedStyle?.(edit.palette!.element);
    const flowing = style?.position !== "sticky";
    // Scroll padding only while the bar is stuck over the box: with the bar in its place above the
    // box it would make the browser scroll the page for a caret that is not hidden.
    const frameTop = edit.element.getBoundingClientRect?.()?.top;
    const stuck = !flowing && Number.isFinite(frameTop) && bar.bottom > frameTop + 0.5;
    const tallTop = edit.host.getAttribute("data-sphinx-palette-top") === "true"
      ? Number.parseFloat(style?.top ?? "") : Number.NaN;
    const padding = !(small && stuck)
      ? ""
      : Number.isFinite(tallTop)
      ? Math.ceil(tallTop + bar.height + 8) + "px"
      : "calc(max(var(--sphinx-preview-reading-offset, 0px), var(--sphinx-preview-toolbar-bottom, 0px)) + "
        + Math.ceil(bar.height + 12) + "px)";
    if (padding) document.documentElement?.style?.setProperty?.("scroll-padding-top", padding);
    else document.documentElement?.style?.removeProperty?.("scroll-padding-top");
  }

  function revealCaretBelowPalette(edit: BlockEdit, textarea: HTMLTextAreaElement): void {
    if (!edit.host || !edit.palette || edit.finishing || state.activeBlockEdit !== edit) return;
    if (edit.host.getAttribute("data-sphinx-palette-static") === "true") return;
    const bar = edit.palette.element.getBoundingClientRect?.();
    const frame = edit.element.getBoundingClientRect?.();
    const caret = caretRectOf(document, window, textarea);
    if (!bar || !frame || !caret) return;
    const delta = caretRevealDelta(caret, bar, frame, window.innerHeight);
    if (!delta) return;
    const target = Math.max(0, Math.min(rt.scroll.maxScrollTop(), window.scrollY + delta));
    rt.scroll.programmaticScroll(target);
    if (state.editAnchor?.element) {
      const viewportTop = state.editAnchor.element.getBoundingClientRect().top;
      if (Number.isFinite(viewportTop)) state.editAnchor.viewportTop = viewportTop;
    }
  }

  // The editor frame and, in a block editor, the host that also holds the palette above it.
  function frameContains(edit: BlockEdit, node: Node | null | undefined): boolean {
    if (!node) return false;
    const root = edit.host ?? edit.element;
    return node === root || node === edit.element || Boolean(root.contains?.(node))
      || Boolean(edit.element.contains?.(node));
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-228
  // Opening the palette adds its height above the frame, in the host. The frame is the scroll
  // anchor, so the text would stay where it is and the content above scrolls up by that height
  // (scroll shift). Not on a page scrolled to its top, and never so far that the bar would end
  // under the sticky band or the preview controls: the frame then goes down by the difference.
  // A frame taller than the viewport whose host is above that line keeps the text in place (the
  // whole height): its bar sticks at the top of the pane over the first lines (CR 123).
  // Returns the scroll shift, which a close scrolls back.
  function keepTextInPlaceBelowPalette(edit: BlockEdit, textTopBefore: number | undefined): number {
    const textTopAfter = edit.textarea!.getBoundingClientRect?.().top;
    const height = textTopAfter - (textTopBefore as number);
    if (!state.editAnchor?.element || !Number.isFinite(textTopBefore) || !Number.isFinite(textTopAfter) || !(height > 0)) {
      return 0;
    }
    let shift = 0;
    if (window.scrollY > 0) {
      // The palette's own place is the top of its host: the bar's rectangle is not it while the bar
      // is stuck below the preview controls (that would count the stuck distance as free room).
      const bar = edit.palette!.element.getBoundingClientRect?.();
      const natural = edit.host?.getBoundingClientRect?.()?.top;
      const top = Number.isFinite(natural) ? natural : bar?.top;
      if (top !== undefined && Number.isFinite(top)) {
        const usable = toolbarUsableTop(bar ?? { top, left: 0, width: 0 });
        if (isTallFrame(edit) && top < usable) {
          shift = height;
        } else {
          shift = Math.min(height, Math.max(0, top - usable));
          // Not enough room below the preview controls: scroll up (the text goes down) so the bar
          // keeps its place instead of being stuck over the first lines of the text, as long as the
          // frame stays in the viewport. The close scrolls back (a negative shift).
          const frameBottom = edit.element.getBoundingClientRect?.()?.bottom;
          const spare = Number.isFinite(frameBottom) ? Math.max(0, window.innerHeight - 24 - frameBottom) : 0;
          shift -= Math.min(Math.max(0, usable - top), spare, window.scrollY + shift);
        }
      }
    }
    state.editAnchor.viewportTop += height - shift;
    return shift;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-021
  // The sticky palette stays under the preview controls and the sticky band. A block whose host is
  // closer to the top than that line (a block near the top of the page, a pane narrow enough for
  // the controls to share its columns) gets its bar pushed down over the frame, hiding the first
  // lines and the top of the panels in it (text box, figure form, table bar). The frame reserves
  // that distance as its top margin (collapsed with the bar's own 3px, so the gap is distance + 3),
  // and the page keeps the text where the user sees it. Measured when the editor opens and when
  // the layout changes (resize, the bar wrapping), never while the user scrolls. Past one bar
  // height the frame's top is already scrolled under the bar: nothing to reserve. A frame taller
  // than the viewport reserves nothing either: its bar may cover the first lines (CR 123).
  function reservePaletteClearance(edit: BlockEdit): void {
    const host = edit.host;
    const palette = edit.palette?.element;
    if (!host || !palette) return;
    let reserve = 0;
    const style = window.getComputedStyle?.(palette);
    if (style?.position === "sticky" && !isTallFrame(edit)) {
      const stuckAt = Number.parseFloat(style.top);
      const hostTop = host.getBoundingClientRect?.()?.top;
      const barHeight = palette.getBoundingClientRect?.()?.height;
      if (Number.isFinite(stuckAt) && hostTop !== undefined && Number.isFinite(hostTop)
        && barHeight !== undefined && Number.isFinite(barHeight)) {
        const distance = stuckAt - hostTop;
        if (distance > 0.5 && distance <= barHeight + 3) reserve = Math.ceil(distance) + 3;
      }
    }
    const before = edit.paletteReserve ?? 0;
    if (reserve === before) return;
    edit.paletteReserve = reserve;
    if (reserve > 0) host.style?.setProperty?.("--sphinx-preview-palette-reserve", reserve + "px");
    else host.style?.removeProperty?.("--sphinx-preview-palette-reserve");
    // The text goes down with the frame: the anchor accepts it instead of scrolling it back.
    if (state.editAnchor?.element) state.editAnchor.viewportTop += Math.max(3, reserve) - Math.max(3, before);
  }

  function keepTextInPlace(edit: BlockEdit, textTopBefore: number | undefined): number {
    const textTopAfter = edit.textarea!.getBoundingClientRect?.().top;
    if (
      !(window.scrollY > 0)
      || !state.editAnchor?.element
      || !Number.isFinite(textTopBefore)
      || !Number.isFinite(textTopAfter)
    ) return 0;
    const frame = edit.element.getBoundingClientRect?.();
    // The palette sits on top of the frame, in the host: the room ends where the host's top meets
    // the usable top, so the bar keeps its own place and never rides over the frame's first lines.
    const hostTop = edit.host?.getBoundingClientRect?.()?.top;
    const top = hostTop !== undefined && Number.isFinite(hostTop) ? hostTop : frame?.top;
    const room = frame && top !== undefined && Number.isFinite(top)
      ? Math.max(0, top - toolbarUsableTop(frame))
      : 0;
    const shift = Math.min(textTopAfter - (textTopBefore as number), room);
    if (!(shift > 0)) return 0;
    state.editAnchor.viewportTop -= shift;
    return shift;
  }

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-089
  // The link panel (Cmd/Ctrl+K and the palette's Link button): Text and URL fields under the
  // palette. The text box selection is remembered on open and restored on every way out; the
  // blur commit of the text box ignores the move into the panel.
  const openLinkPanel: EditorChrome["openLinkPanel"] = (control, onFallbackInput) => {
    const edit = state.activeBlockEdit;
    // In a table cell the panel sits inside the table bar, under the buttons.
    const inCell = Boolean(edit?.selectedCell);
    const palette = inCell ? edit?.cellPalette : edit?.palette;
    if (!edit || edit.finishing || (inCell ? edit.tableInput : edit.textarea) !== control || !palette) return;
    if (edit.linkPanel) {
      edit.linkPanel.focusFirst();
      return;
    }
    palette.closePopover();
    const selection = {
      value: String(control.value ?? ""),
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
      scope: inCell ? "cell" as const : "block" as const,
    };
    const draft = editActions.linkDraft(selection);
    // "restore" is false when the user went back to the text box: its caret and text are theirs.
    const closePanel = (restore = true): void => {
      const panel = edit.linkPanel;
      if (!panel) return;
      edit.linkPanel = undefined;
      edit.closeLinkPanel = undefined;
      panel.destroy();
      if (restore) {
        control.focus({ preventScroll: true });
        control.setSelectionRange(selection.selectionStart, selection.selectionEnd);
      }
      const shift = edit.linkPanelShift ?? 0;
      edit.linkPanelShift = 0;
      if (shift > 0 && state.activeBlockEdit === edit && state.editAnchor) {
        edit.paletteShift = (edit.paletteShift ?? 0) - shift;
        state.editAnchor.viewportTop += shift;
        rt.scroll.applyAnchor();
      }
    };
    const panel = createLinkPanel(document, {
      text: draft.text,
      url: draft.url,
      onSubmit: (text, url) => {
        if (state.activeBlockEdit !== edit || edit.finishing) return;
        // The offsets were taken when the panel opened; a changed text makes them meaningless.
        if (String(control.value ?? "") !== selection.value) {
          closePanel(false);
          return;
        }
        closePanel();
        rt.textControls.applyTextEdit(control, editActions.linkEdit(selection, text, url), onFallbackInput);
      },
      onCancel: () => closePanel(),
      // @implements_req SwRS-MDOKFSTUDIO-PALETTE-036
      onLeave: () => {
        if (state.activeBlockEdit === edit) rt.blockEditor.saveBlockEdit();
      },
      isInsideFrame: (node) => frameContains(edit, node as Node | null | undefined)
        || (inCell && Boolean(node) && Boolean(edit.tableMenu) && edit.tableMenu!.contains(node as Node)),
    });
    edit.linkPanel = panel;
    edit.closeLinkPanel = closePanel;
    const textTopBefore = control.getBoundingClientRect?.().top;
    if (inCell) edit.tableMenu!.appendChild(panel.element);
    else edit.element.insertBefore(panel.element, control);
    const shift = inCell ? 0 : keepTextInPlace(edit, textTopBefore);
    edit.linkPanelShift = shift;
    if (shift > 0) edit.paletteShift = (edit.paletteShift ?? 0) + shift;
    rt.scroll.applyAnchor();
    panel.focusFirst();
  };

  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-160
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-150
  // The figure form: the {figure} directive around the caret (the first one when the editor was
  // opened by the Edit figure button), or a Markdown image alone in its paragraph. Apply rewrites
  // that range as one native edit; the text box keeps its caret and the editor stays open.
  const openFigurePanel: EditorChrome["openFigurePanel"] = (control, onFallbackInput, first = false, focus) => {
    const edit = state.activeBlockEdit;
    if (!edit || edit.finishing || edit.textarea !== control || !edit.palette) return;
    if (edit.figurePanel) {
      edit.figurePanel.focusFirst();
      return;
    }
    edit.palette.closePopover();
    edit.closeLinkPanel?.(false);
    const text = String(control.value ?? "");
    const location = figureTools.locateFigure(text, first ? undefined : Number(control.selectionStart));
    if (!location) {
      edit.status.textContent = "No figure at the caret.";
      return;
    }
    const slice = text.slice(location.start, location.end);
    const model = location.kind === "image"
      ? figureTools.modelFromImage(location.alt ?? "", location.source ?? "")
      : figureTools.parseFigure(slice);
    if (!model) {
      edit.status.textContent = "This figure uses a YAML option block: edit it in the text box.";
      return;
    }
    const selection = {
      selectionStart: Number(control.selectionStart),
      selectionEnd: Number(control.selectionEnd),
    };
    const closePanel = (restore = true): void => {
      const panel = edit.figurePanel;
      if (!panel) return;
      edit.figurePanel = undefined;
      edit.closeFigurePanel = undefined;
      panel.destroy();
      if (restore) {
        control.focus({ preventScroll: true });
        control.setSelectionRange(selection.selectionStart, selection.selectionEnd);
      }
      const shift = edit.figurePanelShift ?? 0;
      edit.figurePanelShift = 0;
      if (shift > 0 && state.activeBlockEdit === edit && state.editAnchor) {
        edit.paletteShift = (edit.paletteShift ?? 0) - shift;
        state.editAnchor.viewportTop += shift;
        rt.scroll.applyAnchor();
      }
    };
    const panel = createFigurePanel(document, {
      values: figureTools.valuesOf(model),
      mode: location.kind === "image" ? "image" : "figure",
      validate: (values) => figureTools.validate(values),
      browse: (done) => rt.parts.hostRequests.ask("previewPickImage", {}, { dialog: true }, (result) => {
        done(result.ok === true && typeof result.path === "string" ? result.path : undefined);
        if (result.ok !== true && state.activeBlockEdit === edit && typeof result.reason === "string") {
          edit.status.textContent = result.reason;
        }
      }),
      onSubmit: (values) => {
        if (state.activeBlockEdit !== edit || edit.finishing) return;
        // The range was taken when the form opened; a text changed without an input event is stale.
        if (String(control.value ?? "") !== text) {
          closePanel(false);
          return;
        }
        const written = figureTools.serializeFigure(figureTools.applyValues(model, values));
        closePanel(false);
        if (written === slice) {
          control.focus({ preventScroll: true });
          control.setSelectionRange(selection.selectionStart, selection.selectionEnd);
          return;
        }
        rt.textControls.applyTextEdit(control, {
          start: location.start,
          end: location.end,
          text: written,
          selectionStart: location.start,
          selectionEnd: location.start,
        }, onFallbackInput);
      },
      onCancel: () => closePanel(),
      onLeave: () => {
        if (rt.parts.hostRequests.isDialogOpen()) return;
        if (state.activeBlockEdit === edit) rt.blockEditor.saveBlockEdit();
      },
      isInsideFrame: (node) => frameContains(edit, node as Node | null | undefined),
    });
    edit.figurePanel = panel;
    edit.closeFigurePanel = closePanel;
    const textTopBefore = control.getBoundingClientRect?.().top;
    edit.element.insertBefore(panel.element, control);
    const shift = keepTextInPlace(edit, textTopBefore);
    edit.figurePanelShift = shift;
    if (shift > 0) edit.paletteShift = (edit.paletteShift ?? 0) + shift;
    rt.scroll.applyAnchor();
    if (focus === "caption") panel.focusCaption();
    else panel.focusFirst();
  };

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-153
  // The Edit figure button: open the figure's block editor, then its form once the source arrives.
  function openFigureEditor(figure: HTMLElement): void {
    if (!state.editMode || state.activeFrontmatterEdit) return;
    if (state.activeBlockEdit) {
      if (state.activeBlockEdit.finishing || state.activeBlockEdit.selectedCell) return;
      if (state.activeBlockEdit.target === figure) {
        if (state.activeBlockEdit.textarea) openFigurePanel(state.activeBlockEdit.textarea, () => undefined, true);
        return;
      }
      rt.blockEditor.saveBlockEdit();
      return;
    }
    rt.editMode.openMappedEditor(figure, figure, "end", true);
    const opened = openEdit();
    if (opened && opened.target === figure) {
      // A host that answers the source request at once has put the text box in already.
      if (opened.textarea) openFigurePanel(opened.textarea, () => undefined, true);
      else opened.openFigureForm = true;
    }
  }

  // The open block editor, read again after a call that may have opened one.
  function openEdit(): BlockEdit | undefined {
    return state.activeBlockEdit;
  }

  return {
    toolbarUsableTop,
    revealTableToolbar,
    placePaletteAboveFrame,
    syncPaletteSticky,
    reservePaletteClearance,
    revealCaretBelowPalette,
    frameContains,
    keepTextInPlaceBelowPalette,
    openLinkPanel,
    openFigurePanel,
    openFigureEditor,
    bindPaletteSticky() {
      window.addEventListener("resize", () => {
        if (!state.activeBlockEdit?.host) return;
        syncPaletteSticky(state.activeBlockEdit);
        reservePaletteClearance(state.activeBlockEdit);
      });
      window.addEventListener("scroll", () => {
        if (state.activeBlockEdit?.host) syncPaletteSticky(state.activeBlockEdit);
      }, { passive: true });
    },
  };
}
