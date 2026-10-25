/**
 * Frontmatter parsing: the fence matcher, the YAML extraction of the frontmatter block, single
 * YAML values typed by the reader, and the JSON5 comment stripping of schema files. Pure: no file
 * access, no host API.
 */

import { parseDocument, type Document as YamlDocument } from "yaml";

/**
 * The frontmatter block of a document, parsed: its text, its data when it is a mapping, or the
 * error.
 */
export interface FrontmatterExtraction {
  present: boolean;
  /** Raw YAML text between the opening `---` and the closing `---` or `...`. */
  text: string;
  frontmatter: Record<string, unknown> | undefined;
  document: YamlDocument | undefined;
  error: string | undefined;
}

/** The frontmatter block at the start of a document, with the offsets needed to patch it. */
export interface FrontmatterBlock {
  /** Length of the opening fence line, including its line break. */
  openLength: number;
  /** The YAML text between the fences, without the break before the closing fence. */
  body: string;
  /** Length of the whole block, up to and including the closing fence line. */
  length: number;
  lineEnding: "\n" | "\r\n";
}

/**
 * The single frontmatter fence matcher. The closing `---` or `...` must stand on its own line, so
 * a value ending in `...` or `---` does not close the block. An empty block (`---\n---`) is valid.
 */
const FRONTMATTER_FENCE = /^(---[ \t]*\r?\n)(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/u;

// @implements_req SwRS-MDOKFSTUDIO-FMEDIT-043
// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
/** Finds the frontmatter block at the start of `source`; undefined when the document has none. */
export function matchFrontmatterBlock(source: string): FrontmatterBlock | undefined {
  const match = FRONTMATTER_FENCE.exec(source);
  if (!match) return undefined;
  return {
    openLength: match[1].length,
    body: match[2] ?? "",
    length: match[0].length,
    lineEnding: match[1].endsWith("\r\n") ? "\r\n" : "\n",
  };
}

/** Extracts the frontmatter block the way MyST does: leading `---` fence. */
export function extractFrontmatter(source: string): FrontmatterExtraction {
  const match = matchFrontmatterBlock(source);
  if (!match) {
    return { present: false, text: "", frontmatter: undefined, document: undefined, error: undefined };
  }
  const text = match.body;
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

/** A YAML value the reader typed: the parsed value, or why it does not parse. */
export type ParsedYamlValue =
  | { valid: true; value: unknown }
  | { valid: false; error: string };

/** Parses one YAML value typed in the frontmatter editor (empty text is not a value). */
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

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-023
/**
 * Strips line and block comments outside strings: the JSON5 a schema file may use, read as JSON.
 */
export function stripJson5Comments(source: string): string {
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
