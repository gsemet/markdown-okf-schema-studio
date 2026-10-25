/**
 * Syntax highlighting for fenced code blocks.
 *
 * Runs on the HTML the MyST writer produces rather than on the AST: the writer emits a
 * code block as `<pre><code class="language-x">escaped text</code></pre>` with no nested
 * markup, so the body can be safely swapped for highlighted spans.
 *
 * Backed by highlight.js (BSD-3-Clause). Only a curated language set is registered, so
 * the bundle does not carry the ~190 grammars the default build ships.
 */

import hljs from "highlight.js/lib/core";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import latex from "highlight.js/lib/languages/latex";
import lua from "highlight.js/lib/languages/lua";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGUAGES: Record<string, LanguageFn> = {
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  dockerfile,
  go,
  ini,
  java,
  javascript,
  json,
  kotlin,
  latex,
  lua,
  makefile,
  markdown,
  python,
  ruby,
  rust,
  scss,
  shell,
  sql,
  typescript,
  xml,
  yaml,
};

type LanguageFn = Parameters<typeof hljs.registerLanguage>[1];

let registered = false;

function ensureRegistered(): void {
  if (registered) {
    return;
  }
  for (const [name, definition] of Object.entries(LANGUAGES)) {
    hljs.registerLanguage(name, definition);
  }
  hljs.configure({ classPrefix: "hljs-" });
  registered = true;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

// The MyST writer escapes with numeric references (`&#x3C;`) as well as named ones, and
// anything left encoded here would be escaped a second time by the highlighter.
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    return ENTITIES[body.toLowerCase()] ?? entity;
  });
}

const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  cs: "csharp",
  console: "shell",
  dockerfile: "dockerfile",
  docker: "dockerfile",
  html: "xml",
  js: "javascript",
  jsonc: "json",
  md: "markdown",
  myst: "markdown",
  node: "javascript",
  py: "python",
  rs: "rust",
  sh: "bash",
  "shell-session": "shell",
  tex: "latex",
  toml: "ini",
  patch: "diff",
  ts: "typescript",
  tsx: "typescript",
  jsx: "javascript",
  ipython: "python",
  ipython3: "python",
  svg: "xml",
  zsh: "bash",
};

/**
 * Names a fence info string can use for a language the preview highlights: the registered
 * grammars and their aliases, sorted. The edition palette offers exactly these.
 */
export function highlightLanguageNames(): string[] {
  return [...new Set([...Object.keys(LANGUAGES), ...Object.keys(LANGUAGE_ALIASES)])].sort();
}

/**
 * Resolves a fence info string to a registered grammar.
 *
 * Fence labels drift from grammar names in real documents (`py`, `sh`, `console`,
 * `shell-session`), and a directive option string may trail the language.
 */
function resolveLanguage(raw: string): string | undefined {
  const token = raw.trim().toLowerCase().split(/[\s,{]/u)[0];
  if (!token) {
    return undefined;
  }
  const name = LANGUAGE_ALIASES[token] ?? token;
  return hljs.getLanguage(name) ? name : undefined;
}

const CODE_BLOCK = /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gu;

function attributeValue(attributes: string, name: string): string | undefined {
  return new RegExp(`${name}="([^"]*)"`, "u").exec(attributes)?.[1];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

type DiffLineKind = "addition" | "deletion" | undefined;

// @implements_req SwRS-MDOKFSTUDIO-CODE-008
function classifyDiffLines(source: string): DiffLineKind[] {
  return source.replace(/\n$/u, "").split("\n").map((line) => {
    if (line.startsWith("+")) {
      return "addition";
    }
    if (line.startsWith("-")) {
      return "deletion";
    }
    return undefined;
  });
}

// @implements_req SwRS-MDOKFSTUDIO-CODE-005
function wrapCodeLines(
  highlighted: string,
  numbered: boolean,
  firstLine: number,
  emphasizedLines: Set<number>,
  diffLineKinds: DiffLineKind[],
): string {
  const source = highlighted.replace(/\n$/u, "");
  const activeSpans: string[] = [];
  let lineIndex = 0;
  let cursor = 0;
  const openLine = (): string => {
    const lineNumber = firstLine + lineIndex;
    const emphasized = emphasizedLines.has(lineNumber);
    const diffKind = diffLineKinds[lineIndex];
    const classes = [
      "myst-code-line",
      ...(emphasized ? ["myst-code-line-emphasized"] : []),
      ...(diffKind ? [`myst-diff-line-${diffKind}`] : []),
    ];
    return `<span class="${classes.join(" ")}"`
      + `${numbered ? ` data-line-number="${lineNumber}"` : ""}>`;
  };
  let output = openLine();

  for (const match of source.matchAll(/<span\b[^>]*>|<\/span>|\n/gu)) {
    const index = match.index ?? 0;
    const token = match[0];
    output += source.slice(cursor, index);
    if (token === "\n") {
      output += "</span>".repeat(activeSpans.length + 1);
      lineIndex += 1;
      output += openLine() + activeSpans.join("");
    } else if (token === "</span>") {
      output += token;
      activeSpans.pop();
    } else {
      output += token;
      activeSpans.push(token);
    }
    cursor = index + token.length;
  }

  output += source.slice(cursor);
  output += "</span>".repeat(activeSpans.length + 1);
  return output;
}

// @implements_req SwRS-MDOKFSTUDIO-CODE-001
// @implements_req SwRS-MDOKFSTUDIO-CODE-014
/**
 * Rewrites every fenced code block in `html` with highlighted markup.
 *
 * A block whose language is unknown is left untouched, so an unsupported grammar degrades
 * to plain monospace text instead of being mangled.
 */
export function highlightCodeBlocks(html: string): string {
  if (!html.includes("<code")) {
    return html;
  }
  ensureRegistered();
  return html.replace(CODE_BLOCK, (match, preAttributes: string, codeAttributes: string, body: string) => {
    const label = /class="[^"]*language-([^"\s]+)/u.exec(codeAttributes)?.[1];
    const language = label ? resolveLanguage(label) : undefined;
    const lineNumbers = attributeValue(codeAttributes, "data-myst-line-numbers") === "true";
    const startValue = attributeValue(codeAttributes, "data-myst-line-start");
    const parsedStart = startValue === undefined ? 1 : Number(startValue);
    const firstLine = Number.isSafeInteger(parsedStart) && parsedStart > 0 ? parsedStart : 1;
    const emphasizedLines = new Set(
      (attributeValue(codeAttributes, "data-myst-emphasize-lines") ?? "")
        .split(",")
        .map(Number)
        .filter((line) => Number.isSafeInteger(line) && line > 0),
    );
    const filename = attributeValue(codeAttributes, "data-myst-filename");
    const isDiffLanguage = language === "diff";
    const diffLineKinds = isDiffLanguage ? classifyDiffLines(decodeEntities(body)) : [];
    const shouldWrapLines = lineNumbers || emphasizedLines.size > 0 || isDiffLanguage;
    if (!language && !shouldWrapLines && filename === undefined) {
      return match;
    }

    let highlighted = body;
    if (language) {
      try {
        highlighted = hljs.highlight(decodeEntities(body), { language, ignoreIllegals: true }).value;
      } catch {
        if (!shouldWrapLines) {
          return match;
        }
        highlighted = escapeHtml(decodeEntities(body));
      }
    }

    let withHljsClass = codeAttributes;
    if (language) {
      withHljsClass = codeAttributes.includes('class="')
        ? codeAttributes.replace(/class="/u, 'class="hljs ')
        : `${codeAttributes} class="hljs"`;
    }
    if (shouldWrapLines) {
      highlighted = wrapCodeLines(
        highlighted,
        lineNumbers,
        firstLine,
        emphasizedLines,
        diffLineKinds,
      );
    }
    const filenameLabel = filename === undefined
      ? ""
      : `<span class="myst-code-filename">${escapeHtml(decodeEntities(filename))}</span>`;
    const styledPreAttributes = isDiffLanguage
      ? preAttributes.includes('class="')
        ? preAttributes.replace(/class="/u, 'class="myst-code-block-diff ')
        : `${preAttributes} class="myst-code-block-diff"`
      : preAttributes;
    return `<pre${styledPreAttributes}>${filenameLabel}<code${withHljsClass}>${highlighted}</code></pre>`;
  });
}
