import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  cellMarkup,
  mapping,
  messagesAfter,
  NEXT_IDENTIFIERS,
  noop,
  openFrontmatterValueEditor,
  openRawEditor,
  overlayMessage,
  patchMessage,
  pendingOverlays,
  propertiesMessage,
} from "./runtimeTestSupport";

/**
 * The startup trace and in-place content patches (features/contentPatch.ts).
 */

// T33: the startup sequence of the runtime. The content-bound initialization moves into a function
// that a later task calls again on replaced content; the order of observable effects at startup
// (element mutations, then the messages posted) must not change. Listener registration on the
// toolbar buttons and the theme attributes of the root element do not depend on the content, so
// they are left out of the trace.
function traceStartup(
  configuration: Parameters<typeof createRuntimeHarness>[0],
  savedAnchorMode?: boolean,
): { effects: string[]; messageTypes: unknown[]; scrollY: number } {
  const entries: Array<{ element: RuntimeElement; method: string; args: unknown[]; text: string }> = [];
  const prototype = RuntimeElement.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  const original = new Map<string, (...args: unknown[]) => unknown>();
  const describe = (element: RuntimeElement): string => {
    const identity = element.getAttribute("data-okf-field") ?? element.getAttribute("class")
      ?? element.getAttribute("data-sphinx-source-line") ?? element.className;
    return element.tagName.toLowerCase() + (identity ? "[" + identity + "]" : "");
  };
  const format = (value: unknown): string => (
    value instanceof RuntimeElement ? "<" + describe(value) + ">"
      : typeof value === "function" ? "fn" : String(value)
  );
  for (const method of ["setAttribute", "removeAttribute", "addEventListener", "appendChild",
    "insertBefore", "insertAdjacentElement", "insertAdjacentHTML", "remove", "focus"]) {
    const before = prototype[method];
    original.set(method, before);
    prototype[method] = function traced(this: RuntimeElement, ...args: unknown[]): unknown {
      entries.push({
        element: this,
        method,
        args,
        text: describe(this) + "." + method + "(" + args.map(format).join(",") + ")",
      });
      return before.apply(this, args);
    };
  }
  try {
    // The trace was recorded with the theme mode "current" stored for the workspace (pinned since
    // the fresh default became cream).
    const harness = createRuntimeHarness(configuration, undefined, "current", savedAnchorMode);
    const toolbar = [harness.themeButton, harness.refreshButton, harness.anchorButton, harness.editModeButton];
    const themeAttributes = ["data-sphinx-preview-theme", "data-sphinx-preview-reduced-motion",
      "data-sphinx-preview-zoom", "data-sphinx-preview-width", "data-sphinx-preview-toc",
      "data-okf-show-comments", "data-sphinx-preview-incoming", "data-sphinx-preview-toolbar-state"];
    // The zoom buttons and the zoom of the root do not depend on the content (T08); the Diff
    // button of row 2 does not either (T17).
    // The collapse button and its rows are content-independent too (P8).
    const zoomButtons = [harness.zoomOutButton, harness.zoomInButton, harness.widthButton, harness.diffButton,
      harness.collapseButton, harness.moreRows];
    return {
      effects: entries
        .filter((entry) => !(entry.method === "addEventListener" && toolbar.includes(entry.element)))
        .filter((entry) => !zoomButtons.includes(entry.element))
        // The TOC column is runtime UI that does not depend on the content (T12).
        .filter((entry) => entry.element.tagName !== "NAV"
          && !(entry.method === "appendChild" && (entry.args[0] as RuntimeElement | undefined)?.tagName === "NAV"))
        .filter((entry) => !(entry.element === harness.documentElement
          && entry.method === "setAttribute" && themeAttributes.includes(String(entry.args[0]))))
        .map((entry) => entry.text),
      messageTypes: harness.messages.map((message) => message.type),
      scrollY: harness.windowState.scrollY,
    };
  } finally {
    for (const [method, before] of original) prototype[method] = before;
  }
}

test("T33: the startup sequence of effects and messages is stable", () => {
  const scenarios: Array<[string, Parameters<typeof createRuntimeHarness>[0], boolean | undefined]> = [
    ["reading mode", {}, undefined],
    ["edit mode", { savedState: { editMode: true }, mapFrontmatter: true, frontmatterHeight: 30 }, undefined],
    ["untrusted workspace", { editingEnabled: false }, undefined],
    ["saved anchor mode differs from the setting", {}, false],
    ["pinned position", { initialPin: { line: 50, viewportTop: 120 } }, undefined],
    ["pending block navigation", {
      previewStatus: "success",
      savedState: { editMode: true, pendingBlockNavigation: { sourceLine: 50, caretPosition: "end" } },
    }, undefined],
    ["pending new field", {
      previewStatus: "success",
      savedState: { editMode: true, pendingFrontmatterEdit: { fieldName: "lifecycle" } },
    }, undefined],
  ];
  const observed: Record<string, unknown> = {};
  for (const [name, configuration, savedAnchorMode] of scenarios) {
    observed[name] = traceStartup(configuration, savedAnchorMode);
  }
  assert.deepEqual(observed, EXPECTED_STARTUP_TRACE);
});

const EXPECTED_STARTUP_TRACE: Record<string, unknown> = {
  "reading mode": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "div.setAttribute(data-edit-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Edit mode)",
      "div.setAttribute(data-tooltip,Edit mode)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
  "edit mode": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section[1].appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,on)",
      "div.setAttribute(data-edit-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Exit edit mode)",
      "div.setAttribute(data-tooltip,Exit edit mode)",
      "th.setAttribute(tabindex,0)",
      "td.setAttribute(tabindex,0)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,1)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[1].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,52)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,100)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[100].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
  "untrusted workspace": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "input[myst-checkbox].setAttribute(title,Editing requires a trusted workspace.)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
  "saved anchor mode differs from the setting": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Preview and text editor scroll independently)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll independently)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Preview and text editor scroll independently)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll independently)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "div.setAttribute(data-edit-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Edit mode)",
      "div.setAttribute(data-tooltip,Edit mode)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewAnchorModeChanged", "previewReady"],
    scrollY: 0,
  },
  "pinned position": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,off)",
      "div.setAttribute(data-edit-mode,off)",
      "div.setAttribute(aria-pressed,false)",
      "div.setAttribute(title,Edit mode)",
      "div.setAttribute(data-tooltip,Edit mode)",
      "th.removeAttribute(tabindex)",
      "td.removeAttribute(tabindex)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 380,
  },
  "pending block navigation": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,on)",
      "div.setAttribute(data-edit-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Exit edit mode)",
      "div.setAttribute(data-tooltip,Exit edit mode)",
      "th.setAttribute(tabindex,0)",
      "td.setAttribute(tabindex,0)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,1)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[1].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,52)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,100)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[100].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
      "div[sphinx-preview-block-editor].setAttribute(data-sphinx-preview-block-editor,true)",
      "div[sphinx-preview-block-editor].setAttribute(role,region)",
      "div[sphinx-preview-block-editor].setAttribute(aria-label,Raw Markdown editor)",
      "p.setAttribute(data-sphinx-preview-edit-status,)",
      "p.setAttribute(role,status)",
      "div[sphinx-preview-block-editor].addEventListener(click,fn)",
      "div[50].setAttribute(data-sphinx-preview-editing,true)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-block-editor]>)",
      "div.setAttribute(data-sphinx-preview-block-editing,true)",
    ],
    messageTypes: ["previewEditOpen", "previewReady"],
    scrollY: 480,
  },
  "pending new field": {
    effects: [
      "div[50].appendChild(<input[myst-checkbox]>)",
      "th.appendChild(<span[okf-name-cell]>)",
      "td.appendChild(<span>)",
      "tr[lifecycle].appendChild(<th>)",
      "tr[lifecycle].appendChild(<td>)",
      "section.appendChild(<table>)",
      "table.appendChild(<tbody>)",
      "tbody.appendChild(<tr[lifecycle]>)",
      "div.setAttribute(data-sphinx-preview-document-id,file:///active.md)",
      "div.setAttribute(data-sphinx-preview-document-version,7)",
      "div.setAttribute(data-sphinx-preview-request-id,11)",
      "div.setAttribute(data-sphinx-preview-comments,on)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div.setAttribute(data-sphinx-preview-theme-mode,current)",
      "div.setAttribute(data-theme-mode,current)",
      "div.setAttribute(aria-label,Preview theme: Current theme)",
      "div.setAttribute(title,Current theme (click for dark theme))",
      "div.setAttribute(data-tooltip,Current theme (click for dark theme))",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(aria-label,Anchor preview to text editor)",
      "div.setAttribute(data-anchor-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Preview and text editor scroll together)",
      "div.setAttribute(data-tooltip,Preview and text editor scroll together)",
      "div.setAttribute(data-sphinx-preview-edit-mode,on)",
      "div.setAttribute(data-edit-mode,on)",
      "div.setAttribute(aria-pressed,true)",
      "div.setAttribute(title,Exit edit mode)",
      "div.setAttribute(data-tooltip,Exit edit mode)",
      "th.setAttribute(tabindex,0)",
      "td.setAttribute(tabindex,0)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,1)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[1].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,52)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[50].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "div[sphinx-preview-insert-point].setAttribute(data-sphinx-insert-after-line,100)",
      "button.setAttribute(type,button)",
      "button.setAttribute(aria-label,Insert a block here)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button>)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(aria-label,Move the block above up)",
      "button[sphinx-preview-move sphinx-preview-move--up].setAttribute(data-sphinx-move,up)",
      "button[sphinx-preview-move sphinx-preview-move--up].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--up]>)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(type,button)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(aria-label,Move the block above down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(data-sphinx-move,down)",
      "button[sphinx-preview-move sphinx-preview-move--down].setAttribute(disabled,)",
      "button[sphinx-preview-move sphinx-preview-move--down].addEventListener(click,fn)",
      "div[sphinx-preview-insert-point].appendChild(<button[sphinx-preview-move sphinx-preview-move--down]>)",
      "div[100].insertAdjacentElement(afterend,<div[sphinx-preview-insert-point]>)",
      "body.removeAttribute(data-sphinx-preview-sticky-headings-active)",
      "div.setAttribute(data-okf-descriptions-collapsed,true)",
      "button.setAttribute(aria-expanded,false)",
      "button.setAttribute(aria-label,Expand Description column)",
      "button.setAttribute(title,Expand Description column)",
      "div.addEventListener(load,fn,[object Object])",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].setAttribute(data-okf-frontmatter-editor,true)",
      "select.setAttribute(aria-label,Frontmatter lifecycle)",
      "select.appendChild(<option>)",
      "select.setAttribute(data-okf-empty-select,false)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "p.setAttribute(role,status)",
      "p.setAttribute(aria-live,polite)",
      "select.addEventListener(keydown,fn)",
      "select.addEventListener(blur,fn)",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].appendChild(<select>)",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].appendChild(<p>)",
      "td.setAttribute(data-okf-editing,true)",
      "span.setAttribute(hidden,)",
      "td.appendChild(<div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor]>)",
      "div[sphinx-preview-frontmatter-menu].setAttribute(role,toolbar)",
      "div[sphinx-preview-frontmatter-menu].setAttribute(aria-label,Frontmatter field actions)",
      "div[sphinx-preview-frontmatter-menu].setAttribute(data-okf-frontmatter-menu,true)",
      "button.setAttribute(aria-label,Add frontmatter field)",
      "button.setAttribute(title,Add frontmatter field)",
      "button.setAttribute(data-tooltip,Add frontmatter field)",
      "button.setAttribute(data-okf-frontmatter-operation,add)",
      "button.appendChild(<span[sphinx-preview-frontmatter-menu-label]>)",
      "div[sphinx-preview-frontmatter-menu].appendChild(<button>)",
      "button.setAttribute(aria-label,Remove frontmatter field)",
      "button.setAttribute(title,Remove frontmatter field)",
      "button.setAttribute(data-tooltip,Remove frontmatter field)",
      "button.setAttribute(data-okf-frontmatter-operation,remove)",
      "button.appendChild(<span[sphinx-preview-frontmatter-menu-label]>)",
      "div[sphinx-preview-frontmatter-menu].appendChild(<button>)",
      "div[sphinx-preview-frontmatter-picker].setAttribute(hidden,)",
      "div[sphinx-preview-frontmatter-picker].setAttribute(role,group)",
      "div[sphinx-preview-frontmatter-picker].setAttribute(aria-label,Add frontmatter field)",
      "select.setAttribute(aria-label,Frontmatter field to add)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "select.appendChild(<option>)",
      "button.setAttribute(aria-label,Add selected frontmatter field)",
      "button.setAttribute(title,Add selected frontmatter field)",
      "button.setAttribute(data-tooltip,Add selected frontmatter field)",
      "button.setAttribute(data-okf-frontmatter-operation,confirm-add)",
      "button.appendChild(<span[sphinx-preview-frontmatter-menu-label]>)",
      "select.addEventListener(change,fn)",
      "select.addEventListener(input,fn)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-frontmatter-picker].appendChild(<select>)",
      "div[sphinx-preview-frontmatter-picker].appendChild(<button>)",
      "div[sphinx-preview-frontmatter-menu].appendChild(<div[sphinx-preview-frontmatter-picker]>)",
      "button.addEventListener(click,fn)",
      "button.addEventListener(click,fn)",
      "div[sphinx-preview-frontmatter-editor sphinx-preview-frontmatter-value-editor].appendChild(<div[sphinx-preview-frontmatter-menu]>)",
      "select.focus([object Object])",
    ],
    messageTypes: ["previewReady"],
    scrollY: 0,
  },
};

test("T34: a content patch replaces the content, moves the identifiers and posts previewReady", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-document-version"), "8");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "12");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-document-id"), "file:///active.md");
  const ready = messagesAfter(harness, before).filter((message) => message.type === "previewReady");
  assert.equal(ready.length, 1, "exactly one previewReady");
  assert.deepEqual(
    { documentId: ready[0]!.documentId, revision: ready[0]!.revision, requestId: ready[0]!.requestId },
    NEXT_IDENTIFIERS,
  );
  assert.equal(typeof ready[0]!.descriptionsCollapsed, "boolean");
  assert.ok(harness.dispatchedEvents.includes("studio:content-replaced"), "Mermaid is told to render the new content");
});

test("CR 046: a patch that follows an outside change or an undo makes the updated blocks glow", () => {
  const harness = createRuntimeHarness();
  harness.mappings[0]!.setAttribute("data-line", "1");
  harness.mappings[1]!.setAttribute("data-line", "3");
  harness.dispatchMessage(patchMessage({ updatedRanges: [{ start: 3, end: 3 }] }));
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-updated"), "true");
  assert.equal(harness.mappings[0]!.getAttribute("data-sphinx-preview-updated"), null, "an unchanged block does not glow");
  harness.mappings[1]!.dispatch("animationend", { target: harness.mappings[1] });
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-updated"), null, "the glow goes when it has played");
});

test("CR 046: a patch of the preview's own edit, without updated ranges, glows nowhere", () => {
  const harness = createRuntimeHarness();
  harness.mappings[1]!.setAttribute("data-line", "3");
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.mappings[1]!.getAttribute("data-sphinx-preview-updated"), null);
});

test("CR 046: the theme button fades the colours, a patch holds the soft appearance back", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-switching"), null, "no transition on load");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-motion"), null, "no soft appearance on load");
  harness.dispatchWindow("pointerdown");
  harness.themeButton.dispatch("click");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme-switching"), "true");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-motion"), "on");
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-motion"), null);
});

test("STAB-02: previewReady reports that no block editor is open on a fresh page", () => {
  const harness = createRuntimeHarness();
  const ready = harness.messages.find((message) => message.type === "previewReady");
  assert.ok(ready);
  assert.equal(ready.blockEditOpen, false);
});

test("STAB-02: a patch that closes an open block editor reports blockEditOpen false", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "- a\n",
  });
  assert.ok(harness.createdElements.some((element) => element.tagName === "TEXTAREA"), "an editor is open");
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const ready = messagesAfter(harness, before).filter((message) => message.type === "previewReady");
  assert.equal(ready.length, 1);
  assert.equal(ready[0]!.blockEditOpen, false, "the patch closed the editor before reporting ready");
});

test("T34: after a patch the page answers to the new identifiers only", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(patchMessage());
  harness.windowState.scrollY = 300;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  const scroll = harness.messages.at(-1)!;
  assert.deepEqual(
    { documentId: scroll.documentId, revision: scroll.revision, requestId: scroll.requestId },
    NEXT_IDENTIFIERS,
  );
  harness.dispatchMessage(propertiesMessage(cellMarkup("old identifiers")));
  assert.equal(harness.htmlInsertions.length, 0, "a message of the previous render is ignored");
  harness.dispatchMessage(propertiesMessage(cellMarkup("new identifiers"), {
    revision: 8,
    requestId: 12,
  }));
  assert.equal(harness.htmlInsertions.length, 1, "a message of the new render is applied");
  // The next patch is addressed to the identifiers the previous one introduced.
  harness.dispatchMessage(patchMessage({ contentHtml: "<p>stale</p>" }));
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>", "a repeated patch for the old render is ignored");
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>third</p>",
  }));
  assert.equal(harness.previewContent.innerHTML, "<p>third</p>");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "13");
});

test("T34: a patch with stale or malformed fields is ignored", () => {
  const variants: Array<[string, Record<string, unknown>]> = [
    ["another request", { requestId: 12 }],
    ["another version", { revision: 8 }],
    ["another document", { documentId: "file:///other.md" }],
    ["numeric content", { contentHtml: 3 }],
    ["missing content", { contentHtml: undefined }],
    ["oversized content", { contentHtml: "x".repeat(20 * 1024 * 1024 + 1) }],
    ["missing next", { next: undefined }],
    ["null next", { next: null }],
    ["string next version", { next: { revision: "8", requestId: 12 } }],
    ["fractional next request", { next: { revision: 8, requestId: 12.5 } }],
    ["unsafe next version", { next: { revision: 2 ** 60, requestId: 12 } }],
    ["string anchor", { next: { revision: 8, requestId: 12, initialAnchor: "3" } }],
    ["infinite anchor", { next: { revision: 8, requestId: 12, initialAnchor: Infinity } }],
    ["malformed pin", { next: { revision: 8, requestId: 12, initialPin: { line: "1", viewportTop: 2 } } }],
    ["unknown status", { status: "weird" }],
    ["numeric label", { label: 3 }],
    ["long label", { label: "x".repeat(501) }],
    ["numeric message", { message: 3 }],
    ["non-array diagnostics", { diagnostics: "none" }],
    ["diagnostic without text", { diagnostics: [{ severity: "error" }] }],
    ["diagnostic with numeric severity", { diagnostics: [{ severity: 1, text: "a" }] }],
    ["too many diagnostics", { diagnostics: Array.from({ length: 501 }, () => ({ severity: "error", text: "a" })) }],
  ];
  for (const [name, extra] of variants) {
    const harness = createRuntimeHarness();
    const before = harness.messages.length;
    harness.dispatchMessage(patchMessage(extra));
    assert.equal(harness.previewContent.innerHTML, "", name + ": the content is untouched");
    assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "11", name);
    assert.equal(harness.messages.length, before, name + ": nothing is posted");
    assert.equal(harness.dispatchedEvents.length, 0, name + ": nothing is announced");
  }
});

test("T34: an open block editor is closed without a cancel or a save", () => {
  const harness = createRuntimeHarness();
  const textarea = openRawEditor(harness);
  assert.ok(textarea.parentElement, "the editor is open");
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const posted = messagesAfter(harness, before).map((message) => message.type);
  assert.deepEqual(posted, ["previewReady"], "only the ready report is posted");
  const editors = harness.createdElements.filter((element) =>
    element.getAttribute("data-sphinx-preview-block-editor") !== null);
  assert.ok(editors.length > 0 && editors.every((element) => element.removed), "the editor is gone");
  assert.equal(harness.refreshButton.disabled, false, "the refresh button works again");
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>");
});

test("T34: an open frontmatter editor is closed and a deferred properties update is dropped", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true });
  openFrontmatterValueEditor(harness);
  const editor = harness.createdElements.find((element) =>
    element.getAttribute("data-okf-frontmatter-editor") !== null)!;
  assert.ok(editor.parentElement, "the editor is open");
  harness.dispatchMessage(propertiesMessage(cellMarkup("deferred")));
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  assert.equal(editor.parentElement, undefined, "the editor closed");
  assert.equal(harness.htmlInsertions.length, 0, "the deferred markup was not applied to the old section");
  assert.deepEqual(messagesAfter(harness, before).map((message) => message.type), ["previewReady"]);
  harness.dispatchMessage(propertiesMessage(cellMarkup("late"), { revision: 8, requestId: 12 }));
  assert.equal(harness.htmlInsertions.length, 1, "the next update is applied at once, nothing is deferred");
});

test("T34: the patch removes the pending overlay and the link tooltip", () => {
  const harness = createRuntimeHarness();
  harness.dispatchMessage(overlayMessage());
  assert.equal(pendingOverlays(harness).length, 1);
  const link = new RuntimeElement({
    class: "okf-frontmatter-link", "data-okf-link-status": "valid", title: "target",
  }, harness.windowState, 0, 10, "a");
  harness.dispatchDocument("mouseover", { target: link });
  const tooltips = () => harness.createdElements.filter((element) =>
    element.className === "sphinx-preview-link-tooltip" && element.parentElement !== undefined);
  assert.equal(tooltips().length, 1);
  harness.dispatchMessage(patchMessage());
  assert.equal(pendingOverlays(harness).length, 0, "the overlay is gone");
  assert.equal(tooltips().length, 0, "the tooltip is gone");
  assert.equal(link.getAttribute("title"), "target", "the link title was restored");
});

test("CR 050: a patch keeps the code of each status line and refuses a malformed one", () => {
  const harness = createRuntimeHarness({ previewStatus: "success" });
  harness.dispatchMessage(patchMessage({
    diagnostics: [
      { severity: "warning", text: "active.md:3: Warning: dollar math", code: "myst-extension" },
      { severity: "warning", text: "plain" },
    ],
  }));
  const region = harness.body.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null && !child.removed)!;
  const list = region.childElements.find((child) => child.tagName === "UL")!;
  assert.deepEqual(list.childElements.map((item) => item.getAttribute("data-sphinx-preview-diagnostic-code")),
    ["myst-extension", null]);
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>");
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>refused</p>",
    diagnostics: [{ severity: "warning", text: "x", code: 7 }],
  }));
  assert.equal(harness.previewContent.innerHTML, "<p>fresh</p>", "a code that is not a string refuses the patch");
});

test("T34: the patch rebuilds the status region from plain text", () => {
  const harness = createRuntimeHarness({ previewStatus: "success" });
  const old = harness.statusRegion!;
  assert.ok(old);
  harness.dispatchMessage(patchMessage({
    status: "stale",
    label: "Preview is stale",
    message: "Render <b>failed</b>",
    diagnostics: [
      { severity: "error", text: "inline.md:3:1: bad <script>alert(1)</script>" },
      { severity: "warning", text: "second" },
    ],
  }));
  assert.equal(old.removed, true, "the previous region was replaced");
  const region = harness.body.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null)!;
  assert.ok(region, "a new region is in the body");
  assert.equal(region.tagName, "ASIDE");
  assert.equal(region.getAttribute("data-sphinx-preview-status"), "stale");
  assert.equal(region.getAttribute("role"), "status");
  assert.equal(region.getAttribute("aria-live"), "polite");
  const [label, message, list] = region.childElements;
  assert.equal(label?.tagName, "STRONG");
  assert.equal(label?.textContent, "Preview is stale");
  assert.equal(message?.tagName, "SPAN");
  assert.notEqual(message?.getAttribute("data-sphinx-preview-status-message"), null);
  assert.equal(message?.textContent, "Render <b>failed</b>");
  assert.equal(list?.tagName, "UL");
  assert.notEqual(list?.getAttribute("data-sphinx-preview-diagnostics"), null);
  assert.deepEqual(list?.childElements.map((item) => [
    item.tagName,
    item.getAttribute("data-sphinx-preview-diagnostic-severity"),
    item.textContent,
  ]), [
    ["LI", "error", "inline.md:3:1: bad <script>alert(1)</script>"],
    ["LI", "warning", "second"],
  ]);
  for (const element of harness.createdElements) {
    assert.equal(element.innerHTML, "", "no status field goes through innerHTML");
  }
  // A status without message and diagnostics has neither element.
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    status: "success",
    label: "Preview ready",
  }));
  assert.equal(region.removed, true);
  const next = harness.body.childElements.find((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null && !child.removed)!;
  assert.equal(next.getAttribute("data-sphinx-preview-status"), "success");
  assert.deepEqual(next.childElements.map((child) => child.tagName), ["STRONG"]);
});

test("T34: a page loaded without a status region gets one as the first child of the body", () => {
  const harness = createRuntimeHarness();
  assert.equal(harness.statusRegion, null);
  harness.dispatchMessage(patchMessage({ status: "recovery", label: "Preview recovered" }));
  const regions = harness.body.childElements.filter((child) =>
    child.getAttribute("data-sphinx-preview-status") !== null);
  assert.equal(regions.length, 1);
  assert.equal(regions[0]!.getAttribute("data-sphinx-preview-status"), "recovery");
});

test("T34: open disclosures of the old content are open again in the new content", () => {
  const harness = createRuntimeHarness();
  const make = (): RuntimeElement[] => [0, 1, 2].map(() => {
    const element = new RuntimeElement({}, harness.windowState, 0, 10, "details");
    (element as unknown as { open: boolean }).open = false;
    return element;
  });
  const asOpen = (element: RuntimeElement): boolean => (element as unknown as { open: boolean }).open;
  const old = make();
  (old[0] as unknown as { open: boolean }).open = true;
  (old[2] as unknown as { open: boolean }).open = true;
  harness.details.push(...old);
  const fresh = make();
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => { harness.details.splice(0, harness.details.length, ...fresh); },
  });
  harness.dispatchMessage(patchMessage());
  assert.deepEqual(fresh.map(asOpen), [true, false, true]);
});

test("T34: a patch with an anchor or a pin positions the page like a loaded page", () => {
  const anchored = createRuntimeHarness({ initialAnchor: 50 });
  assert.ok(anchored.windowState.scrollY > 0, "the reference page scrolls to the anchor");
  const patched = createRuntimeHarness();
  assert.equal(patched.windowState.scrollY, 0);
  patched.dispatchMessage(patchMessage({ next: { revision: 8, requestId: 12, initialAnchor: 50 } }));
  assert.equal(patched.windowState.scrollY, anchored.windowState.scrollY);

  const pinned = createRuntimeHarness({ initialPin: { line: 50, viewportTop: 120 } });
  const pinnedReady = pinned.messages.find((message) => message.type === "previewReady")!;
  assert.equal(typeof pinnedReady.anchorLine, "number", "the reference page reports the pinned anchor");
  const patchedPin = createRuntimeHarness();
  const before = patchedPin.messages.length;
  patchedPin.dispatchMessage(patchMessage({
    next: { revision: 8, requestId: 12, initialPin: { line: 50, viewportTop: 120 } },
  }));
  assert.equal(patchedPin.windowState.scrollY, pinned.windowState.scrollY);
  const ready = messagesAfter(patchedPin, before).find((message) => message.type === "previewReady")!;
  assert.equal(ready.anchorLine, pinnedReady.anchorLine);

  // The pin is for one render: the next patch without one does not report a pinned anchor.
  const before2 = patchedPin.messages.length;
  patchedPin.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
  }));
  const ready2 = messagesAfter(patchedPin, before2).find((message) => message.type === "previewReady")!;
  assert.equal(ready2.anchorLine, undefined);
});

test("T34: a patch keeps the scroll position when the host sends no anchor", () => {
  const harness = createRuntimeHarness();
  harness.windowState.scrollY = 240;
  harness.dispatchMessage(patchMessage());
  assert.equal(harness.windowState.scrollY, 240);
});

test("T34: a pending checkbox toggle of the old content cannot revert the new content", () => {
  const harness = createRuntimeHarness();
  harness.checkbox.checked = true;
  harness.dispatchDocument("click", { target: harness.checkbox, stopImmediatePropagation: noop, preventDefault: noop });
  const toggle = harness.messages.find((message) => message.type === "previewCheckboxToggle")!;
  assert.ok(toggle, "the toggle was posted");
  harness.dispatchMessage(patchMessage());
  harness.dispatchMessage({
    type: "previewCheckboxResult",
    ...NEXT_IDENTIFIERS,
    editId: toggle.editId,
    error: "late failure",
  });
  assert.equal(harness.checkbox.checked, true, "the late result did not touch a checkbox");
});

function linkElement(harness: RuntimeHarness, request: string, attributes: Record<string, string> = {}): RuntimeElement {
  return new RuntimeElement({ "data-sphinx-preview-navigation": request, ...attributes },
    harness.windowState, 0, 10, "a");
}

test("T34: links of the new content keep known target hints and discover new targets", () => {
  const harness = createRuntimeHarness({ intersectionObserver: true });
  const known = linkElement(harness, "Known", {
    "data-sphinx-preview-link-state": "available",
    title: "/ws/Known.md",
  });
  const unavailable = linkElement(harness, "Missing", {
    "data-sphinx-preview-link-state": "unavailable",
    title: "not found",
  });
  harness.contentLinks.push(known, unavailable);
  const freshKnown = linkElement(harness, "Known");
  const freshMissing = linkElement(harness, "Missing");
  const typed = linkElement(harness, "Typed");
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => { harness.contentLinks.splice(0, harness.contentLinks.length, freshKnown, freshMissing, typed); },
  });
  harness.dispatchMessage(patchMessage());
  assert.equal(freshKnown.getAttribute("data-sphinx-preview-link-state"), "available");
  assert.equal(freshKnown.getAttribute("title"), "/ws/Known.md");
  assert.equal(freshMissing.getAttribute("data-sphinx-preview-link-state"), "unavailable");
  assert.equal(freshMissing.getAttribute("title"), "not found");
  assert.equal(typed.getAttribute("data-sphinx-preview-link-state"), null, "a new link has no hint yet");
  assert.ok(harness.observedLinks.includes(typed), "the new link is observed for discovery");

  const before = harness.messages.length;
  harness.intersect(typed);
  harness.flushMicrotasks();
  const discover = messagesAfter(harness, before).find((message) => message.type === "previewLinkDiscover")!;
  assert.ok(discover, "entering the viewport asks the host for the target");
  assert.deepEqual(Array.from(discover.requests as string[]), ["Typed"]);
  assert.equal(discover.revision, 8);
  assert.equal(discover.requestId, 12);
  harness.dispatchMessage({
    type: "previewLinkTargets",
    ...NEXT_IDENTIFIERS,
    targets: [{ request: "Typed", kind: "local", path: "/ws/Typed.md" }],
  });
  assert.equal(typed.getAttribute("data-sphinx-preview-link-state"), "local");
  assert.equal(typed.getAttribute("title"), "/ws/Typed.md");
});

// Moved from test/webview/linkNavigation.test.ts ("discovery hints ignore stale renders and never
// replace the original target"): the page's host message filter matches previewLinkTargets to the
// render it shows before the router hands it to the link navigation.
test("link target hints of a stale render are ignored", () => {
  const harness = createRuntimeHarness();
  const link = linkElement(harness, "wiki:Note");
  harness.contentLinks.push(link);
  harness.dispatchMessage(patchMessage());
  const target = { request: "wiki:Note", kind: "local", path: "/workspace/Note.md" };
  harness.dispatchMessage({ type: "previewLinkTargets", ...NEXT_IDENTIFIERS, requestId: 1, targets: [target] });
  assert.equal(link.getAttribute("title"), null);
  harness.dispatchMessage({ type: "previewLinkTargets", ...NEXT_IDENTIFIERS, targets: [target] });
  assert.equal(link.getAttribute("title"), target.path);
  assert.equal(link.getAttribute("data-sphinx-preview-navigation"), "wiki:Note");
});

test("T34: edit mode rebuilds the insertion points for the new content", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const insertedBefore = harness.mappings.reduce((count, mapping) => count + mapping.insertedElements.length, 0);
  assert.ok(insertedBefore > 0, "edit mode has insertion points");
  harness.dispatchMessage(patchMessage());
  const insertedAfter = harness.mappings.reduce((count, mapping) => count + mapping.insertedElements.length, 0);
  assert.equal(insertedAfter, insertedBefore * 2, "the points were built again for the (new) blocks");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-edit-mode"), "on", "edit mode stays on");
});

test("T34: pending block navigation resumes after a content patch", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: noop });
  harness.dispatchMessage({
    type: "previewEditSource",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: harness.messages.at(-1)?.editId,
    originalText: "Current block\n",
  });
  const textarea = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  assert.ok(textarea);
  // A changed block is saved before the editing moves on, so the navigation has to wait for the render.
  textarea.value = "Current block, changed\n";
  textarea.dispatch("input");
  const end = textarea.value.length;
  textarea.setSelectionRange(end, end);
  let prevented = false;
  textarea.dispatch("keydown", { key: "ArrowDown", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, true);
  const pending = harness.getWebviewState().pendingBlockNavigation as Record<string, unknown> | undefined;
  assert.equal(pending?.sourceLine, 100);
  assert.equal(pending?.caretPosition, "start");

  // The render of the saved block arrives as a patch.
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage());
  const open = messagesAfter(harness, before).find((message) => message.type === "previewEditOpen");
  assert.ok(open, "the next block is opened after the patch");
  assert.equal(open.line, 100);
  assert.deepEqual(
    { documentId: open.documentId, revision: open.revision, requestId: open.requestId },
    NEXT_IDENTIFIERS,
  );
  assert.equal(harness.getWebviewState().pendingBlockNavigation, undefined, "the navigation is spent");
  harness.dispatchMessage({
    type: "previewEditSource",
    ...NEXT_IDENTIFIERS,
    editId: open.editId,
    originalText: "Next block\n",
  });
  const next = harness.createdElements.filter((element) => element.tagName === "TEXTAREA").at(-1)!;
  assert.notEqual(next, textarea, "a new editor is open");
  assert.deepEqual(next.selectionRange, [0, 0], "the caret is at the start");
});

test("T34: patches sent before the page acknowledged the previous one apply in order", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  // The host addresses the second patch to the identifiers the first one introduces.
  harness.dispatchMessage(patchMessage({ contentHtml: "<p>one</p>" }));
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>two</p>",
  }));
  harness.dispatchMessage(patchMessage({
    revision: 9,
    requestId: 13,
    next: { revision: 10, requestId: 14 },
    contentHtml: "<p>three</p>",
  }));
  assert.equal(harness.previewContent.innerHTML, "<p>three</p>");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "14");
  const ready = messagesAfter(harness, before).filter((message) => message.type === "previewReady");
  assert.deepEqual(ready.map((message) => message.requestId), [12, 13, 14], "one ready report per patch, in order");
});

test("T34: when a patch of a chain is rejected, the later ones are ignored and nothing is acknowledged", () => {
  const harness = createRuntimeHarness();
  const before = harness.messages.length;
  harness.dispatchMessage(patchMessage({ status: "weird", contentHtml: "<p>rejected</p>" }));
  harness.dispatchMessage(patchMessage({
    revision: 8,
    requestId: 12,
    next: { revision: 9, requestId: 13 },
    contentHtml: "<p>orphan</p>",
  }));
  assert.equal(harness.previewContent.innerHTML, "");
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "11");
  assert.equal(messagesAfter(harness, before).length, 0, "no ready report, so the host's 2 s fallback loads the page");
});


// Editor keyboard bugs (hotkey-editing backlog): wrapped-line Up/Down, undo, wrapping markers.
