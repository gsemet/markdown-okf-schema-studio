// @implements_req SwRS-MDOKFSTUDIO-LIFE-178
/**
 * The line marker (`page/features/lineMarker.ts`): one decorative overlay on the requested source
 * line, a light band across the content column and an arrow pointing right in the left margin of
 * the text (in the content gutter, so no character of the line is covered). It
 * reads the accent token only, so it shows in light, dark, cream, white and high contrast themes. It
 * has no animation, ignores the pointer, and sits under the handle layers of edit mode (z-index 2
 * and above) so it covers neither the list item handle, the row handle nor the block actions.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`).
 */
export const LINE_MARKER_CSS = `
.sphinx-preview-line-marker {
  --sphinx-preview-line-marker: var(--studio-focusBorder, #0078d4);
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  pointer-events: none;
  background: color-mix(in srgb, var(--sphinx-preview-line-marker) 16%, transparent);
  border-inline-start: 2px solid var(--sphinx-preview-line-marker);
}

.sphinx-preview-line-marker-arrow {
  position: absolute;
  inset-block-start: 50%;
  /* In the left margin of the text: the content gutter minus the arrow (9px) and a gap (4px), so
     the arrow never covers the line's first characters. */
  inset-inline-start: max(1px, calc(var(--sphinx-preview-content-gutter, 16px) - 13px));
  width: 0;
  height: 0;
  transform: translateY(-50%);
  border-block: 6px solid transparent;
  border-inline-start: 9px solid var(--sphinx-preview-line-marker);
}

/* Edit mode: the list item handle and the row handle sit just left of the text (1.5em wide, above
   the marker), so the arrow moves one handle further left and never meets them. */
html[data-sphinx-preview-edit-mode="on"] .sphinx-preview-line-marker-arrow {
  inset-inline-start: max(1px, calc(var(--sphinx-preview-content-gutter, 16px) - 13px - 1.5em));
}

@media (forced-colors: active) {
  .sphinx-preview-line-marker {
    --sphinx-preview-line-marker: Highlight;
    background: transparent;
    border-block: 1px solid Highlight;
  }
}
`;
