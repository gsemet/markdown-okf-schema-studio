/**
 * The page side of "Export to HTML": takes a snapshot of the content as the reader sees it now
 * (after the pending diagrams settled) with the values only the page can resolve (the theme
 * tokens, the width mode, the shown tab of each tab set), and sends it to the host in a
 * `previewExportHtml` request. The host builds and writes the file. The click on the Export button
 * is the user gesture; the command of the palette sends none.
 */

import { EXPORT_ROOT_ATTRIBUTES, EXPORT_TOO_LARGE, isExportSnapshotTooLarge, type ExportSnapshot } from "../../core/export/exportSnapshot";
import { STUDIO_TOKEN_PREFIX, THEME_TOKEN_NAMES } from "../../core/preview/themeTokens";
import type { HostRequestSettings, HostResult } from "./hostRequests";

/** The diagram containers whose render state tells when they are done. */
const DIAGRAM_SELECTOR = ".myst-mermaid-diagram, .myst-vega-diagram, .myst-plantuml-diagram";

/** How long the export waits for diagrams still drawing before it takes the page as it is. */
export const EXPORT_DIAGRAM_WAIT_MS = 10_000;
const POLL_MS = 100;

type ExportDocument = Pick<Document, "documentElement" | "querySelector" | "querySelectorAll" | "getElementById">;
type ExportWindow = Pick<Window, "setTimeout" | "clearTimeout" | "getComputedStyle">;

/** What the export asks of the page runtime. */
export interface ExportOptions {
  /** A host round trip (see `hostRequests.ask`). */
  ask(type: string, payload: Record<string, unknown>, settings: HostRequestSettings, done: (result: HostResult) => void): void;
  /** Tells the user why the export did not start (a snapshot the host would not take). */
  report?(message: string): void;
}

/** The Export button and the command. */
export interface ExportControl {
  /** Takes the snapshot and asks the host to write it; `userGesture` is true for a click on the button. */
  run(userGesture: boolean): void;
  /** The snapshot of the page as it is now, without waiting for diagrams (what `run` sends after the wait). */
  snapshot(): ExportSnapshot | undefined;
}

const isPending = (diagram: Element): boolean => {
  const state = diagram.getAttribute("data-render-state");
  return state !== "rendered" && state !== "error" && state !== "unavailable";
};

/** The index of the shown tab of each tab set, in document order. */
function shownTabs(root: ParentNode): number[] {
  return Array.from(root.querySelectorAll(".myst-tab-set")).map((set) => {
    const tabs = Array.from(set.querySelectorAll<HTMLElement>(".myst-tab")).filter((tab) => tab.closest(".myst-tab-set") === set);
    return Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));
  });
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-137
/** The snapshot of the page now: a copy of the content (the task checkboxes as they are checked) and what the page resolved. */
export function takeExportSnapshot(document: ExportDocument, window: ExportWindow): ExportSnapshot | undefined {
  const content = document.getElementById("sphinx-myst-preview-content");
  if (!content) return undefined;
  const clone = content.cloneNode(true) as HTMLElement;
  const live = Array.from(content.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  Array.from(clone.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).forEach((box, index) => {
    if (live[index]?.checked) box.setAttribute("checked", "");
    else box.removeAttribute("checked");
  });
  const root = document.documentElement;
  const style = window.getComputedStyle(root);
  const tokens: Record<string, string> = {};
  for (const name of THEME_TOKEN_NAMES) {
    const value = style.getPropertyValue(STUDIO_TOKEN_PREFIX + name).trim();
    if (value !== "") tokens[name] = value;
  }
  const rootAttributes: Record<string, string> = {};
  for (const name of EXPORT_ROOT_ATTRIBUTES) {
    const value = root.getAttribute(name);
    if (value !== null) rootAttributes[name] = value;
  }
  return {
    contentHtml: clone.outerHTML,
    rootAttributes,
    tokens,
    mathStyles: document.querySelector("style[data-studio-math-styles]")?.textContent ?? "",
    shownTabs: shownTabs(content),
  };
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-137
/** Calls `done` when no diagram is drawing any more, or after `timeoutMs`. */
export function whenDiagramsSettled(
  document: Pick<Document, "querySelectorAll">,
  window: Pick<Window, "setTimeout">,
  timeoutMs: number,
  done: () => void,
): void {
  let waited = 0;
  const check = (): void => {
    const pending = Array.from(document.querySelectorAll(DIAGRAM_SELECTOR)).some(isPending);
    if (!pending || waited >= timeoutMs) {
      done();
      return;
    }
    waited += POLL_MS;
    window.setTimeout(check, POLL_MS);
  };
  check();
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-134
/** Binds the Export button and returns the control the command of the palette uses. */
export function installExportSnapshot(
  document: ExportDocument & Pick<Document, "addEventListener">,
  window: ExportWindow,
  options: ExportOptions,
): ExportControl {
  let running = false;
  const button = document.querySelector<HTMLElement>("[data-sphinx-preview-export]");
  const setBusy = (busy: boolean): void => {
    running = busy;
    if (busy) button?.setAttribute("aria-busy", "true");
    else button?.removeAttribute("aria-busy");
  };
  const control: ExportControl = {
    snapshot: () => takeExportSnapshot(document, window),
    run(userGesture) {
      if (running) return;
      setBusy(true);
      whenDiagramsSettled(document, window, EXPORT_DIAGRAM_WAIT_MS, () => {
        const snapshot = takeExportSnapshot(document, window);
        if (!snapshot) {
          setBusy(false);
          return;
        }
        if (isExportSnapshotTooLarge(snapshot)) {
          setBusy(false);
          options.report?.(EXPORT_TOO_LARGE);
          return;
        }
        // The host opens a save dialog: the answer can take as long as the user needs.
        // The host tells the user itself (information or error message): the answer only ends the wait.
        options.ask("previewExportHtml", { snapshot, userGesture }, { dialog: true }, () => setBusy(false));
      });
    },
  };
  button?.addEventListener("click", () => control.run(true));
  return control;
}
