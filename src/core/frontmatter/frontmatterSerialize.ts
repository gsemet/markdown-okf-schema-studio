/**
 * Frontmatter serialization: the text patches that set, add, rename or remove one top-level field.
 * A patch keeps the rest of the block byte for byte (comments, styles, key order) when it can and
 * verifies its result parses back to the expected data; otherwise it falls back to the whole block
 * re-serialized. Pure: no file access, no host API.
 */

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
import { extractFrontmatter, matchFrontmatterBlock, type FrontmatterExtraction } from "./frontmatterParse";
import { isSameData } from "./sameData";

/** A text replacement of the frontmatter: the range `start`-`end` of the source becomes `text`. */
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
  const match = matchFrontmatterBlock(source);
  if (!match) return undefined;
  const lineEnding = match.lineEnding;
  const text = document
    .toString({ lineWidth: 0 })
    .replace(/\r\n|\r|\n/gu, lineEnding)
    .replace(/(?:\r\n|\r|\n)$/u, "");
  const start = match.openLength;
  return { start, end: start + match.body.length, text };
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

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-004
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
  return isSameData(actual, expected)
    && isSameData(Object.keys(actual), Object.keys(expected));
}

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-043
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
  const fence = matchFrontmatterBlock(source);
  if (!fence) return undefined;
  const text = extraction.text;
  const yamlStart = fence.openLength;
  const lineEnding = fence.lineEnding;

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

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-024
/** Replaces only the key text of one field. Returns undefined when that does not verify. */
function minimalRenamePatch(
  source: string,
  extraction: FrontmatterExtraction,
  currentName: string,
  newName: string,
): FrontmatterFieldPatch | undefined {
  const fence = matchFrontmatterBlock(source);
  if (!fence || !extraction.frontmatter) return undefined;
  const text = extraction.text;
  const yamlStart = fence.openLength;
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

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-029
/** Deletes the whole lines of one field. Returns undefined when the minimal patch does not verify. */
function minimalRemovePatch(
  source: string,
  extraction: FrontmatterExtraction,
  name: string,
): FrontmatterFieldPatch | undefined {
  const fence = matchFrontmatterBlock(source);
  if (!fence || !extraction.frontmatter) return undefined;
  const text = extraction.text;
  const yamlStart = fence.openLength;
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
  const fence = matchFrontmatterBlock(source);
  if (!fence) return undefined;
  const text = extraction.text;
  const yamlStart = fence.openLength;
  const lineEnding = fence.lineEnding;
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

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-037
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

/**
 * Refuses a patch whose patched document does not parse to exactly the expected key set: a key of
 * the original block is missing, duplicated, or the block no longer parses.
 */
export function guardedPatch(
  source: string,
  patch: FrontmatterFieldPatch | undefined,
  expectedKeys: readonly string[],
): FrontmatterFieldPatch | undefined {
  if (!patch) return undefined;
  const patched = source.slice(0, patch.start) + patch.text + source.slice(patch.end);
  const after = extractFrontmatter(patched);
  const empty = after.present && after.text.trim() === "" && expectedKeys.length === 0;
  if (empty) return patch;
  if (after.error || !after.frontmatter) return undefined;
  const keys = Object.keys(after.frontmatter);
  const same = keys.length === expectedKeys.length
    && expectedKeys.every((key) => keys.includes(key));
  return same ? patch : undefined;
}

function originalKeys(source: string): string[] {
  return Object.keys(extractFrontmatter(source).frontmatter ?? {});
}

/** The patch that sets field `name` to `value`, adding it when it is missing; undefined when it cannot. */
export function createFrontmatterFieldPatch(
  source: string,
  name: string,
  value: unknown,
  options?: { afterField?: string; beforeField?: string; plainScalar?: boolean },
): FrontmatterFieldPatch | undefined {
  const keys = originalKeys(source);
  return guardedPatch(
    source,
    buildFrontmatterFieldPatch(source, name, value, options),
    keys.includes(name) ? keys : [...keys, name],
  );
}

function buildFrontmatterFieldPatch(
  source: string,
  name: string,
  value: unknown,
  options?: { afterField?: string; beforeField?: string; plainScalar?: boolean },
): FrontmatterFieldPatch | undefined {
  const extraction = extractFrontmatter(source);
  const match = matchFrontmatterBlock(source);
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

/** The patch that renames a top-level field, keeping its value and place; undefined when it cannot. */
export function createFrontmatterFieldRenamePatch(
  source: string,
  currentName: string,
  newName: string,
): FrontmatterFieldPatch | undefined {
  return guardedPatch(
    source,
    buildFrontmatterFieldRenamePatch(source, currentName, newName),
    originalKeys(source).map((key) => (key === currentName ? newName : key)),
  );
}

function buildFrontmatterFieldRenamePatch(
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

/** The patch that removes a top-level field; undefined when the field is missing or it cannot. */
export function createFrontmatterFieldRemovePatch(
  source: string,
  name: string,
): FrontmatterFieldPatch | undefined {
  return guardedPatch(
    source,
    buildFrontmatterFieldRemovePatch(source, name),
    originalKeys(source).filter((key) => key !== name),
  );
}

function buildFrontmatterFieldRemovePatch(
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
