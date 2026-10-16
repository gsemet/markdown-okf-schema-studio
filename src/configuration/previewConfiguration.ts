export const PREVIEW_CONFIGURATION_SECTION = "markdownOkfSchemaStudio.preview";
export const MAX_PREVIEW_CONTENT_WIDTH = 2400;
export const DEFAULT_PREVIEW_CONTENT_WIDTH = 960;
export const MAX_STICKY_HEADING_DEPTH = 6;
export const DEFAULT_STICKY_HEADING_DEPTH = 3;

export interface PreviewConfigurationSource {
  get<T>(section: string, defaultValue: T): T;
}

export interface PreviewConfiguration {
  scrollPreviewWithEditor: boolean;
  scrollEditorWithPreview: boolean;
  markEditorSelection: boolean;
  doubleClickToSwitchToEditor: boolean;
  maxContentWidth: number;
  stickyHeadingDepth: number;
  /** Patch the preview content in place instead of reloading the page (kill switch, T34). */
  incrementalUpdates: boolean;
  /** Show the gray chips of HTML comments; TODO chips always show (T15). */
  showComments: boolean;
}

export const DEFAULT_PREVIEW_CONFIGURATION: PreviewConfiguration = {
  scrollPreviewWithEditor: true,
  scrollEditorWithPreview: true,
  markEditorSelection: false,
  doubleClickToSwitchToEditor: false,
  maxContentWidth: DEFAULT_PREVIEW_CONTENT_WIDTH,
  stickyHeadingDepth: DEFAULT_STICKY_HEADING_DEPTH,
  incrementalUpdates: true,
  showComments: true,
};

export function normalizePreviewContentWidth(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth;
  }
  return Math.min(MAX_PREVIEW_CONTENT_WIDTH, Math.round(value));
}

export function normalizeStickyHeadingDepth(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_STICKY_HEADING_DEPTH;
  }
  return Math.max(1, Math.min(MAX_STICKY_HEADING_DEPTH, Math.round(value)));
}

export function readPreviewConfiguration(
  source: PreviewConfigurationSource,
): PreviewConfiguration {
  const maxContentWidth = source.get(
    "maxContentWidth",
    DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth,
  );
  const stickyHeadingDepth = source.get(
    "stickyHeadingDepth",
    DEFAULT_PREVIEW_CONFIGURATION.stickyHeadingDepth,
  );
  return {
    scrollPreviewWithEditor: source.get(
      "scrollPreviewWithEditor",
      DEFAULT_PREVIEW_CONFIGURATION.scrollPreviewWithEditor,
    ),
    scrollEditorWithPreview: source.get(
      "scrollEditorWithPreview",
      DEFAULT_PREVIEW_CONFIGURATION.scrollEditorWithPreview,
    ),
    markEditorSelection: source.get(
      "markEditorSelection",
      DEFAULT_PREVIEW_CONFIGURATION.markEditorSelection,
    ),
    doubleClickToSwitchToEditor: source.get(
      "doubleClickToSwitchToEditor",
      DEFAULT_PREVIEW_CONFIGURATION.doubleClickToSwitchToEditor,
    ),
    maxContentWidth: normalizePreviewContentWidth(maxContentWidth),
    stickyHeadingDepth: normalizeStickyHeadingDepth(stickyHeadingDepth),
    incrementalUpdates: source.get(
      "incrementalUpdates",
      DEFAULT_PREVIEW_CONFIGURATION.incrementalUpdates,
    ),
    showComments: source.get("showComments", DEFAULT_PREVIEW_CONFIGURATION.showComments),
  };
}
