import { parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";

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

export function normalizeSourceFileIdentity(value: string): string {
  return value.replace(/\\/gu, "/");
}

function childNodes(node: DefaultTreeAdapterTypes.Node): DefaultTreeAdapterTypes.Node[] {
  return "childNodes" in node ? node.childNodes : [];
}

function attributeValue(element: DefaultTreeAdapterTypes.Element, name: string): string | undefined {
  return element.attrs.find((attribute) => attribute.name === name)?.value;
}

function setAttributeValue(element: DefaultTreeAdapterTypes.Element, name: string, value: string): void {
  const existing = element.attrs.find((attribute) => attribute.name === name);
  if (existing) {
    existing.value = value;
  } else {
    element.attrs.push({ name, value });
  }
}

export function annotateSourceMappings(html: string, options: SourceMappingOptions): string {
  const fragment = parseFragment(html);
  let blockNumber = 0;

  const visit = (node: DefaultTreeAdapterTypes.Node): void => {
    if ("tagName" in node && "attrs" in node) {
      const sourceLine = attributeValue(node, SOURCE_LINE_ATTRIBUTE)
        ?? attributeValue(node, "data-line");
      const parsedLine = Number(sourceLine);
      if (sourceLine && /^[1-9]\d*$/u.test(sourceLine) && Number.isSafeInteger(parsedLine)) {
        setAttributeValue(
          node,
          SOURCE_FILE_ATTRIBUTE,
          attributeValue(node, SOURCE_FILE_ATTRIBUTE) || options.activeSourceFile,
        );
        setAttributeValue(node, SOURCE_LINE_ATTRIBUTE, sourceLine);
        setAttributeValue(node, PREVIEW_DOCUMENT_ATTRIBUTE, options.documentId);
        setAttributeValue(node, PREVIEW_BLOCK_ATTRIBUTE, `source-block-${++blockNumber}`);
      }
    }
    for (const child of childNodes(node)) {
      visit(child);
    }
  };

  visit(fragment);
  return serialize(fragment);
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
