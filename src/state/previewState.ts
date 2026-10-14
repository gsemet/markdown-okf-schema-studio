export interface PreviewPanelState {
  documentId: string;
  sourceFile: string;
  sourceLine?: number;
  scrollTop?: number;
  focusedBlockId?: string;
  selectedText?: string;
  openDisclosures?: readonly number[];
  descriptionsCollapsed?: boolean;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 1
    ? value as number
    : undefined;
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function parsePreviewPanelState(value: unknown): PreviewPanelState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<PreviewPanelState>;
  if (
    typeof candidate.documentId !== "string"
    || candidate.documentId.length === 0
    || typeof candidate.sourceFile !== "string"
    || candidate.sourceFile.length === 0
  ) {
    return undefined;
  }

  const sourceLine = optionalPositiveInteger(candidate.sourceLine);
  const scrollTop = optionalNonNegativeNumber(candidate.scrollTop);
  const openDisclosures = Array.isArray(candidate.openDisclosures)
    ? candidate.openDisclosures.filter(
      (index): index is number => Number.isSafeInteger(index) && index >= 0 && index < 10_000,
    ).slice(0, 100)
    : undefined;
  return {
    documentId: candidate.documentId,
    sourceFile: candidate.sourceFile,
    ...(sourceLine === undefined ? {} : { sourceLine }),
    ...(scrollTop === undefined ? {} : { scrollTop }),
    ...(typeof candidate.focusedBlockId === "string"
      && candidate.focusedBlockId.length <= 200
      ? { focusedBlockId: candidate.focusedBlockId }
      : {}),
    ...(typeof candidate.selectedText === "string"
      && candidate.selectedText.length <= 4_096
      ? { selectedText: candidate.selectedText }
      : {}),
    ...(openDisclosures && openDisclosures.length > 0 ? { openDisclosures } : {}),
    ...(typeof candidate.descriptionsCollapsed === "boolean"
      ? { descriptionsCollapsed: candidate.descriptionsCollapsed } : {}),
  };
}

export function isPreviewPanelState(value: unknown): value is PreviewPanelState {
  return parsePreviewPanelState(value) !== undefined;
}
