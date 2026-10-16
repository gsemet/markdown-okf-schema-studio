/**
 * Static reader for the two lists of a Sphinx `conf.py` that decide which MyST syntax is on:
 * `extensions` and `myst_enable_extensions`.
 *
 * The file is never executed. Only plain string lists are understood (`=`, `+=`, `.append(...)`,
 * `.extend(...)`, joined with `+`); anything else that touches one of the two names makes the
 * result uncertain, and callers then show no warning.
 */

export interface ParsedConf {
  extensions: string[];
  mystExtensions: string[];
  /** False when a statement about either list could not be read as plain string literals. */
  certain: boolean;
}

type Token =
  | { kind: "string"; value: string; ok: boolean }
  | { kind: "name" | "op" | "other"; text: string };

interface Line {
  indent: number;
  tokens: Token[];
}

const NAME_START = /[A-Za-z_]/u;
const NAME_PART = /[A-Za-z0-9_]/u;
const TARGETS = new Set(["extensions", "myst_enable_extensions"]);

function decodeEscapes(raw: string): string {
  return raw.replace(/\\(.)/gsu, (_match, character: string) => {
    if (character === "n") return "\n";
    if (character === "t") return "\t";
    return character;
  });
}

/** Splits the file into logical lines of tokens; comments are dropped, brackets join lines. */
function tokenize(source: string): Line[] {
  const lines: Line[] = [];
  let tokens: Token[] = [];
  let indent = 0;
  let depth = 0;
  let atLineStart = true;
  let index = 0;

  const endLine = (): void => {
    if (tokens.length > 0) {
      lines.push({ indent, tokens });
    }
    tokens = [];
    atLineStart = true;
  };

  while (index < source.length) {
    const character = source[index];
    if (character === "\n" || character === "\r") {
      index += 1;
      if (depth === 0) {
        endLine();
        indent = 0;
      }
      continue;
    }
    if (atLineStart && (character === " " || character === "\t")) {
      indent += 1;
      index += 1;
      continue;
    }
    if (character === " " || character === "\t") {
      index += 1;
      continue;
    }
    if (character === "\\" && (source[index + 1] === "\n" || source[index + 1] === "\r")) {
      index += source[index + 1] === "\r" && source[index + 2] === "\n" ? 3 : 2;
      continue;
    }
    atLineStart = false;
    if (character === "#") {
      while (index < source.length && source[index] !== "\n" && source[index] !== "\r") index += 1;
      continue;
    }
    const prefix = /^([A-Za-z]{0,2})(?=["'])/u.exec(source.slice(index, index + 3))?.[1];
    if (character === "\"" || character === "'" || prefix !== undefined && prefix !== "") {
      const prefixLength = prefix?.length ?? 0;
      const lowered = (prefix ?? "").toLowerCase();
      const quote = source[index + prefixLength];
      const triple = source.startsWith(quote.repeat(3), index + prefixLength);
      const delimiter = triple ? quote.repeat(3) : quote;
      let cursor = index + prefixLength + delimiter.length;
      let raw = "";
      let closed = false;
      while (cursor < source.length) {
        if (source[cursor] === "\\" && !lowered.includes("r")) {
          raw += source.slice(cursor, cursor + 2);
          cursor += 2;
          continue;
        }
        if (source.startsWith(delimiter, cursor)) {
          closed = true;
          cursor += delimiter.length;
          break;
        }
        if (!triple && (source[cursor] === "\n" || source[cursor] === "\r")) {
          break;
        }
        raw += source[cursor];
        cursor += 1;
      }
      const plain = lowered === "" || lowered === "r" || lowered === "u" || lowered === "ur";
      tokens.push({
        kind: "string",
        value: lowered.includes("r") ? raw : decodeEscapes(raw),
        ok: closed && plain,
      });
      index = cursor;
      continue;
    }
    if (NAME_START.test(character)) {
      let end = index + 1;
      while (end < source.length && NAME_PART.test(source[end])) end += 1;
      tokens.push({ kind: "name", text: source.slice(index, end) });
      index = end;
      continue;
    }
    if (/[0-9]/u.test(character)) {
      let end = index + 1;
      while (end < source.length && /[0-9A-Za-z_.]/u.test(source[end])) end += 1;
      tokens.push({ kind: "other", text: source.slice(index, end) });
      index = end;
      continue;
    }
    const operator = /^(\+=|-=|\*=|\|=|==|!=|<=|>=|\*\*|\/\/|:=|->|[()[\]{},.:=+\-*/|&%<>@!;~^])/u
      .exec(source.slice(index, index + 2));
    const text = operator?.[1] ?? character;
    if (text === "(" || text === "[" || text === "{") depth += 1;
    if (text === ")" || text === "]" || text === "}") depth = Math.max(0, depth - 1);
    tokens.push({ kind: "op", text });
    index += text.length;
  }
  endLine();
  return lines;
}

function isOp(token: Token | undefined, text: string): boolean {
  return token !== undefined && token.kind === "op" && token.text === text;
}

/** Reads `["a", "b" "c",]` / `("a",)` starting at `index`; returns the values and the next index. */
function readList(tokens: Token[], index: number): { values: string[]; next: number } | undefined {
  const open = tokens[index];
  const close = isOp(open, "[") ? "]" : isOp(open, "(") ? ")" : undefined;
  if (close === undefined) return undefined;
  const values: string[] = [];
  let cursor = index + 1;
  let expectValue = true;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (isOp(token, close)) {
      return { values, next: cursor + 1 };
    }
    if (token.kind === "string" && token.ok) {
      if (!expectValue && values.length === 0) return undefined;
      const last = tokens[cursor - 1];
      if (!expectValue && last.kind === "string") {
        values[values.length - 1] += token.value;
      } else if (expectValue) {
        values.push(token.value);
      } else {
        return undefined;
      }
      expectValue = false;
      cursor += 1;
      continue;
    }
    if (isOp(token, ",") && !(expectValue && values.length === 0)) {
      expectValue = true;
      cursor += 1;
      continue;
    }
    return undefined;
  }
  return undefined;
}

/** Reads `[..] + [..]` to the end of the statement. */
function readExpression(tokens: Token[], index: number): string[] | undefined {
  const all: string[] = [];
  let cursor = index;
  for (;;) {
    const list = readList(tokens, cursor);
    if (!list) return undefined;
    all.push(...list.values);
    cursor = list.next;
    if (cursor === tokens.length) return all;
    if (!isOp(tokens[cursor], "+")) return undefined;
    cursor += 1;
  }
}

export function parseConf(source: string): ParsedConf {
  const lists: Record<string, string[]> = { extensions: [], myst_enable_extensions: [] };
  let certain = true;

  for (const line of tokenize(source)) {
    const { tokens } = line;
    const first = tokens[0];
    if (first.kind === "name" && first.text === "from"
      && tokens.some((token) => isOp(token, "*"))
      && tokens.some((token) => token.kind === "name" && token.text === "import")) {
      certain = false;
      continue;
    }
    if (first.kind !== "name" || !TARGETS.has(first.text)) {
      continue;
    }
    const target = lists[first.text];
    const second = tokens[1];
    if (line.indent === 0) {
      if (isOp(second, "=")) {
        const values = readExpression(tokens, 2);
        if (values) {
          lists[first.text] = values;
        } else {
          certain = false;
        }
        continue;
      }
      if (isOp(second, "+=")) {
        const values = readExpression(tokens, 2);
        if (values) {
          target.push(...values);
        } else {
          certain = false;
        }
        continue;
      }
      const method = tokens[2];
      if (isOp(second, ".") && method?.kind === "name"
        && (method.text === "append" || method.text === "extend") && isOp(tokens[3], "(")) {
        const argument = tokens[4];
        const last = tokens[tokens.length - 1];
        if (method.text === "append" && argument?.kind === "string" && argument.ok
          && isOp(tokens[5], ")") && tokens.length === 6) {
          target.push(argument.value);
          continue;
        }
        if (method.text === "extend" && isOp(last, ")")) {
          const list = readList(tokens.slice(0, -1), 4);
          if (list && list.next === tokens.length - 1) {
            target.push(...list.values);
            continue;
          }
        }
      }
    }
    // Indented (conditional) or unreadable statements that change one of the lists.
    const changes = isOp(second, "=") || isOp(second, "+=") || isOp(second, "-=")
      || isOp(second, "|=") || isOp(second, ".") || isOp(second, "[");
    if (changes) {
      certain = false;
    }
  }

  return {
    extensions: lists.extensions,
    mystExtensions: lists.myst_enable_extensions,
    certain,
  };
}
