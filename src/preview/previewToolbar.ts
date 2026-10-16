const THEME_BUTTON = `<button type="button" data-sphinx-preview-theme-toggle data-theme-mode="current" aria-label="Preview theme: Current theme" title="Current theme (click for dark theme)" data-tooltip="Current theme (click for dark theme)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="current"><rect x="3.5" y="4.5" width="17" height="12" rx="2"></rect><path d="M8 20h8M12 16.5V20"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="dark"><path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="white"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="cream"><path d="M6 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"></path><path d="M17 11h1a3 3 0 0 1 0 6h-1M8 6c0-1.2 1-1.2 1-2.5M12 6c0-1.2 1-1.2 1-2.5M16 6c0-1.2 1-1.2 1-2.5M4 21h16"></path></svg></button>`;

const REFRESH_BUTTON = `<button type="button" data-sphinx-preview-refresh aria-label="Refresh preview" title="Refresh preview" data-tooltip="Refresh preview"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7v5h-5M4 17v-5h5"></path><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"></path></svg></button>`;

const ANCHOR_BUTTON = `<button type="button" data-sphinx-preview-anchor data-anchor-mode="off" aria-pressed="false" aria-label="Anchor preview to text editor" title="Anchor preview to text editor" data-tooltip="Anchor preview to text editor"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;

const EDIT_BUTTON = `<button type="button" data-sphinx-preview-edit-toggle data-edit-mode="off" aria-pressed="false" aria-label="Toggle edit mode" title="Edit mode" data-tooltip="Edit mode"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg></button>`;

const ZOOM_OUT_BUTTON = `<button type="button" data-sphinx-preview-zoom-out aria-label="Zoom out" title="Zoom out" data-tooltip="Zoom out"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4M8 11h6"></path></svg></button>`;

const ZOOM_IN_BUTTON = `<button type="button" data-sphinx-preview-zoom-in aria-label="Zoom in" title="Zoom in" data-tooltip="Zoom in"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4M8 11h6M11 8v6"></path></svg></button>`;

export function renderPreviewToolbar(editingEnabled = true): string {
  const mainRow = `<div data-sphinx-preview-toolbar-row="main">${REFRESH_BUTTON}${ANCHOR_BUTTON}${editingEnabled ? EDIT_BUTTON : ""}${THEME_BUTTON}</div>`;
  const viewRow = `<div data-sphinx-preview-toolbar-row="view">${ZOOM_OUT_BUTTON}${ZOOM_IN_BUTTON}</div>`;
  return `<div data-sphinx-preview-toolbar role="toolbar" aria-label="Preview controls">${mainRow}${viewRow}</div>`;
}

export function renderPreviewStickyHeadings(): string {
  return `<div data-sphinx-preview-sticky-headings hidden aria-hidden="true"></div>`;
}
