/**
 * The document clicks and keys of the page: a click or Enter on a mapped block reveals its source
 * line, or edits it in edit mode; a click on a properties cell edits the field; the issue badge,
 * the Description column toggle, the Refresh button.
 * The order in which these listeners are bound matters (see `../runtime.ts`).
 */

import { MAPPINGS_SELECTOR, type PageInput, type PageRuntime } from "./pageRuntime";

/**
 * The edit-mode clicks bound before the link navigation, so they also run first when listeners are
 * not capturing: a plain click on a link value edits its field, and a plain click on an image
 * inside a link edits its block instead of following the link; Cmd/Ctrl+click still navigates.
 */
export function bindEditModeCaptureClicks(rt: PageRuntime): void {
  const { document, state } = rt;
  document.addEventListener("click", (event) => {
    if (!state.editMode || event.metaKey || event.ctrlKey || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-sphinx-preview-navigation^="okf-link:"]');
    const cell = link ? link.closest("[data-okf-edit-cell]") : undefined;
    const row = cell ? cell.closest("tr[data-okf-field]") : undefined;
    if (!cell || !row || cell.getAttribute("data-okf-edit-cell") === "name"
      || row.getAttribute("data-okf-editable") !== "true") return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    rt.frontmatter.openFrontmatterEditor(row);
  }, true);
  document.addEventListener("click", (event) => {
    if (!state.editMode || event.metaKey || event.ctrlKey || !(event.target instanceof Element)) return;
    if (event.target.tagName !== "IMG" || !event.target.closest("a")) return;
    if (event.target.closest("[data-okf-properties]") || event.target.closest("[data-sphinx-preview-block-editor]")) return;
    const block = event.target.closest<HTMLElement>(MAPPINGS_SELECTOR);
    if (!block) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    rt.editMode.openMappedEditor(block, event.target, "end");
  }, true);
}

// @implements_req SwRS-MDOKFSTUDIO-TRUST-001
/** The document input of a page. */
export function installPageInput(rt: PageRuntime): PageInput {
  const { document, window, context, host, state, settings } = rt;

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-041
  // @implements_req SwRS-MDOKFSTUDIO-LIFE-032
  function refreshPreview(): void {
    rt.parts.linkTooltip.close();
    if (state.activeBlockEdit?.openRefused) rt.blockEditor.closeBlockEdit(false);
    const openEdit = state.activeBlockEdit || state.activeFrontmatterEdit;
    if (openEdit) {
      openEdit.status.textContent = "Save or cancel this edit before refreshing.";
      return;
    }
    const snapshot = rt.scroll.stateSnapshot(state.anchor?.line ?? rt.scroll.lineAtScroll(window.scrollY));
    host.postMessage({
      type: "previewRefresh",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      sourceLine: snapshot.sourceLine,
      scrollTop: snapshot.scrollTop,
      ...rt.scroll.anchorField(),
      ...(snapshot.focusedBlockId ? { focusedBlockId: snapshot.focusedBlockId } : {}),
      ...(snapshot.selectedText ? { selectedText: snapshot.selectedText } : {}),
      ...(snapshot.openDisclosures ? { openDisclosures: snapshot.openDisclosures } : {}),
      descriptionsCollapsed: state.descriptionsCollapsed,
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-108
  function postReveal(target: Element, activation: string): void {
    const line = target.getAttribute("data-sphinx-source-line");
    const sourceFile = target.getAttribute("data-sphinx-source-file");
    if (!line || !sourceFile) return;
    host.postMessage({
      type: "previewReveal",
      activation,
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      blockId: target.getAttribute("data-sphinx-preview-block"),
      sourceFile,
      line: Number(line),
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-014
  function applyDescriptionVisibility(): void {
    const collapsed = state.descriptionsCollapsed;
    document.documentElement?.setAttribute("data-okf-descriptions-collapsed", String(collapsed));
    document.querySelectorAll("[data-okf-description-toggle]").forEach((button) => {
      const label = collapsed ? "Expand Description column" : "Collapse Description column";
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    });
    document.querySelectorAll(".okf-info-row th[colspan]").forEach((cell) => {
      const withDocs = cell.closest(".okf-properties-docs");
      cell.setAttribute("colspan", withDocs && !collapsed ? "3" : "2");
    });
  }

  /** The element an event happened on, when it is an element. */
  const elementOf = (event: Event): Element | undefined => event.target instanceof Element ? event.target : undefined;

  return {
    refreshPreview,
    applyDescriptionVisibility,
    // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
    bindClicks() {
      // Registered first so a checkbox click never opens a block editor or reveals the source.
      rt.parts.checkboxes.bindClicks();
      // The header issue badge jumps to the first row with a problem. It must run before the mapped
      // block click handlers, which would otherwise reveal or edit the properties section.
      document.addEventListener("click", (event) => {
        const badge = event.target instanceof Element ? event.target.closest("[data-okf-badge]") : undefined;
        if (!badge) return;
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        const row = document.querySelector?.(
          "tr[data-okf-field].okf-error, tr[data-okf-field].okf-warning, tr[data-okf-field].okf-info");
        if (!row) return;
        row.scrollIntoView?.({ block: "center" });
        const cell = row.querySelector?.<HTMLElement>('[data-okf-edit-cell="value"]') ?? row.querySelector?.<HTMLElement>("th");
        if (cell) {
          if (cell.getAttribute("tabindex") === null) cell.setAttribute("tabindex", "-1");
          cell.focus?.({ preventScroll: true });
          cell.setAttribute("data-okf-issue-highlight", "true");
          window.setTimeout(() => cell.removeAttribute("data-okf-issue-highlight"), 1500);
        }
      });
      document.addEventListener("click", (event) => {
        const button = event.target instanceof Element
          ? event.target.closest("[data-okf-description-toggle]") : undefined;
        if (!button) return;
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        state.descriptionsCollapsed = !state.descriptionsCollapsed;
        applyDescriptionVisibility();
        rt.scroll.measure();
        // The snapshot carries the document id too: posted in the place of the message's own.
        const { documentId, ...snapshot } = rt.scroll.stateSnapshot(
          state.anchor?.line ?? rt.scroll.lineAtScroll(window.scrollY));
        host.postMessage({
          type: "previewState",
          documentId,
          revision: context.revision,
          requestId: context.requestId,
          ...snapshot,
        });
      });
      // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-001
      document.addEventListener("click", (event) => {
        if (event.target instanceof Element
          && event.target.closest('a[data-sphinx-preview-navigation^="okf-link:"]')) return;
        const frontmatterEditor = event.target instanceof Element
          ? event.target.closest("[data-okf-frontmatter-editor]")
          : undefined;
        if (frontmatterEditor) return;
        const cell = event.target instanceof Element
          ? event.target.closest("[data-okf-edit-cell]")
          : undefined;
        const row = cell?.closest("tr[data-okf-field]");
        if (!cell || !row || !state.editMode) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        if (cell.getAttribute("data-okf-edit-cell") === "name") {
          rt.frontmatter.openFrontmatterKeyEditor(row, cell);
        } else if (row.getAttribute("data-okf-type") === "checkbox") {
          rt.frontmatter.openFrontmatterEditor(row, { toggleBoolean: true });
        } else {
          rt.frontmatter.openFrontmatterEditor(row);
        }
      });
      // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
      // @implements_req SwRS-MDOKFSTUDIO-TABLE-018
      document.addEventListener("click", (event) => {
        const extendsSelection = state.editMode && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
        if (state.editMode && !extendsSelection) rt.selection.clearBlockSelection();
        if (event.target instanceof Element && event.target.closest(".sphinx-preview-insert-point")) return;
        // A row or column handle only moves its row or column: a click on it opens no editor.
        if (event.target instanceof Element
          && (event.target.closest("[data-okf-row-handle]") || event.target.closest("[data-okf-col-handle]"))) return;
        // A chip is reserved for expanding its comment; the rest of the block edits.
        if (event.target instanceof Element && event.target.closest(".okf-chip")) return;
        // The open thread is a small form of its own: clicking in it never opens the block editor.
        if (event.target instanceof Element
          && event.target.closest('.okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body')) return;
        const target = event.target instanceof Element
          ? event.target.closest<HTMLElement>(MAPPINGS_SELECTOR)
          : undefined;
        // In edit mode a click on a link inside a block only follows the link.
        if (!target || target.closest("a") || (state.editMode && event.target instanceof Element && event.target.closest("a"))) {
          if (state.editMode && state.activeBlockEdit?.selectedCell && !state.activeBlockEdit.finishing) {
            rt.blockEditor.postBlockEditSave(true);
          }
          return;
        }
        if (extendsSelection) {
          event.preventDefault?.();
          rt.selection.selectBlocksTo(target);
          return;
        }
        if (state.editMode) {
          event.preventDefault?.();
          const eventTarget = elementOf(event)!;
          rt.editMode.openMappedEditor(
            target,
            eventTarget,
            rt.editMode.clickCaretContext(target, eventTarget, event.clientX, event.clientY) ?? "end",
          );
          return;
        }
        postReveal(target, "click");
      });
      rt.editMode.bindHover();
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const element = elementOf(event);
        if (element && element.closest(".sphinx-preview-insert-point")) return;
        if (element
          && (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName)
            || (element as HTMLElement).isContentEditable)) return;
        if (element && element.closest("[data-okf-description-toggle]")) return;
        if (element && element.closest(".okf-chip")) return;
        if (element && element.closest('a[data-sphinx-preview-navigation^="okf-link:"]')) return;
        const frontmatterEditor = element ? element.closest("[data-okf-frontmatter-editor]") : undefined;
        const cell = element ? element.closest("[data-okf-edit-cell]") : undefined;
        const row = cell?.closest("tr[data-okf-field]");
        if (!frontmatterEditor && cell && row && state.editMode) {
          event.preventDefault?.();
          if (cell.getAttribute("data-okf-edit-cell") === "name") {
            rt.frontmatter.openFrontmatterKeyEditor(row, cell);
          } else {
            rt.frontmatter.openFrontmatterEditor(row);
          }
          return;
        }
        const target = element ? element.closest<HTMLElement>(MAPPINGS_SELECTOR) : undefined;
        if (!target || target.closest("a")) return;
        // In edit mode Enter or Space on a link inside a block only follows the link.
        if (state.editMode && element!.closest("a")) return;
        event.preventDefault?.();
        if (state.editMode) {
          rt.editMode.openMappedEditor(target, element!);
          return;
        }
        postReveal(target, "keyboard");
      });
    },
  };
}
