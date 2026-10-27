/**
 * Syntax highlighting for fenced code blocks.
 *
 * Runs on the HTML the MyST writer produces rather than on the AST: the writer emits a
 * code block as `<pre><code class="language-x">escaped text</code></pre>` with no nested
 * markup, so the body can be safely swapped for highlighted spans.
 *
 * Backed by Shiki (MIT): the TextMate grammars of VS Code with its Dark+ colours, run by the
 * JavaScript regular-expression engine, so there is no WebAssembly and the strict CSP and
 * Restricted Mode keep working. Only a curated language set is bundled; any other language renders
 * as plain text. A token carries a colour class, never a `style` attribute (see `codeTheme.ts`).
 */

import { escapeHtml } from "../syntax/markdownSyntax";
import { createHighlighterCoreSync, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import c from "@shikijs/langs/c";
import cpp from "@shikijs/langs/cpp";
import csharp from "@shikijs/langs/csharp";
import css from "@shikijs/langs/css";
import diff from "@shikijs/langs/diff";
import dockerfile from "@shikijs/langs/dockerfile";
import go from "@shikijs/langs/go";
import html from "@shikijs/langs/html";
import ini from "@shikijs/langs/ini";
import java from "@shikijs/langs/java";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import jsonc from "@shikijs/langs/jsonc";
import jsx from "@shikijs/langs/jsx";
import kotlin from "@shikijs/langs/kotlin";
import latex from "@shikijs/langs/latex";
import lua from "@shikijs/langs/lua";
import makefile from "@shikijs/langs/makefile";
import markdown from "@shikijs/langs/markdown";
import powershell from "@shikijs/langs/powershell";
import python from "@shikijs/langs/python";
import ruby from "@shikijs/langs/ruby";
import rust from "@shikijs/langs/rust";
import scss from "@shikijs/langs/scss";
import shellscript from "@shikijs/langs/shellscript";
import shellsession from "@shikijs/langs/shellsession";
import sql from "@shikijs/langs/sql";
import toml from "@shikijs/langs/toml";
import tsx from "@shikijs/langs/tsx";
import typescript from "@shikijs/langs/typescript";
import xml from "@shikijs/langs/xml";
import yaml from "@shikijs/langs/yaml";
import darkPlus from "@shikijs/themes/dark-plus";
import lightPlus from "@shikijs/themes/light-plus";

import { BoundedCache } from "./boundedCache";
import {
  DARK_CODE_SURFACE,
  darkColorClass,
  darkTokenColor,
  LIGHT_CODE_SURFACE,
  lightColorClass,
  lightTokenColor,
  normalizeCodeColor,
} from "./codeTheme";

const LANGUAGES = [
  c, cpp, csharp, css, diff, dockerfile, go, html, ini, java, javascript, json, jsonc, jsx, kotlin,
  latex, lua, makefile, markdown, powershell, python, ruby, rust, scss, shellscript, shellsession,
  sql, toml, tsx, typescript, xml, yaml,
].flat();

const DARK_THEME = "dark-plus";
const LIGHT_THEME = "light-plus";

let highlighter: HighlighterCore | undefined;

/** The shared highlighter, created on first use (exported for the tests, which make it fail). */
export function getHighlighter(): HighlighterCore {
  highlighter ??= createHighlighterCoreSync({
    themes: [darkPlus, lightPlus],
    langs: LANGUAGES,
    // `forgiving`: a grammar pattern the JavaScript engine cannot express is skipped, not thrown.
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighter;
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


// Fence labels the grammars do not know by name; Shiki already knows `py`, `sh`, `yml`, `ts`, ...
const LANGUAGE_ALIASES: Record<string, string> = {
  console: "shellsession",
  ipython: "python",
  ipython3: "python",
  myst: "markdown",
  node: "javascript",
  patch: "diff",
  svg: "xml",
  tex: "latex",
};

/**
 * Names a fence info string can use for a language the preview highlights: the bundled grammars
 * and their aliases, sorted. The edition palette offers exactly these.
 */
export function highlightLanguageNames(): string[] {
  const names = getHighlighter().getLoadedLanguages().filter((name) => name !== "text" && name !== "plaintext");
  return [...new Set([...names, ...Object.keys(LANGUAGE_ALIASES)])].sort();
}

/**
 * Resolves a fence info string to a bundled grammar.
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
  return getHighlighter().getLoadedLanguages().includes(name) ? name : undefined;
}

const CODE_BLOCK = /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gu;

function attributeValue(attributes: string, name: string): string | undefined {
  return new RegExp(`${name}="([^"]*)"`, "u").exec(attributes)?.[1];
}

// Shiki font style bits (VS Code): italic, bold, underline, strikethrough.
const FONT_STYLE_CLASSES: ReadonlyArray<readonly [number, string]> = [
  [1, "shk-italic"],
  [2, "shk-bold"],
  [4, "shk-underline"],
  [8, "shk-strike"],
];

// Highlighting depends only on the language and the text, so a block that did not change between
// two renders is served from here. Bounded: 400 blocks and about 4 M characters.
const highlightCache = new BoundedCache<string[]>(
  400,
  4_000_000,
  (key, lines) => key.length + lines.reduce((sum, line) => sum + line.length, 0),
);

/** Empties the highlight cache (the tests count grammar runs). */
export function clearHighlightCache(): void {
  highlightCache.clear();
}

/**
 * The highlighted HTML of each line of `source`: one `<span class="sd-… sl-…">` per coloured token.
 * Throws when the grammar fails; the caller then falls back to plain text.
 */
function highlightLines(source: string, language: string): string[] {
  const key = `${language}\0${source}`;
  const cached = highlightCache.get(key);
  if (cached) return cached;
  const result = tokenizeLines(source, language);
  highlightCache.set(key, result);
  return result;
}

function tokenizeLines(source: string, language: string): string[] {
  const lines = getHighlighter().codeToTokensWithThemes(source, {
    lang: language,
    themes: { dark: DARK_THEME, light: LIGHT_THEME },
  });
  return lines.map((tokens) => tokens.map((token) => {
    const dark = token.variants[DARK_THEME] ?? token.variants.dark;
    const light = token.variants[LIGHT_THEME] ?? token.variants.light;
    const rawDark = normalizeCodeColor(dark?.color);
    const rawLight = normalizeCodeColor(light?.color);
    const darkColor = rawDark === undefined ? undefined : darkTokenColor(rawDark);
    const lightColor = rawLight === undefined ? undefined : lightTokenColor(rawLight);
    const classes: string[] = [];
    // The default text colour is the block's own colour: a token that has it needs no class.
    if (darkColor !== undefined && darkColor !== DARK_CODE_SURFACE.foreground) {
      classes.push(darkColorClass(darkColor));
    }
    const lightIsDefault = lightColor === LIGHT_CODE_SURFACE.foreground
      && (darkColor === undefined || darkColor === DARK_CODE_SURFACE.foreground);
    if (lightColor !== undefined && !lightIsDefault && lightColor !== darkColor) {
      classes.push(lightColorClass(lightColor));
    }
    const fontStyle = typeof dark?.fontStyle === "number" ? dark.fontStyle : 0;
    for (const [bit, name] of FONT_STYLE_CLASSES) {
      if ((fontStyle & bit) !== 0) classes.push(name);
    }
    const text = escapeHtml(token.content, false);
    return classes.length === 0 ? text : `<span class="${classes.join(" ")}">${text}</span>`;
  }).join(""));
}

type DiffLineKind = "addition" | "deletion" | undefined;

// @implements_req SwRS-MDOKFSTUDIO-CODE-008
function classifyDiffLines(lines: readonly string[]): DiffLineKind[] {
  return lines.map((line) => {
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
// @implements_req SwRS-MDOKFSTUDIO-CODE-039
/**
 * One block span per line. Each line keeps its own newline, so the text of the block is the source
 * text: a selection, a find and the copy button all read the original lines, empty ones included.
 */
function wrapCodeLines(
  lineHtml: readonly string[],
  firstLine: number,
  emphasizedLines: Set<number>,
  diffLineKinds: DiffLineKind[],
): string {
  return lineHtml.map((content, lineIndex) => {
    const lineNumber = firstLine + lineIndex;
    const diffKind = diffLineKinds[lineIndex];
    const classes = [
      "myst-code-line",
      ...(emphasizedLines.has(lineNumber) ? ["myst-code-line-emphasized"] : []),
      ...(diffKind ? [`myst-diff-line-${diffKind}`] : []),
    ];
    return `<span class="${classes.join(" ")}" data-line-number="${lineNumber}">${content}\n</span>`;
  }).join("");
}

// @implements_req SwRS-MDOKFSTUDIO-CODE-001
// @implements_req SwRS-MDOKFSTUDIO-CODE-014
// @implements_req SwRS-MDOKFSTUDIO-CODE-039
/**
 * Rewrites every fenced code block in `html` with highlighted markup.
 *
 * A block whose language is unknown keeps its plain text (a block of two lines or more still gets
 * its line wrapper, so it is numbered like the others); it is never mangled or turned into an error.
 */
export function highlightCodeBlocks(html: string): string {
  if (!html.includes("<code")) {
    return html;
  }
  return html.replace(CODE_BLOCK, (match, preAttributes: string, codeAttributes: string, body: string) => {
    const label = /class="[^"]*language-([^"\s]+)/u.exec(codeAttributes)?.[1];
    const language = label ? resolveLanguage(label) : undefined;
    const explicitLineNumbers = attributeValue(codeAttributes, "data-myst-line-numbers") === "true";
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
    const source = decodeEntities(body);
    const lines = source.replace(/\n$/u, "").split("\n");
    const multiline = lines.length >= 2;
    const shouldWrapLines = explicitLineNumbers || emphasizedLines.size > 0 || isDiffLanguage || multiline;
    if (!language && !shouldWrapLines && filename === undefined) {
      return match;
    }

    let lineHtml: string[] | undefined;
    if (language) {
      try {
        lineHtml = highlightLines(lines.join("\n"), language);
        if (lineHtml.length !== lines.length) {
          lineHtml = undefined;
        }
      } catch {
        lineHtml = undefined;
      }
      if (lineHtml === undefined && !shouldWrapLines) {
        return match;
      }
    }
    const plainLines = (): string[] => lines.map((line) => escapeHtml(line, false));

    let withShikiClass = codeAttributes;
    if (language && lineHtml !== undefined) {
      withShikiClass = codeAttributes.includes('class="')
        ? codeAttributes.replace(/class="/u, 'class="shiki ')
        : `${codeAttributes} class="shiki"`;
    }
    // A block of two lines or more is numbered by the `preview.codeBlocks.lineNumbers` setting
    // (the page decides); the MyST `:linenos:` option numbers it whatever the setting says.
    if (multiline && !explicitLineNumbers) {
      withShikiClass += ' data-myst-auto-numbers="true"';
    }
    if (String(firstLine + lines.length - 1).length >= 4) {
      withShikiClass += ' data-myst-line-digits="4"';
    }

    let highlighted: string;
    if (shouldWrapLines) {
      highlighted = wrapCodeLines(
        lineHtml ?? plainLines(),
        firstLine,
        emphasizedLines,
        isDiffLanguage ? classifyDiffLines(lines) : [],
      );
    } else if (lineHtml !== undefined) {
      highlighted = `${lineHtml.join("\n")}${/\n$/u.test(source) ? "\n" : ""}`;
    } else {
      highlighted = body;
    }
    const filenameLabel = filename === undefined
      ? ""
      : `<span class="myst-code-filename">${escapeHtml(decodeEntities(filename), false)}</span>`;
    const styledPreAttributes = isDiffLanguage
      ? preAttributes.includes('class="')
        ? preAttributes.replace(/class="/u, 'class="myst-code-block-diff ')
        : `${preAttributes} class="myst-code-block-diff"`
      : preAttributes;
    return `<pre${styledPreAttributes}>${filenameLabel}<code${withShikiClass}>${highlighted}</code></pre>`;
  });
}
