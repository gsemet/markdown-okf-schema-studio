export const SOURCE_FILE_ATTRIBUTE = "data-sphinx-source-file";
export const SOURCE_LINE_ATTRIBUTE = "data-sphinx-source-line";
export const PREVIEW_DOCUMENT_ATTRIBUTE = "data-sphinx-preview-document";
export const PREVIEW_BLOCK_ATTRIBUTE = "data-sphinx-preview-block";

export interface MappingElement {
  getAttribute(name: string): string | null;
}

export interface SourceBlockMapping {
  element: MappingElement;
  blockId: string;
  sourceFile: string;
  sourceLine: number;
  documentId: string;
  domOrder: number;
}

export interface SourceMappingOptions {
  documentId: string;
  activeSourceFile: string;
}

export interface SourceRangeOffsets {
  start: number;
  end: number;
}

export function sourceRangeForLines(
  sourceText: string,
  startLine: number,
  endLine: number,
): SourceRangeOffsets | undefined {
  if (
    !Number.isSafeInteger(startLine)
    || !Number.isSafeInteger(endLine)
    || startLine < 1
    || endLine < startLine
  ) {
    return undefined;
  }
  const lineStarts = [0];
  for (const lineEnding of sourceText.matchAll(/\r\n|\n|\r/gu)) {
    if (lineEnding.index !== undefined) {
      lineStarts.push(lineEnding.index + lineEnding[0].length);
    }
  }
  if (endLine > lineStarts.length) {
    return undefined;
  }
  return {
    start: lineStarts[startLine - 1],
    end: endLine < lineStarts.length ? lineStarts[endLine] : sourceText.length,
  };
}

 function normalizeSourceFileIdentity(value: string): string {
  return value.replace(/\\/gu, "/");
}

export function parseSourceMappings(
  elements: readonly MappingElement[],
  options: SourceMappingOptions,
): SourceBlockMapping[] {
  const expectedSourceFile = normalizeSourceFileIdentity(options.activeSourceFile);
  return elements
    .map((element, domOrder) => {
      const sourceFile = element.getAttribute(SOURCE_FILE_ATTRIBUTE);
      const sourceLine = element.getAttribute(SOURCE_LINE_ATTRIBUTE);
      const documentId = element.getAttribute(PREVIEW_DOCUMENT_ATTRIBUTE);
      const parsedLine = sourceLine ? Number(sourceLine) : Number.NaN;
      if (
        !sourceFile
        || !sourceLine
        || !documentId
        || documentId !== options.documentId
        || normalizeSourceFileIdentity(sourceFile) !== expectedSourceFile
        || !/^[1-9]\d*$/u.test(sourceLine)
        || !Number.isSafeInteger(parsedLine)
      ) {
        return undefined;
      }
      return {
        element,
        blockId: element.getAttribute(PREVIEW_BLOCK_ATTRIBUTE) ?? `source-block-${domOrder + 1}`,
        sourceFile,
        sourceLine: parsedLine,
        documentId,
        domOrder,
      } satisfies SourceBlockMapping;
    })
    .filter((mapping): mapping is SourceBlockMapping => mapping !== undefined);
}
