const THEME_BUTTON = `<button type="button" data-sphinx-preview-theme-toggle data-theme-mode="current" aria-label="Preview theme: Current theme" title="Current theme (click for dark theme)" data-tooltip="Current theme (click for dark theme)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="current"><rect x="3.5" y="4.5" width="17" height="12" rx="2"></rect><path d="M8 20h8M12 16.5V20"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="dark"><path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z"></path></svg><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="white"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg></button>`;

const REFRESH_BUTTON = `<button type="button" data-sphinx-preview-refresh aria-label="Refresh preview" title="Refresh preview" data-tooltip="Refresh preview"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7v5h-5M4 17v-5h5"></path><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"></path></svg></button>`;

const ANCHOR_BUTTON = `<button type="button" data-sphinx-preview-anchor data-anchor-mode="off" aria-pressed="false" aria-label="Anchor preview to text editor" title="Anchor preview to text editor" data-tooltip="Anchor preview to text editor"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;

const EDIT_BUTTON = `<button type="button" data-sphinx-preview-edit-toggle data-edit-mode="off" aria-pressed="false" aria-label="Toggle edit mode" title="Edit mode" data-tooltip="Edit mode"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg></button>`;

export function renderPreviewToolbar(editingEnabled = true): string {
  return `<div data-sphinx-preview-toolbar role="toolbar" aria-label="Preview controls">${REFRESH_BUTTON}${ANCHOR_BUTTON}${editingEnabled ? EDIT_BUTTON : ""}${THEME_BUTTON}</div>`;
}

export function renderPreviewStickyHeadings(): string {
  return `<div data-sphinx-preview-sticky-headings hidden aria-hidden="true"></div>`;
}
