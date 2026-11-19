/**
 * The mapped blocks of the rendered content: the elements that carry a source file and line
 * ({@link MAPPINGS_SELECTOR}). These helpers read them from the page each time (a content patch
 * replaces them) and keep no state.
 */

import type { PreviewRuntimeContext } from "../../core/protocol/bootContext";
import { MAPPINGS_SELECTOR, type MappedBlocks } from "./pageRuntime";

/** A source path with forward slashes, to compare paths written on different platforms. */
export function normalizeSourcePath(value: string): string {
  return value.replaceAll("\\", "/");
}

/** The mapped-block helpers of a page. */
export function createMappedBlocks(document: Document, context: PreviewRuntimeContext): MappedBlocks {
  function validMappedBlocks(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(MAPPINGS_SELECTOR)).filter((element) => {
      const sourceFile = element.getAttribute("data-sphinx-source-file");
      const documentId = element.getAttribute("data-sphinx-preview-document");
      const sourceLine = Number(element.getAttribute("data-sphinx-source-line"));
      return documentId === context.documentId
        && sourceFile
        && normalizeSourcePath(sourceFile) === normalizeSourcePath(context.activeSourceFile)
        && Number.isSafeInteger(sourceLine)
        && sourceLine >= 1;
    });
  }

  function byLine(left: Element, right: Element): number {
    return Number(left.getAttribute("data-sphinx-source-line")) - Number(right.getAttribute("data-sphinx-source-line"));
  }

  function topLevelMappedBlocks(): HTMLElement[] {
    const mapped = validMappedBlocks();
    const mappedSet = new Set<Element>(mapped);
    return mapped
      .filter((element) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (mappedSet.has(parent)) return false;
        }
        return true;
      })
      .sort(byLine);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
  // The mapped blocks one level inside `block`: those whose nearest mapped ancestor is `block`.
  function mappedChildren(block: Element): HTMLElement[] {
    const mapped = validMappedBlocks();
    const mappedSet = new Set<Element>(mapped);
    return mapped
      .filter((element) => {
        if (element === block || !block.contains(element)) return false;
        let parent = element.parentElement;
        while (parent && !mappedSet.has(parent)) parent = parent.parentElement;
        return parent === block;
      })
      .sort(byLine);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-148
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-008
  function selectableBlocks(): HTMLElement[] {
    return topLevelMappedBlocks().filter((block) => block.getAttribute("data-okf-properties") === null
      && block.getAttribute("data-okf-folded") === null);
  }

  function blockRange(block: Element): { line: number; endLine: number } {
    const line = Number(block.getAttribute("data-sphinx-source-line"));
    const endLine = Number(block.getAttribute("data-sphinx-source-end-line") || line);
    return { line, endLine };
  }

  function isIncludedBlock(block: Element): boolean {
    return block.getAttribute("data-sphinx-preview-included") !== null
      || Boolean(block.closest?.("[data-sphinx-preview-included]"));
  }

  function bodyBlockAtLine(line: number): HTMLElement | undefined {
    return topLevelMappedBlocks().find((block) =>
      block.getAttribute("data-okf-properties") === null
      && block.getAttribute("data-okf-folded") === null
      && Number(block.getAttribute("data-sphinx-source-line")) === line);
  }

  function propertiesSection(): HTMLElement | null | undefined {
    return topLevelMappedBlocks().find((block) => block.getAttribute("data-okf-properties") !== null)
      ?? document.querySelector?.<HTMLElement>("[data-okf-properties]");
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
  function sourceRangeForList(list: Element, reference: Element): { line: number; endLine: number } | undefined {
    const mappedElements: Element[] = [];
    if (list.getAttribute("data-sphinx-source-line") !== null) mappedElements.push(list);
    mappedElements.push(...list.querySelectorAll(MAPPINGS_SELECTOR));
    return spanOf(mappedElements, reference);
  }

  // The first and last line of the `elements` mapped to the same source file and document as
  // `reference`.
  function spanOf(elements: Element[], reference: Element): { line: number; endLine: number } | undefined {
    const sourceFile = reference.getAttribute("data-sphinx-source-file");
    const documentId = reference.getAttribute("data-sphinx-preview-document");
    let firstLine = Number.POSITIVE_INFINITY;
    let lastLine = 0;
    for (const element of elements) {
      if (
        element.getAttribute("data-sphinx-source-file") !== sourceFile
        || element.getAttribute("data-sphinx-preview-document") !== documentId
      ) continue;
      const line = Number(element.getAttribute("data-sphinx-source-line"));
      const endLine = Number(element.getAttribute("data-sphinx-source-end-line") || line);
      if (
        !Number.isSafeInteger(line)
        || line < 1
        || !Number.isSafeInteger(endLine)
        || endLine < line
      ) continue;
      firstLine = Math.min(firstLine, line);
      lastLine = Math.max(lastLine, endLine);
    }
    return Number.isFinite(firstLine) ? { line: firstLine, endLine: lastLine } : undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-GFM-009
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
  // The lines of a mapped GitHub alert of the same file and document as `reference`: from its
  // marker line to its last quoted line.
  function sourceRangeForAlert(alert: Element, reference: Element): { line: number; endLine: number } | undefined {
    if (
      alert.getAttribute("data-sphinx-source-file") !== reference.getAttribute("data-sphinx-source-file")
      || alert.getAttribute("data-sphinx-preview-document") !== reference.getAttribute("data-sphinx-preview-document")
    ) return undefined;
    const line = Number(alert.getAttribute("data-sphinx-source-line"));
    const endLine = Number(alert.getAttribute("data-sphinx-source-end-line") || line);
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(endLine) || endLine < line) return undefined;
    return { line, endLine };
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
  // The lines of a list item: the range the renderer gives the item (from its first line to the
  // line before the next item, so a blank line that separates two items belongs to the first,
  // as it belongs to the list), widened to the mapped blocks inside it.
  function sourceRangeForItem(item: Element, reference: Element): { line: number; endLine: number } | undefined {
    return spanOf([item, ...item.querySelectorAll(MAPPINGS_SELECTOR)], reference);
  }

  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
  // The lines of a block inside a list item, edited on its own from the keyboard. The paragraph of
  // a tight item is mapped to its first line only: a block mapped to one line reaches the line
  // before the next mapped block of the item, or the end of the item.
  function sourceRangeForInnerBlock(block: Element, item: Element): { line: number; endLine: number } | undefined {
    const span = spanOf([block], block);
    if (!span || span.endLine > span.line) return span;
    const itemEnd = Number(item.getAttribute("data-sphinx-source-end-line"));
    const next = mappedChildren(item).map((child) => Number(child.getAttribute("data-sphinx-source-line")))
      .filter((line) => line > span.line)
      .sort((left, right) => left - right)[0];
    const limit = next !== undefined ? next - 1 : itemEnd;
    return Number.isSafeInteger(limit) && limit > span.endLine ? { line: span.line, endLine: limit } : span;
  }

  function editingElementFor(target: HTMLElement, options: { exact?: boolean } = {}): ReturnType<MappedBlocks["editingElementFor"]> {
    // A block in the body of a GitHub alert or of a MyST admonition (a paragraph, a list) edits the
    // whole alert or directive, like a click on its title; the nearest one wins, and one inside a
    // list item edits that block, not the list.
    // A context-tag panel (SwRS-MDOKFSTUDIO-MYST-013) is not an admonition directive: a click in its
    // body keeps opening the clicked block only.
    const alertSelector = "[data-okf-github-alert], aside.admonition, details.admonition";
    let alert = target.closest?.<HTMLElement>(alertSelector) ?? null;
    while (alert && alert.getAttribute("class")?.split(/\s+/u).includes("myst-context-admonition")) {
      alert = alert.parentElement?.closest?.<HTMLElement>(alertSelector) ?? null;
    }
    if (alert) {
      const sourceRange = sourceRangeForAlert(alert, target);
      if (sourceRange) return { element: alert, sourceRange };
    }
    // A click in a list item edits that item; a click on the list itself (outside its items)
    // edits the whole list. From the keyboard (`exact`), a block inside an item edits that block.
    const list = target.closest?.<HTMLElement>("ul, ol");
    if (list) {
      const item = target.closest?.<HTMLElement>("li");
      if (item && item.parentElement === list) {
        if (options.exact && target !== item) {
          const sourceRange = sourceRangeForInnerBlock(target, item);
          if (sourceRange) return { element: target, sourceRange };
        } else {
          const sourceRange = sourceRangeForItem(item, target);
          if (sourceRange) return { element: item, sourceRange };
        }
      }
      const sourceRange = sourceRangeForList(list, target);
      if (sourceRange) return { element: list, sourceRange };
    }
    return { element: target, sourceRange: undefined };
  }

  function hasRenderedPreview(): boolean {
    const status = document.querySelector?.("[data-sphinx-preview-status]")
      ?.getAttribute?.("data-sphinx-preview-status");
    return status === "success" || status === "recovery";
  }

  return {
    topLevelMappedBlocks,
    mappedChildren,
    selectableBlocks,
    blockRange,
    isIncludedBlock,
    bodyBlockAtLine,
    propertiesSection,
    editingElementFor,
    hasRenderedPreview,
  };
}
