/**
 * Diagnostics of a page (they change nothing in it): the editor trace, read by the tests through
 * `window.__studioDiagnostics` so that a missing editor names what closed it, and the key
 * containment of text controls and open editors, whose decisions it records.
 */

import type { PreviewRuntimeContext } from "../core/protocol/bootContext";
import { createEditorTrace, type EditorTraceEntry } from "./modules/editorTrace";
import { installEditorKeyContainment, isHandledEditorKey } from "./modules/editorKeys";
import { installSelectAllInControls, isTextSelectAll } from "./modules/selectAllKey";
import { isApplePlatform } from "./pageSettings";

/** The editor trace of a page and the helpers its records use. */
export interface PageDiagnostics {
  /** The trace (see editorTrace.ts). */
  readonly editorTrace: ReturnType<typeof createEditorTrace>;
  /** The focused element and whether the page has the focus, for a trace detail. */
  traceFocus(): string;
  /** The named callers of the function that calls this, for a trace record. */
  traceStack(): string;
  /** Publishes `window.__studioDiagnostics` (trace, start time, first clearance). */
  expose(firstClearance: { describe(): unknown }): void;
}

/**
 * Starts the trace with the page's request, records focus moves, and keeps Cmd/Ctrl+A in text
 * controls and the keys an open editor handled in the page.
 */
export function installPageDiagnostics(
  document: Document,
  window: Window & typeof globalThis,
  context: PreviewRuntimeContext,
): PageDiagnostics {
  const editorTrace = createEditorTrace(40, () => (window.performance?.now?.() ?? Date.now()));
  // Wall-clock time of the trace's "at" 0, so a test can line the trace up with host-side events.
  const traceStartedAt = Date.now();
  const traceFocus = (): string => {
    const active = document.activeElement;
    const focused = typeof document.hasFocus === "function" ? String(document.hasFocus()) : "unknown";
    return "active=" + (active ? String(active.tagName).toLowerCase() : "none") + " pageFocus=" + focused;
  };
  const traceStack = (): string => editorTrace.callers(new Error().stack, 2);
  const tagOf = (target: EventTarget | null): string => {
    const element = target as { tagName?: unknown } | null;
    return element && element.tagName ? String(element.tagName).toLowerCase() : "unknown";
  };
  editorTrace.record("page", "request " + context.requestId + " version " + context.revision);
  window.addEventListener("focus", () => editorTrace.record("page focus", traceFocus()));
  window.addEventListener("blur", () => editorTrace.record("page blur", traceFocus()));
  // A press that reached the page, once its handlers ran: where it landed (a palette button or
  // option by its key) and whether it was cancelled (a cancelled press keeps the text box focused).
  // An editor blur with no press before it came from outside the page.
  window.addEventListener("mousedown", (event) => {
    const target = event.target as { closest?: (selector: string) => Element | null } | null;
    const control = target?.closest?.("[data-edit-option],[data-edit-action]");
    const option = control?.getAttribute("data-edit-option");
    const where = control
      ? (option !== null && option !== undefined ? "option=" + option : "action=" + control.getAttribute("data-edit-action"))
      : tagOf(event.target);
    editorTrace.record("mousedown", where + " prevented=" + String(event.defaultPrevented === true) + " " + traceFocus());
  });
  // Cmd/Ctrl+A in a text control selects that control's text and never reaches the workbench
  // (see selectAllKey.ts: the workbench would otherwise focus the text editor in some cases).
  installSelectAllInControls(document, isTextSelectAll,
    isApplePlatform(),
    (target) => editorTrace.record("select-all kept in control", tagOf(target) + " " + traceFocus()));
  // Tab, Enter, Escape and the arrow keys an open editor has handled stay in the page (see
  // editorKeys.ts): the workbench never runs its own binding for a key the page has already used.
  installEditorKeyContainment(document, isHandledEditorKey,
    (key, target) => editorTrace.record("editor key kept in page", key + " in " + tagOf(target) + " " + traceFocus()));
  return {
    editorTrace,
    traceFocus,
    traceStack,
    expose(firstClearance) {
      try {
        Object.defineProperty(window, "__studioDiagnostics", {
          configurable: true,
          value: Object.freeze({
            trace: (): EditorTraceEntry[] => editorTrace.entries(),
            startedAt: (): number => traceStartedAt,
            firstClearance: () => firstClearance.describe(),
          }),
        });
      } catch {
        // Diagnostics are optional: a page that cannot expose them still works.
      }
    },
  };
}
