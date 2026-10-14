/**
 * OKF frontmatter awareness for the MyST preview.
 *
 * Extracts YAML frontmatter, discovers the OKF schema of the enclosing bundle
 * (nearest `_schema`/`_schemas` ancestor directory), and validates the
 * frontmatter against it with JSON Schema Draft 2020-12. The result is a
 * structured payload injected into the preview webview, which renders the
 * Obsidian-style properties table with validation overlays.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  Document as YamlDocumentBuilder,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  stringify,
  YAMLMap,
  type Document as YamlDocument,
  type Node as YamlNode,
  type Pair,
  type YAMLSeq,
} from "yaml";
import {
  inspectFrontmatterLinks,
  filenameStemSuggestions,
  type FileLinkInspectionOptions,
  type FrontmatterLinkResult,
} from "./fileLinks";
import {
  getCachedValidator,
  validateWithCachedValidator,
} from "./schemaValidator";

export const SCHEMA_DIRECTORIES = ["_schema", "_schemas"] as const;
export const SCHEMA_FILE_EXTENSIONS = [".json", ".json5", ".yaml", ".yml"] as const;

export type ValidationSeverity = "info" | "warning" | "error";

export interface FieldIssue {
  severity: ValidationSeverity;
  message: string;
  origin?: "schema" | "link";
}

export interface FieldEntry {
  name: string;
  value: unknown;
  valueKind: "scalar" | "list" | "null";
  nullable: boolean;
  /** Obsidian-like field type used to pick the type icon in the table. */
  fieldType: FieldType;
  doc: { title?: string; description?: string } | null;
  enums: string[] | null;
  issues: FieldIssue[];
  known: boolean;
  /** True when the effective schema requires this field; such a field cannot be removed. */
  required?: boolean;
  linkResults?: FrontmatterLinkResult[];
  /** Known Markdown filename stems, set only for filename-stem link fields after link inspection. */
  linkSuggestions?: string[];
}

/**
 * Obsidian-like property types. The icon in the table is chosen from this
 * union; enums show the list-with-arrow icon, booleans the checkbox.
 */
export type FieldType =
  | "text"
  | "number"
  | "list"
  | "checkbox"
  | "enum"
  | "date"
  | "time"
  | "datetime"
  | "unknown";

/**
 * Maps a schema property declaration (or, when no schema matched, the YAML
 * value itself) to a display type for the table icon.
 */
export function fieldIconType(
  property: unknown,
  value: unknown,
  enums: string[] | null,
): FieldType {
  const record = property && typeof property === "object"
    ? property as Record<string, unknown>
    : undefined;
  if (record) {
    if (record.enum !== undefined || record.const !== undefined) {
      return "enum";
    }
    if (typeof record.format === "string") {
      const format = record.format.toLowerCase();
      if (format === "date-time" || format === "datetime") {
        return "datetime";
      }
      if (format === "date") {
        return "date";
      }
      if (format === "time") {
        return "time";
      }
    }
    const type = record.type;
    if (Array.isArray(type)) {
      const primary = type.find((entry) => entry !== "null");
      if (primary === "boolean") return "checkbox";
      if (primary === "number" || primary === "integer") return "number";
      if (primary === "array") return "list";
      if (primary === "string") return "text";
    } else if (typeof type === "string") {
      if (type === "boolean") return "checkbox";
      if (type === "number" || type === "integer") return "number";
      if (type === "array") return "list";
      if (type === "string") return "text";
    }
    if (Array.isArray(record.allOf) || Array.isArray(record.anyOf) || Array.isArray(record.oneOf)) {
      return "unknown";
    }
  }
  if (enums && enums.length > 0) {
    return "enum";
  }
  if (typeof value === "boolean") {
    return "checkbox";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (Array.isArray(value)) {
    return "list";
  }
  return "unknown";
}

export interface FrontmatterResult {
  present: boolean;
  fields: FieldEntry[];
  availableKeys?: string[];
  availableFields?: AvailableFieldEntry[];
  orderMode: "schema" | "yaml";
  schemaFound: boolean;
  missingRequiredFields: string[];
  info: FieldIssue[];
  summary: { errors: number; warnings: number; infos: number };
  linkResults?: FrontmatterLinkResult[];
  /** False only when the matched schema root declares `additionalProperties: false`. */
  additionalPropertiesAllowed?: boolean;
}

export interface AvailableFieldEntry {
  name: string;
  fieldType: FieldType;
  enums: string[] | null;
  defaultValue?: unknown;
}

export interface FrontmatterExtraction {
  present: boolean;
  /** Raw YAML text between the opening `---` and the closing `---` or `...`. */
  text: string;
  frontmatter: Record<string, unknown> | undefined;
  document: YamlDocument | undefined;
  error: string | undefined;
}

export interface FrontmatterFieldPatch {
  start: number;
  end: number;
  text: string;
  /** Set by an add with `afterField`: true when the new field was placed after that field. */
  positioned?: boolean;
}

function yamlNodeValue(node: unknown): unknown {
  return node && typeof node === "object" && "toJSON" in node
    && typeof node.toJSON === "function"
    ? (node as YamlNode).toJSON()
    : node;
}

function yamlValueKey(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function preserveYamlNodeMetadata(source: YamlNode, target: YamlNode): YamlNode {
  target.comment = source.comment;
  target.commentBefore = source.commentBefore;
  target.spaceBefore = source.spaceBefore;
  const sourcePresentation = source as YamlNode & {
    anchor?: string;
    tag?: string;
    flow?: boolean;
  };
  const targetPresentation = target as YamlNode & {
    anchor?: string;
    tag?: string;
    flow?: boolean;
  };
  targetPresentation.anchor = sourcePresentation.anchor;
  targetPresentation.tag = sourcePresentation.tag;
  targetPresentation.flow = sourcePresentation.flow;

  if (isMap(source) && isMap(target)) {
    const available = source.items.map((entry) => ({ entry, used: false }));
    target.items = target.items.map((entry) => {
      const sourceEntry = available.find((candidate) => {
        if (candidate.used || !isScalar(candidate.entry.key) || !isScalar(entry.key)) return false;
        return candidate.entry.key.value === entry.key.value;
      });
      if (!sourceEntry) return entry;
      sourceEntry.used = true;
      if (sourceEntry.entry.key && entry.key) {
        entry.key = preserveYamlNodeMetadata(
          sourceEntry.entry.key as YamlNode,
          entry.key as YamlNode,
        );
      }
      if (sourceEntry.entry.value && entry.value) {
        entry.value = preserveYamlNodeMetadata(
          sourceEntry.entry.value as YamlNode,
          entry.value as YamlNode,
        );
      }
      return entry;
    });
  } else if (isSeq(source) && isSeq(target)) {
    target.items = target.items.map((item, index) => {
      const sourceItem = source.items[index];
      return sourceItem && item
        ? preserveYamlNodeMetadata(sourceItem as YamlNode, item as YamlNode)
        : item;
    });
  }
  return target;
}

function updateYamlSequence(
  document: YamlDocument,
  sequence: YAMLSeq<unknown>,
  value: unknown[],
): void {
  const available = sequence.items.map((node, index) => ({
    node,
    index,
    used: false,
    key: yamlValueKey(yamlNodeValue(node)),
  }));
  sequence.items = value.map((item, index) => {
    const key = yamlValueKey(item);
    const match = available.find((candidate) => !candidate.used && candidate.key === key)
      ?? available.find((candidate) => !candidate.used && candidate.index === index)
      ?? available.find((candidate) => !candidate.used);
    if (!match) return document.createNode(item);
    match.used = true;
    if (isScalar(match.node) && (item === null || typeof item !== "object")) {
      if (match.key === key) return match.node;
      return preserveYamlNodeMetadata(match.node, document.createNode(item));
    }
    return preserveYamlNodeMetadata(match.node as YamlNode, document.createNode(item));
  });
}

function createFrontmatterDocumentPatch(
  source: string,
  document: YamlDocument,
): FrontmatterFieldPatch | undefined {
  const match = /^(---\r?\n)([\s\S]*?)(?:\r?\n)?(---|\.\.\.)[ \t]*(?:\r?\n|$)/u.exec(source);
  if (!match) return undefined;
  const lineEnding = match[1].endsWith("\r\n") ? "\r\n" : "\n";
  const text = document
    .toString({ lineWidth: 0 })
    .replace(/\r\n|\r|\n/gu, lineEnding)
    .replace(/(?:\r\n|\r|\n)$/u, "");
  const start = match[1].length;
  return { start, end: start + match[2].length, text };
}

/** Extracts the frontmatter block the way MyST does: leading `---` fence. */
export function extractFrontmatter(source: string): FrontmatterExtraction {
  const match = /^---\r?\n([\s\S]*?)(?:\r?\n)?(?:---|\.\.\.)\s*(?:\r?\n|$)/u.exec(source);
  if (!match) {
    return { present: false, text: "", frontmatter: undefined, document: undefined, error: undefined };
  }
  const text = match[1];
  try {
    const document = parseDocument(text, { keepSourceTokens: true });
    if (document.errors.length > 0) {
      return {
        present: true,
        text,
        frontmatter: undefined,
        document,
        error: document.errors.map((error) => error.message).join("; "),
      };
    }
    const value = document.toJS({ maxAliasCount: 100 }) as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { present: true, text, frontmatter: undefined, document, error: "Frontmatter is not a mapping." };
    }
    return { present: true, text, frontmatter: value, document, error: undefined };
  } catch (error) {
    return {
      present: true,
      text,
      frontmatter: undefined,
      document: undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Returns the identity used by an x-okf-link marker hint. */
export function frontmatterLinkIdentity(
  source: string,
  filePath: string,
  idMarker?: string,
): string | undefined {
  if (idMarker !== undefined && idMarker.trim()) {
    const value = extractFrontmatter(source).frontmatter?.[idMarker];
    return typeof value === "string" && value.trim() ? value : undefined;
  }
  return path.basename(filePath, path.extname(filePath));
}

export type ParsedYamlValue =
  | { valid: true; value: unknown }
  | { valid: false; error: string };

export function parseYamlValue(source: string): ParsedYamlValue {
  if (!source.trim()) {
    return { valid: false, error: "Enter a YAML value." };
  }
  try {
    const document = parseDocument(source);
    if (document.errors.length > 0) {
      return { valid: false, error: document.errors.map((error) => error.message).join("; ") };
    }
    const value = document.toJS({ maxAliasCount: 100 });
    if (value === undefined) {
      return { valid: false, error: "Enter a YAML value." };
    }
    return { valid: true, value };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type RangedNode = { range?: [number, number, number] | null };

function nodeRange(node: unknown): [number, number, number] | undefined {
  const range = (node as RangedNode | null | undefined)?.range;
  return range ?? undefined;
}

function hasAnchorOrAlias(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  return isAlias(node) || Boolean((node as { anchor?: unknown }).anchor);
}

/** True for a flow collection, detected from its opening bracket in the source text. */
function isFlowCollection(text: string, node: unknown): boolean {
  const range = nodeRange(node);
  if (!range || !(isSeq(node) || isMap(node))) return false;
  return text[range[0]] === "[" || text[range[0]] === "{";
}

/** Whether the lines of a block sequence are indented, judged from its first item. */
function blockSequenceIndented(text: string, sequence: YAMLSeq<unknown>): boolean | undefined {
  const range = nodeRange(sequence.items[0]);
  if (!range) return undefined;
  const lineStart = text.lastIndexOf("\n", range[0] - 1) + 1;
  const indent = /^ */u.exec(text.slice(lineStart))?.[0].length ?? 0;
  return indent > 0;
}

interface YamlStyle {
  indentSeq: boolean;
  flowCollectionPadding: boolean;
  lineWidth: number;
}

/** True for a flow collection written with a space after its opening bracket. */
function paddedFlowCollection(text: string, node: unknown): boolean {
  const range = nodeRange(node);
  if (!range || !isFlowCollection(text, node)) return false;
  return text.startsWith("[ ", range[0]) || text.startsWith("{ ", range[0]);
}

/**
 * The layout that a rendered pair should follow. With `pair`, the layout comes from that pair's
 * own value and the document's other top-level sequences. Without it, the document is scanned.
 */
function yamlStyle(text: string, document: YamlDocument, pair?: Pair): YamlStyle {
  const root = document.contents;
  const originalValue = pair?.value as YamlNode | null | undefined;
  let indentSeq: boolean | undefined;
  if (isSeq(originalValue) && !isFlowCollection(text, originalValue)) {
    indentSeq = blockSequenceIndented(text, originalValue);
  }
  if (indentSeq === undefined && isMap(root)) {
    for (const entry of root.items) {
      if (isSeq(entry.value) && !isFlowCollection(text, entry.value)) {
        indentSeq = blockSequenceIndented(text, entry.value);
        if (indentSeq !== undefined) break;
      }
    }
  }
  const flowCollectionPadding = pair !== undefined
    ? paddedFlowCollection(text, originalValue)
    : isMap(root) && root.items.some((entry) => paddedFlowCollection(text, entry.value));
  return { indentSeq: indentSeq ?? true, flowCollectionPadding, lineWidth: 0 };
}

/**
 * Source range of one top-level field's lines: from the start of the key's line to the end of the
 * value's last line. The range excludes the line break that ends that line.
 */
function fieldRegion(text: string, pair: Pair): { start: number; end: number } | undefined {
  const keyRange = nodeRange(pair.key);
  if (!keyRange) return undefined;
  const keyStart = keyRange[0];
  const start = text.lastIndexOf("\n", keyStart - 1) + 1;
  if (keyStart !== start) return undefined;
  const valueRange = nodeRange(pair.value);
  const valueEnd = valueRange ? valueRange[1] : keyRange[1] + 1;
  if (valueEnd <= keyStart || valueEnd > text.length) return undefined;
  let end = text.indexOf("\n", valueEnd - 1);
  if (end < 0) end = text.length;
  if (end > 0 && text[end - 1] === "\r") end -= 1;
  return { start, end };
}

/**
 * End of a field including the comment lines that yaml attaches to its value (they lie before the value
 * node's end, `range[2]`). Excludes the final line break.
 */
function fieldEndWithTrailingComments(text: string, pair: Pair, regionEnd: number): number {
  const nodeEnd = nodeRange(pair.value)?.[2] ?? 0;
  let end = regionEnd;
  let cursor = regionEnd;
  while (cursor < text.length) {
    const lineStart = text.indexOf("\n", cursor) + 1;
    if (lineStart === 0 || lineStart >= nodeEnd) break;
    let lineEnd = text.indexOf("\n", lineStart);
    if (lineEnd < 0) lineEnd = text.length;
    const contentEnd = lineEnd > lineStart && text[lineEnd - 1] === "\r" ? lineEnd - 1 : lineEnd;
    if (/^[ \t]*#/u.test(text.slice(lineStart, contentEnd))) end = contentEnd;
    cursor = lineEnd;
  }
  return end;
}

/**
 * Renders one pair as YAML text with the given style. The pair's own comments are removed while it
 * is rendered and restored afterwards. `suppressValueComment` drops the value's trailing comment,
 * which the source text keeps itself. Line breaks follow `lineEnding`, and the final break is
 * removed.
 */
function renderPair(
  pair: Pair,
  style: YamlStyle,
  lineEnding: string,
  suppressValueComment: boolean,
): string {
  const keyNode = pair.key as YamlNode;
  const pairSpacing = pair as Pair & { spaceBefore?: boolean };
  const newValue = pair.value as YamlNode | null | undefined;
  const commentNode = suppressValueComment
    && newValue && (isScalar(newValue) || isSeq(newValue) || isMap(newValue))
    ? newValue
    : undefined;
  const savedKeyCommentBefore = keyNode.commentBefore;
  const savedKeySpaceBefore = keyNode.spaceBefore;
  const savedPairSpaceBefore = pairSpacing.spaceBefore;
  const savedValueComment = commentNode?.comment;
  let rendered: string;
  try {
    keyNode.commentBefore = undefined;
    keyNode.spaceBefore = undefined;
    pairSpacing.spaceBefore = undefined;
    if (commentNode) commentNode.comment = undefined;
    const map = new YAMLMap();
    map.items.push(pair);
    const single = new YamlDocumentBuilder();
    single.contents = map;
    rendered = single.toString({
      lineWidth: style.lineWidth,
      indentSeq: style.indentSeq,
      flowCollectionPadding: style.flowCollectionPadding,
    });
  } finally {
    keyNode.commentBefore = savedKeyCommentBefore;
    keyNode.spaceBefore = savedKeySpaceBefore;
    pairSpacing.spaceBefore = savedPairSpaceBefore;
    if (commentNode) commentNode.comment = savedValueComment;
  }
  // Same normalization as createFrontmatterDocumentPatch: the yaml library keeps `\r\n` inside
  // multi-line comments, and a lone `\r` would become a blank line in the editor.
  return rendered
    .replace(/\r\n|\r|\n/gu, lineEnding)
    .replace(/(?:\r\n|\r|\n)$/u, "");
}

/**
 * True when the candidate YAML parses without errors, has the expected data, and lists its keys in
 * the expected order.
 */
function verified(candidate: string, expected: Record<string, unknown>): boolean {
  const check = parseDocument(candidate);
  if (check.errors.length > 0 || !isMap(check.contents)) return false;
  const actual = check.toJS({ maxAliasCount: 100 }) as Record<string, unknown>;
  return isDeepStrictEqual(actual, expected)
    && isDeepStrictEqual(Object.keys(actual), Object.keys(expected));
}

/**
 * Builds a patch that covers only the lines of one existing top-level field. The pair has
 * already been modified by the caller. Returns undefined when the minimal patch cannot be built
 * or does not verify; the caller then falls back to the whole-document patch.
 */
function minimalPairPatch(
  source: string,
  extraction: FrontmatterExtraction,
  pair: Pair,
  expected: Record<string, unknown>,
  plainScalar = false,
): FrontmatterFieldPatch | undefined {
  const fence = /^---\r?\n/u.exec(source);
  if (!fence) return undefined;
  const text = extraction.text;
  const yamlStart = fence[0].length;
  const lineEnding = fence[0].endsWith("\r\n") ? "\r\n" : "\n";

  // The original document gives the source ranges and styles; `pair` holds the new values.
  const original = parseDocument(text, { keepSourceTokens: true });
  const originalRoot = original.contents;
  if (!isMap(originalRoot) || !isScalar(pair.key)) return undefined;
  const keyName = pair.key.value;
  const originalPair = originalRoot.items.find((entry) =>
    isScalar(entry.key) && entry.key.value === keyName);
  if (!originalPair) return undefined;
  const originalKey = originalPair.key as YamlNode;
  const originalValue = originalPair.value as YamlNode | null | undefined;
  const keyRange = nodeRange(originalKey);
  if (!keyRange || hasAnchorOrAlias(originalKey) || hasAnchorOrAlias(originalValue)) {
    return undefined;
  }
  const region = fieldRegion(text, originalPair);
  if (!region) return undefined;
  const regionStart = region.start;
  const regionEnd = region.end;

  const valueRange = nodeRange(originalValue);
  const valueEnd = valueRange ? valueRange[1] : keyRange[1] + 1;
  // A block scalar keeps its comment in the `>-` / `|` header, inside the region.
  const originalIsBlockScalar = isScalar(originalValue)
    && (originalValue.type === "BLOCK_FOLDED" || originalValue.type === "BLOCK_LITERAL");
  const suffix = !originalIsBlockScalar && valueEnd <= regionEnd ? text.slice(valueEnd, regionEnd) : "";
  const style = yamlStyle(text, original, originalPair);

  // Lines outside the region (comments before the key, the key's spacing) must not be emitted.
  const newValue = pair.value as YamlNode | null | undefined;
  const newScalar = isScalar(newValue) ? newValue : undefined;
  const savedValueType = newScalar?.type;
  let body: string;
  try {
    if (plainScalar && newScalar && typeof newScalar.value === "string") {
      // A new custom key is written the way a person would type it: plain when YAML allows it.
      newScalar.type = isPlainSafeScalar(newScalar.value) ? "PLAIN" : "QUOTE_DOUBLE";
    } else if (isScalar(originalValue) && newScalar && typeof newScalar.value === "string"
      && originalValue.type !== "PLAIN") {
      newScalar.type = originalValue.type;
    }
    body = renderPair(pair, style, lineEnding, !originalIsBlockScalar);
  } finally {
    if (newScalar) newScalar.type = savedValueType;
  }
  const replacement = body + suffix;

  const candidate = text.slice(0, regionStart) + replacement + text.slice(regionEnd);
  if (!verified(candidate, expected)) return undefined;
  return { start: yamlStart + regionStart, end: yamlStart + regionEnd, text: replacement };
}

/** Replaces only the key text of one field. Returns undefined when that does not verify. */
function minimalRenamePatch(
  source: string,
  extraction: FrontmatterExtraction,
  currentName: string,
  newName: string,
): FrontmatterFieldPatch | undefined {
  const fence = /^---\r?\n/u.exec(source);
  if (!fence || !extraction.frontmatter) return undefined;
  const text = extraction.text;
  const yamlStart = fence[0].length;
  const original = parseDocument(text, { keepSourceTokens: true });
  const root = original.contents;
  if (!isMap(root)) return undefined;
  const pair = root.items.find((entry) => isScalar(entry.key) && entry.key.value === currentName);
  if (!pair) return undefined;
  const keyRange = nodeRange(pair.key);
  if (!keyRange || hasAnchorOrAlias(pair.key)) return undefined;
  const keyText = stringify(newName, { lineWidth: 0 }).trimEnd();
  const candidate = text.slice(0, keyRange[0]) + keyText + text.slice(keyRange[1]);
  const expected = Object.fromEntries(
    Object.entries(extraction.frontmatter).map(([key, value]) =>
      [key === currentName ? newName : key, value]),
  );
  if (!verified(candidate, expected)) return undefined;
  return { start: yamlStart + keyRange[0], end: yamlStart + keyRange[1], text: keyText };
}

/** Deletes the whole lines of one field. Returns undefined when the minimal patch does not verify. */
function minimalRemovePatch(
  source: string,
  extraction: FrontmatterExtraction,
  name: string,
): FrontmatterFieldPatch | undefined {
  const fence = /^---\r?\n/u.exec(source);
  if (!fence || !extraction.frontmatter) return undefined;
  const text = extraction.text;
  const yamlStart = fence[0].length;
  const original = parseDocument(text, { keepSourceTokens: true });
  const root = original.contents;
  if (!isMap(root)) return undefined;
  const pair = root.items.find((entry) => isScalar(entry.key) && entry.key.value === name);
  if (!pair) return undefined;
  const region = fieldRegion(text, pair);
  if (!region) return undefined;
  let start = region.start;
  let end = region.end;
  // Remove the field's own line break. A last line has none, so the preceding break goes instead.
  if (text.startsWith("\r\n", end)) {
    end += 2;
  } else if (text[end] === "\n") {
    end += 1;
  } else if (end === text.length && start > 0) {
    if (text[start - 1] !== "\n") return undefined;
    start -= text[start - 2] === "\r" ? 2 : 1;
  }
  const candidate = text.slice(0, start) + text.slice(end);
  const expected = Object.fromEntries(
    Object.entries(extraction.frontmatter).filter(([key]) => key !== name),
  );
  if (!verified(candidate, expected)) return undefined;
  return { start: yamlStart + start, end: yamlStart + end, text: "" };
}

/**
 * Inserts one new pair as text, without re-serializing the document. The pair goes after the
 * `afterField` line when that names a top-level field, and otherwise at the end of the YAML text.
 * `positioned` tells whether `afterField` was honoured. Returns undefined when nothing verifies.
 */
function minimalAddPatch(
  source: string,
  extraction: FrontmatterExtraction,
  name: string,
  value: unknown,
  afterField: string | undefined,
  beforeField?: string,
): FrontmatterFieldPatch | undefined {
  const fence = /^---\r?\n/u.exec(source);
  if (!fence) return undefined;
  const text = extraction.text;
  const yamlStart = fence[0].length;
  const lineEnding = fence[0].endsWith("\r\n") ? "\r\n" : "\n";
  const base = text === "" ? {} : extraction.frontmatter;
  if (!base) return undefined;
  const original = parseDocument(text, { keepSourceTokens: true });
  const root = original.contents;
  if (text === "" ? root !== null : !isMap(root)) return undefined;

  // `beforeField` names the field that follows the new one: after its predecessor in the source,
  // or at the very start when it is the first field.
  let leading = false;
  if (afterField === undefined && beforeField !== undefined && isMap(root)) {
    const index = root.items.findIndex((entry) =>
      isScalar(entry.key) && entry.key.value === beforeField);
    if (index === 0) {
      leading = true;
    } else if (index > 0) {
      const previousKey = root.items[index - 1]?.key;
      if (isScalar(previousKey) && typeof previousKey.value === "string") {
        afterField = previousKey.value;
      }
    }
  }
  const anchor = afterField !== undefined && isMap(root)
    ? root.items.find((entry) => isScalar(entry.key) && entry.key.value === afterField)
    : undefined;
  let offset = text.length;
  let positioned = false;
  if (text === "") {
    offset = 0;
  } else if (leading) {
    // After any leading comment lines (a header or a schema modeline), at the first key's line.
    const firstKey = isMap(root) ? nodeRange(root.items[0]?.key) : undefined;
    if (!firstKey) return undefined;
    offset = text.lastIndexOf("\n", firstKey[0] - 1) + 1;
    positioned = true;
  } else if (anchor) {
    const region = fieldRegion(text, anchor);
    if (!region) return undefined;
    offset = fieldEndWithTrailingComments(text, anchor, region.end);
    positioned = true;
  }

  const body = renderPair(original.createPair(name, value), yamlStyle(text, original), lineEnding, true);
  const insertion = text === "" ? body + lineEnding : leading ? body + lineEnding : lineEnding + body;
  const entries = Object.entries(base);
  const insertAt = leading
    ? 0
    : positioned
      ? entries.findIndex(([key]) => key === afterField) + 1
      : entries.length;
  entries.splice(insertAt, 0, [name, value]);
  const expected = structuredClone(Object.fromEntries(entries)) as Record<string, unknown>;

  const candidate = text.slice(0, offset) + insertion + text.slice(offset);
  if (!verified(candidate, expected)) return undefined;
  const patch: FrontmatterFieldPatch = {
    start: yamlStart + offset,
    end: yamlStart + offset,
    text: insertion,
  };
  if (afterField !== undefined || beforeField !== undefined) patch.positioned = positioned;
  return patch;
}

/**
 * True when `text` can be written as a plain YAML scalar and still read back as that same string.
 * Beyond what the yaml library decides, the words that YAML 1.1 readers take for booleans or null
 * (`yes`, `no`, `on`, `off`, `y`, `n`) are also reported unsafe.
 */
export function isPlainSafeScalar(text: string): boolean {
  if (text === "" || text !== text.trim() || /[\r\n]/u.test(text)) return false;
  if (/\t/u.test(text) || /^(?:=|<<)$/u.test(text)) return false;
  if (/^(?:y|n|yes|no|on|off|true|false|null|~)$/iu.test(text)) return false;
  // Both the YAML 1.2 and the YAML 1.1 readings (PyYAML reads the book's frontmatter) must keep a string.
  return stringify(text, { lineWidth: 0 }) === `${text}\n`
    && stringify(text, { version: "1.1", lineWidth: 0 }) === `${text}\n`;
}

/**
 * Where a new top-level key goes in the source so that it sits where the properties table shows
 * its row. The table lists the schema fields that are present in schema order, then the other keys
 * in source order (see `fieldsFromYaml`). The key goes right after the row that precedes it in
 * that order, or right before the row that follows it when it comes first. Returns an empty
 * object when there is no row to anchor on, or when there is no schema (the table then follows
 * the source order).
 */
export function frontmatterAddPlacement(
  sourceKeys: readonly string[],
  schemaOrder: readonly string[] | undefined,
  name: string,
): { afterField?: string; beforeField?: string } {
  if (!schemaOrder) return {};
  const schemaNames = new Set(schemaOrder);
  const present = new Set([...sourceKeys, name]);
  const rows = [
    ...schemaOrder.filter((key) => present.has(key)),
    ...sourceKeys.filter((key) => !schemaNames.has(key)),
    ...(schemaNames.has(name) ? [] : [name]),
  ];
  const index = rows.indexOf(name);
  if (index > 0) return { afterField: rows[index - 1] };
  const next = rows[index + 1];
  return next !== undefined ? { beforeField: next } : {};
}

export function createFrontmatterFieldPatch(
  source: string,
  name: string,
  value: unknown,
  options?: { afterField?: string; beforeField?: string; plainScalar?: boolean },
): FrontmatterFieldPatch | undefined {
  const extraction = extractFrontmatter(source);
  const match = /^(---\r?\n)([\s\S]*?)(?:\r?\n)?(---|\.\.\.)[ \t]*(?:\r?\n|$)/u.exec(source);
  // An empty frontmatter block parses to null, which extractFrontmatter reports as an error.
  const emptyFrontmatter = extraction.present && extraction.text === "";
  if (!name || !extraction.document || (extraction.error && !emptyFrontmatter) || !match) {
    return undefined;
  }
  try {
    const root = extraction.document.contents;
    const pair = isMap(root)
      ? root.items.find((entry) => isScalar(entry.key) && entry.key.value === name)
      : undefined;
    if (pair) {
      // The expected data is captured before the document is modified.
      let expected: Record<string, unknown> | undefined;
      try {
        expected = structuredClone({ ...extraction.frontmatter, [name]: value });
      } catch {
        expected = undefined;
      }
      if (isSeq(pair.value) && Array.isArray(value)) {
        updateYamlSequence(extraction.document, pair.value, value);
      } else {
        pair.value = preserveYamlNodeMetadata(
          pair.value as YamlNode,
          extraction.document.createNode(value) as YamlNode,
        );
      }
      if (expected) {
        try {
          const minimal = minimalPairPatch(source, extraction, pair, expected, options?.plainScalar === true);
          if (minimal) return minimal;
        } catch {
          // Fall through to the whole-document patch.
        }
      }
    } else {
      let minimal: FrontmatterFieldPatch | undefined;
      try {
        minimal = minimalAddPatch(
          source,
          extraction,
          name,
          value,
          options?.afterField,
          options?.beforeField,
        );
      } catch {
        minimal = undefined;
      }
      if (minimal) return minimal;
      extraction.document.set(name, value);
      const fallback = createFrontmatterDocumentPatch(source, extraction.document);
      // The fallback appends at the end, so `afterField` is not honoured.
      return fallback && (options?.afterField !== undefined || options?.beforeField !== undefined)
        ? { ...fallback, positioned: false }
        : fallback;
    }
    return createFrontmatterDocumentPatch(source, extraction.document);
  } catch {
    return undefined;
  }
}

export function createFrontmatterFieldRenamePatch(
  source: string,
  currentName: string,
  newName: string,
): FrontmatterFieldPatch | undefined {
  const extraction = extractFrontmatter(source);
  if (
    !currentName
    || !newName.trim()
    || newName !== newName.trim()
    || /[\r\n]/u.test(newName)
    || currentName === newName
    || !extraction.document
    || extraction.error
  ) {
    return undefined;
  }
  const root = extraction.document.contents;
  if (!isMap(root)) return undefined;
  const pair = root.items.find((entry) =>
    isScalar(entry.key) && entry.key.value === currentName);
  if (!pair || !isScalar(pair.key)) return undefined;
  const duplicate = root.items.some((entry) =>
    entry !== pair && isScalar(entry.key) && entry.key.value === newName);
  if (duplicate) return undefined;
  const minimal = minimalRenamePatch(source, extraction, currentName, newName);
  if (minimal) return minimal;
  pair.key.value = newName;
  return createFrontmatterDocumentPatch(source, extraction.document);
}

export function createFrontmatterFieldRemovePatch(
  source: string,
  name: string,
): FrontmatterFieldPatch | undefined {
  const extraction = extractFrontmatter(source);
  if (!name || !extraction.document || extraction.error) return undefined;
  const root = extraction.document.contents;
  if (!isMap(root)) return undefined;
  const index = root.items.findIndex((entry) =>
    isScalar(entry.key) && entry.key.value === name);
  if (index < 0) return undefined;
  const minimal = minimalRemovePatch(source, extraction, name);
  if (minimal) return minimal;
  root.items.splice(index, 1);
  return createFrontmatterDocumentPatch(source, extraction.document);
}

/**
 * Finds the schema directory for a file: walks ancestors and returns the
 * first directory named `_schema` or `_schemas` (with `_schema` preferred at
 * each level). Search stops at the filesystem root or at `stopDir` (exclusive).
 */
export function findSchemaDirectory(filePath: string, stopDir?: string): string | undefined {
  let dir = path.dirname(path.resolve(filePath));
  const stop = stopDir ? path.resolve(stopDir) : path.parse(dir).root;
  for (;;) {
    for (const name of SCHEMA_DIRECTORIES) {
      const candidate = path.join(dir, name);
      if (isDirectory(candidate)) {
        return candidate;
      }
    }
    if (dir === stop || path.dirname(dir) === dir) {
      return undefined;
    }
    dir = path.dirname(dir);
  }
}

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function listFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((name) => {
      try {
        return fs.statSync(path.join(dir, name)).isFile();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export interface SchemaCandidate {
  path: string;
  extension: string;
}

/** Case-folds only the part before `.schema` when matching a type value. */
export function matchSchemaFile(
  schemaDir: string,
  typeValue: string,
): SchemaCandidate | undefined {
  const wanted = typeValue.toLowerCase();
  // Prefer .yaml, then .yml, .json, .json5 — the dominant convention in bundles.
  const extensionPreference = [".yaml", ".yml", ".json", ".json5"] as const;
  let best: SchemaCandidate | undefined;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (const name of listFiles(schemaDir)) {
    for (const extension of SCHEMA_FILE_EXTENSIONS) {
      if (!name.toLowerCase().endsWith(`.schema${extension}`)) {
        continue;
      }
      const stem = name.slice(0, name.length - `.schema${extension}`.length).toLowerCase();
      if (stem !== wanted) {
        continue;
      }
      const priority = extensionPreference.indexOf(extension);
      if (priority < bestPriority) {
        best = { path: path.join(schemaDir, name), extension };
        bestPriority = priority;
      }
    }
  }
  return best;
}

let fileReader: ((schemaPath: string) => string) | undefined;

export function setSchemaFileReaderForTests(reader: ((schemaPath: string) => string) | undefined): void {
  fileReader = reader;
}

function readSchemaFile(schemaPath: string): string {
  if (fileReader) {
    return fileReader(schemaPath);
  }
  return fs.readFileSync(schemaPath, "utf8");
}

function stripJson5Comments(source: string): string {
  // Minimal JSON5 support: strip // and /* */ comments outside strings.
  let result = "";
  let inString = false;
  let stringChar = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inString) {
      result += char;
      if (char === "\\") {
        result += next ?? "";
        index += 1;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      inString = true;
      stringChar = char;
      result += char;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      result += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        index += 1;
      }
      index += 1;
      continue;
    }
    result += char;
  }
  return result;
}

function parseSchemaFile(candidate: SchemaCandidate): Record<string, unknown> {
  const raw = readSchemaFile(candidate.path);
  if (candidate.extension === ".json" || candidate.extension === ".json5") {
    const stripped = stripJson5Comments(raw);
    return JSON.parse(stripped) as Record<string, unknown>;
  }
  return parseDocument(raw).toJS() as Record<string, unknown>;
}

const REF_SUFFIX_FALLBACKS = ["", ".json", ".json5", ".yaml", ".yml"] as const;

function refTargetExists(schemaDir: string, ref: string): string | undefined {
  const base = ref.split("#", 1)[0];
  if (!base) {
    return undefined;
  }
  for (const suffix of REF_SUFFIX_FALLBACKS) {
    const candidate = path.resolve(schemaDir, `${base}${suffix}`);
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function fileExistsForTests(schemaDir: string, ref: string): string | undefined {
  return refTargetExists(schemaDir, ref);
}

/**
 * Recursively inlines relative `$ref`s inside the schema directory, the same
 * way `okf-schema` resolves `base.schema.yaml`-style references. Cycles are
 * broken by keeping the first (already-inlined) copy.
 */
export function resolveSchemaRefs(
  schema: unknown,
  schemaDir: string,
  seen: Set<string> = new Set(),
): Record<string, unknown> {
  const inlineRef = (ref: string): unknown => {
    const base = ref.split("#", 1)[0];
    const pointer = ref.slice(base.length) || "#";
    if (!base) {
      return { $ref: pointer };
    }
    const target = fileExistsForTests(schemaDir, base);
    if (!target || seen.has(target)) {
      return { $ref: pointer };
    }
    seen.add(target);
    const parsed = parseSchemaFile({ path: target, extension: path.extname(target) });
    let node: unknown = parsed;
    if (pointer.length > 1) {
      node = lookupJsonPointer(parsed, pointer.slice(1));
    }
    return resolveSchemaRefs(node, schemaDir, seen);
  };

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (!node || typeof node !== "object") {
      return node;
    }
    const record = node as Record<string, unknown>;
    // A node that is exactly a {$ref: "..."} reference is replaced wholesale
    // by the referenced schema fragment, not wrapped under a "$ref" key.
    const keys = Object.keys(record);
    if (keys.length === 1 && keys[0] === "$ref" && typeof record.$ref === "string") {
      return inlineRef(record.$ref);
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = walk(value);
    }
    return result;
  };
  return walk(schema) as Record<string, unknown>;
}

function lookupJsonPointer(root: unknown, pointer: string): unknown {
  const segments = pointer.split("/").map((segment) => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"));
  let node: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(node) && /^\d+$/u.test(segment)) {
      node = node[Number(segment)];
    } else if (node && typeof node === "object") {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return node;
}

interface EffectiveSchema {
  properties: Record<string, unknown>;
  order: string[];
  required: Set<string>;
  nullable: Set<string>;
}

/** Collapses allOf/anyOf/oneOf property branches into one effective schema. */
export function effectiveProperties(
  schema: Record<string, unknown>,
  frontmatter: Record<string, unknown> = {},
): EffectiveSchema {
  const properties: Record<string, unknown> = {};
  const order: string[] = [];
  const required = new Set<string>();
  const nullable = new Set<string>();
  const branches: unknown[] = [schema];
  let cursor = 0;
  while (cursor < branches.length) {
    const branch = branches[cursor];
    cursor += 1;
    if (!branch || typeof branch !== "object") {
      continue;
    }
    const record = branch as Record<string, unknown>;
    // Nested composition keywords are visited depth-first in declaration
    // order so property order matches the schema's reading order.
    for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
      const composed = record[keyword];
      if (Array.isArray(composed)) {
        branches.push(...composed);
      }
    }
    if ("if" in record) {
      let matches: boolean | undefined;
      try {
        matches = validateWithCachedValidator(record.if, frontmatter);
      } catch {
        matches = undefined;
      }
      if (matches !== undefined) {
        branches.push(matches ? record.then : record.else);
      }
    }
    if (record.properties && typeof record.properties === "object") {
      for (const [name, property] of Object.entries(record.properties as Record<string, unknown>)) {
        if (schemaAllowsNull(property)) {
          nullable.add(name);
        }
        if (!(name in properties)) {
          order.push(name);
        }
        const existing = properties[name];
        properties[name] = existing && typeof existing === "object"
          && property && typeof property === "object"
          ? { ...existing, ...property }
          : property;
      }
    }
    if (Array.isArray(record.required)) {
      for (const name of record.required) {
        if (typeof name === "string") {
          required.add(name);
        }
      }
    }
  }
  return { properties, order, required, nullable };
}

function enumsOf(property: unknown): string[] | null {
  if (!property || typeof property !== "object") {
    return null;
  }
  const record = property as Record<string, unknown>;
  const values: string[] = [];
  if (Array.isArray(record.enum)) {
    values.push(...record.enum.map((item) => String(item)));
  }
  if ("const" in record && record.const !== undefined && record.const !== null) {
    values.push(String(record.const));
  }
  return values.length > 0 ? values : null;
}

function schemaAllowsNull(property: unknown): boolean {
  if (!property || typeof property !== "object") {
    return false;
  }
  const record = property as Record<string, unknown>;
  if (record.nullable === true || record.type === "null") {
    return true;
  }
  if (Array.isArray(record.type) && record.type.includes("null")) {
    return true;
  }
  if (Array.isArray(record.enum) && record.enum.includes(null)) {
    return true;
  }
  return ["anyOf", "oneOf"].some((keyword) =>
    Array.isArray(record[keyword]) && record[keyword].some(schemaAllowsNull));
}

function defaultValueOf(
  property: unknown,
  fieldType: FieldType,
  enums: string[] | null,
): unknown {
  if (property && typeof property === "object") {
    const record = property as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, "default")) {
      return record.default;
    }
  }
  if (enums && enums.length > 0) return enums[0];
  switch (fieldType) {
    case "checkbox":
      return false;
    case "number":
      return 0;
    case "list":
      return [];
    case "text":
    case "date":
    case "time":
    case "datetime":
      return "";
    default:
      return null;
  }
}

function docOf(property: unknown): { title?: string; description?: string } | null {
  if (!property || typeof property !== "object") {
    return null;
  }
  const record = property as Record<string, unknown>;
  const doc: { title?: string; description?: string } = {};
  if (typeof record.title === "string") {
    doc.title = record.title;
  }
  if (typeof record.description === "string") {
    doc.description = record.description;
  }
  return doc.title || doc.description ? doc : null;
}

function valueKindOf(value: unknown): FieldEntry["valueKind"] {
  if (value === null || value === undefined) {
    return "null";
  }
  return Array.isArray(value) ? "list" : "scalar";
}

export interface FrontmatterOptions {
  filePath: string;
  sourceText: string;
  /** Stop walking ancestors at this directory (exclusive). */
  stopDir?: string;
  /** Skip project schema discovery when the source has no trusted root. */
  allowSchemaResolution?: boolean;
  /** Skip filesystem-backed link inspection for the first-paint table. */
  inspectLinks?: boolean;
  strictAdditionalProperties: boolean;
  schemaDirOverride?: string;
  bundleRoot?: string;
  projectRoot?: string;
  workspaceRoots?: readonly string[];
  allowOutsideWorkspaceLinks?: boolean;
}

/** Builds the webview payload for a document's frontmatter. */
export function analyzeFrontmatter(options: FrontmatterOptions): FrontmatterResult {
  const result = analyzeFrontmatterCore(options);
  // Without a matched schema every key is allowed.
  return { ...result, additionalPropertiesAllowed: result.additionalPropertiesAllowed ?? true };
}

function analyzeFrontmatterCore(options: FrontmatterOptions): FrontmatterResult {
  const extraction = extractFrontmatter(options.sourceText);
  if (!extraction.present) {
    return {
      present: false,
      fields: [],
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [],
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
  }
  if (extraction.error || !extraction.frontmatter) {
    return {
      present: true,
      fields: [],
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [{ severity: "error", message: `Invalid frontmatter YAML: ${extraction.error}` }],
      summary: { errors: 1, warnings: 0, infos: 0 },
    };
  }
  const frontmatter = extraction.frontmatter;
  const info: FieldIssue[] = [];
  const typeValue = typeof frontmatter.type === "string" ? frontmatter.type : undefined;
  if (!typeValue) {
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info,
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
  }
  const schemaDir = options.allowSchemaResolution === false
    ? undefined
    : options.schemaDirOverride ?? findSchemaDirectory(options.filePath, options.stopDir);
  if (!schemaDir) {
    const schemaSuppressed = options.allowSchemaResolution === false;
    const suppressionInfo = schemaSuppressed
      ? [{
        severity: "info" as const,
        message: "Schema validation requires a trusted workspace; showing generic frontmatter.",
      }]
      : info;
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: suppressionInfo,
      summary: { errors: 0, warnings: 0, infos: suppressionInfo.length },
    };
  }
  const candidate = matchSchemaFile(schemaDir, typeValue);
  if (!candidate) {
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [{ severity: "info", message: `No schema found for type "${typeValue}" in ${path.basename(schemaDir)}/.` }],
      summary: { errors: 0, warnings: 0, infos: 1 },
    };
  }
  let schema: Record<string, unknown>;
  try {
    schema = resolveSchemaRefs(parseSchemaFile(candidate), path.dirname(candidate.path));
  } catch (error) {
    return {
      present: true,
      fields: fieldsFromYaml(frontmatter, undefined, false),
      orderMode: "yaml",
      schemaFound: false,
      missingRequiredFields: [],
      info: [{ severity: "warning", message: `Schema could not be parsed: ${error instanceof Error ? error.message : String(error)}` }],
      summary: { errors: 0, warnings: 1, infos: 0 },
    };
  }

  const effective = effectiveProperties(schema, frontmatter);
  const missingRequiredFields = [...effective.required].filter((name) => !(name in frontmatter));
  const linkInspectionOptions: FileLinkInspectionOptions = {
    filePath: options.filePath,
    ...(options.bundleRoot ? { bundleRoot: options.bundleRoot } : {}),
    ...(options.projectRoot ? { projectRoot: options.projectRoot } : {}),
    ...(options.workspaceRoots ? { workspaceRoots: options.workspaceRoots } : {}),
    ...(options.allowOutsideWorkspaceLinks !== undefined
      ? { allowOutsideWorkspaceLinks: options.allowOutsideWorkspaceLinks }
      : {}),
    schemaDirectory: schemaDir,
  };
  const linkResults = inspectFrontmatterLinks(frontmatter, schema, {
    ...linkInspectionOptions,
    resolveTargets: options.inspectLinks !== false,
  });
  const fields = fieldsFromYaml(
    frontmatter,
    effective,
    options.strictAdditionalProperties,
    linkResults,
  );
  if (options.inspectLinks === true) {
    let suggestions: string[] | undefined;
    for (const field of fields) {
      if (!fieldUsesFilenameStemLinks(effective.properties[field.name])) continue;
      suggestions ??= filenameStemSuggestions(linkInspectionOptions);
      if (suggestions.length > 0) field.linkSuggestions = suggestions;
    }
  }
  const availableFields = effective.order
    .filter((name) => !fields.some((field) => field.name === name))
    .map((name): AvailableFieldEntry => {
      const property = effective.properties[name];
      const enums = enumsOf(property);
      const fieldType = fieldIconType(property, undefined, enums);
      return {
        name,
        fieldType,
        enums,
        defaultValue: defaultValueOf(property, fieldType, enums),
      };
    });

  // Map ajv instance paths to field names for per-row underlines.
  const fieldIssues = new Map<string, FieldIssue[]>();
  try {
    const validate = getCachedValidator(schema);
    if (!validate(frontmatter)) {
      for (const error of [...validate.errors ?? []]) {
        const ajvError = error as { instancePath: string; message?: string; keyword?: string; params?: { missingProperty?: string } };
        const name = ajvError.instancePath.replace(/^\//u, "").split("/", 1)[0];
        const message = ajvError.keyword === "required" && ajvError.params?.missingProperty
          ? `Required field "${ajvError.params.missingProperty}" is missing.`
          : ajvError.message ?? "The value does not satisfy the schema.";
        const target = name || ajvError.params?.missingProperty;
        if (target) {
          const issues = fieldIssues.get(target) ?? [];
          issues.push({ severity: "error", message, origin: "schema" });
          fieldIssues.set(target, issues);
        } else {
          info.push({ severity: "error", message, origin: "schema" });
        }
      }
    }
  } catch (error) {
    info.push({
      severity: "error",
      message: `Schema validation failed to run: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  for (const field of fields) {
    const issues = fieldIssues.get(field.name);
    if (issues) {
      field.issues.push(...issues);
    }
  }
  // Required-but-absent fields get their own (empty-value) rows so the
  // missing error is visible in the table instead of vanishing.
  for (const [name, issues] of fieldIssues) {
    if (fieldIssues.get(name) && !fields.some((field) => field.name === name)) {
      const property = effective.properties[name];
      fields.push({
        name,
        value: null,
        valueKind: "null",
        nullable: effective.nullable.has(name),
        fieldType: fieldIconType(property, null, property ? enumsOf(property) : null),
        doc: property ? docOf(property) : null,
        enums: property ? enumsOf(property) : null,
        issues: [...issues],
        known: name in effective.properties,
        ...(effective.required.has(name) ? { required: true } : {}),
      });
    }
  }

  const summary = { errors: 0, warnings: 0, infos: 0 };
  for (const field of fields) {
    for (const issue of field.issues) {
      summary[issue.severity === "error" ? "errors" : issue.severity === "warning" ? "warnings" : "infos"] += 1;
    }
  }
  for (const issue of info) {
    summary[issue.severity === "error" ? "errors" : issue.severity === "warning" ? "warnings" : "infos"] += 1;
  }
  return {
    present: true,
    fields,
    availableKeys: effective.order,
    availableFields,
    orderMode: "schema",
    schemaFound: true,
    missingRequiredFields,
    info,
    summary,
    linkResults,
    additionalPropertiesAllowed: schema.additionalProperties !== false,
  };
}

function isFilenameStemAnnotation(schema: unknown): boolean {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
  const annotation = (schema as Record<string, unknown>)["x-okf-link"];
  return !!annotation && typeof annotation === "object" && !Array.isArray(annotation)
    && (annotation as Record<string, unknown>).resolution === "filename-stem";
}

/** True when a field, or the items of a list field, resolves links by filename stem. */
function fieldUsesFilenameStemLinks(property: unknown): boolean {
  if (!property || typeof property !== "object" || Array.isArray(property)) return false;
  return isFilenameStemAnnotation(property)
    || isFilenameStemAnnotation((property as Record<string, unknown>).items);
}

function fieldsFromYaml(
  frontmatter: Record<string, unknown>,
  effective: EffectiveSchema | undefined,
  strict: boolean,
  linkResults: readonly FrontmatterLinkResult[] = [],
): FieldEntry[] {
  const entries: FieldEntry[] = [];
  const emit = (name: string, known: boolean) => {
    const property = effective?.properties[name];
    const issueList: FieldIssue[] = [];
    if (effective && !known && strict) {
      issueList.push({
        severity: "warning",
        message: `Unknown field; it is not declared in the "${String(frontmatter.type ?? "schema")}" schema.`,
      });
    }
    const fieldLinks = linkResults.filter((link) =>
      link.fieldPath === name
      || link.fieldPath.startsWith(`${name}[`)
      || link.fieldPath.startsWith(`${name}.`));
    issueList.push(...fieldLinks
      .filter((link) => link.severity !== undefined && link.code !== undefined)
      .map((link) => ({
        severity: link.severity === "error" ? "error" as const : "warning" as const,
        message: `[${link.code}] ${link.message}`,
          origin: "link" as const,
      })));
    entries.push({
      name,
      value: frontmatter[name],
      valueKind: valueKindOf(frontmatter[name]),
      nullable: effective?.nullable.has(name) ?? false,
      fieldType: fieldIconType(property, frontmatter[name], property ? enumsOf(property) : null),
      doc: property ? docOf(property) : null,
      enums: property ? enumsOf(property) : null,
      issues: issueList,
      known,
      ...(effective?.required.has(name) ? { required: true } : {}),
      linkResults: fieldLinks,
    });
  };
  if (effective) {
    for (const name of effective.order) {
      if (name in frontmatter) {
        emit(name, true);
      }
    }
    for (const name of Object.keys(frontmatter)) {
      if (!(name in effective.properties)) {
        emit(name, false);
      }
    }
  } else {
    for (const name of Object.keys(frontmatter)) {
      emit(name, false);
    }
  }
  return entries;
}
