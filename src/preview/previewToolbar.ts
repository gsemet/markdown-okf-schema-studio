const THEME_BUTTON = `<button type="button" data-sphinx-preview-theme-toggle data-theme-mode="current" aria-label="Preview theme: Current theme" title="Current theme (click for dark theme)" data-tooltip="Current theme (click for dark theme)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="current"><rect x="3.5" y="4.5" width="17" height="12" rx="2"></rect><path d="M8 20h8M12 16.5V20"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="dark"><path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="white"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="cream"><path d="M6 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"></path><path d="M17 11h1a3 3 0 0 1 0 6h-1M8 6c0-1.2 1-1.2 1-2.5M12 6c0-1.2 1-1.2 1-2.5M16 6c0-1.2 1-1.2 1-2.5M4 21h16"></path></svg></button>`;

const REFRESH_BUTTON = `<button type="button" data-sphinx-preview-refresh aria-label="Refresh preview" title="Refresh preview" data-tooltip="Refresh preview"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7v5h-5M4 17v-5h5"></path><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"></path></svg></button>`;

const ANCHOR_BUTTON = `<button type="button" data-sphinx-preview-anchor data-anchor-mode="off" aria-pressed="false" aria-label="Anchor preview to text editor" title="Anchor preview to text editor" data-tooltip="Anchor preview to text editor"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;

const EDIT_BUTTON = `<button type="button" data-sphinx-preview-edit-toggle data-edit-mode="off" aria-pressed="false" aria-label="Toggle edit mode" title="Edit mode" data-tooltip="Edit mode"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg></button>`;

const BACK_BUTTON = `<button type="button" data-sphinx-preview-back disabled aria-label="Back" title="Back" data-tooltip="Back"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6"></path></svg></button>`;

const NEXT_BUTTON = `<button type="button" data-sphinx-preview-next disabled aria-label="Next" title="Next" data-tooltip="Next"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>`;

const ZOOM_OUT_BUTTON = `<button type="button" data-sphinx-preview-zoom-out aria-label="Zoom out" title="Zoom out" data-tooltip="Zoom out"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4M8 11h6"></path></svg></button>`;

const ZOOM_IN_BUTTON = `<button type="button" data-sphinx-preview-zoom-in aria-label="Zoom in" title="Zoom in" data-tooltip="Zoom in"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4M8 11h6M11 8v6"></path></svg></button>`;

const WIDTH_BUTTON = `<button type="button" data-sphinx-preview-width-toggle data-width-mode="margin" aria-label="Width: Margin" title="Width: Margin" data-tooltip="Width: Margin"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-width-icon="margin"><rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect><path d="M8 8v8M16 8v8"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-width-icon="auto"><rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect><path d="M8 8v8M16 8v8M3.5 12H11M13 12h7.5M9 10.5 7.5 12 9 13.5M15 10.5l1.5 1.5-1.5 1.5"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-width-icon="full"><rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect><path d="M7 12h10M9.5 9.5 7 12l2.5 2.5M14.5 9.5 17 12l-2.5 2.5"></path></svg></button>`;

const TOC_BUTTON = `<button type="button" data-sphinx-preview-toc-toggle aria-pressed="false" aria-label="Show table of contents" title="Show table of contents" data-tooltip="Show table of contents"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10"></path></svg></button>`;

const DIFF_BUTTON = `<button type="button" data-sphinx-preview-diff-toggle aria-pressed="true" aria-label="Hide changes since last commit" title="Hide changes since last commit" data-tooltip="Hide changes since last commit"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4v12M8 16a2.5 2.5 0 1 0 0 .01M16 20V8M16 8a2.5 2.5 0 1 0 0-.01M13.5 5.5 16 8l2.5-2.5"></path></svg></button>`;

const COLLAPSE_BUTTON = `<button type="button" data-sphinx-preview-toolbar-collapse aria-expanded="true" aria-controls="sphinx-preview-toolbar-more" aria-label="Hide view controls" title="Hide view controls" data-tooltip="Hide view controls"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-collapse-icon="hide"><path d="m6 15 6-6 6 6"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-collapse-icon="show"><path d="m6 9 6 6 6-6"></path></svg></button>`;

/**
 * Three rows. Row 1 (actions): Refresh, Anchor, Edit (writable previews only) and the collapse
 * button. Row 2 (navigation): Back, Next, Zoom out, Zoom in. Row 3 (view options): Theme, Width,
 * TOC, Diff. Rows 2 and 3 sit in one group that the collapse button hides; the Tab order follows
 * the rows.
 */
export function renderPreviewToolbar(editingEnabled = true): string {
  const mainRow = `<div data-sphinx-preview-toolbar-row="main">${REFRESH_BUTTON}${ANCHOR_BUTTON}${editingEnabled ? EDIT_BUTTON : ""}${COLLAPSE_BUTTON}</div>`;
  const viewRow = `<div data-sphinx-preview-toolbar-row="view">${BACK_BUTTON}${NEXT_BUTTON}${ZOOM_OUT_BUTTON}${ZOOM_IN_BUTTON}</div>`;
  const optionsRow = `<div data-sphinx-preview-toolbar-row="options">${THEME_BUTTON}${WIDTH_BUTTON}${TOC_BUTTON}${DIFF_BUTTON}</div>`;
  const moreRows = `<div data-sphinx-preview-toolbar-more id="sphinx-preview-toolbar-more">${viewRow}${optionsRow}</div>`;
  return `<div data-sphinx-preview-toolbar role="toolbar" aria-label="Preview controls">${mainRow}${moreRows}</div>`;
}

export function renderPreviewStickyHeadings(): string {
  return `<div data-sphinx-preview-sticky-headings hidden aria-hidden="true"></div>`;
}
