/**
 * Use case diagrams of the StRS (`just requirements-lint`, `npm run check:diagrams`).
 *
 * Usage: `node scripts/check-use-case-diagrams.mjs <bundle root>` (the project passes `requirements`).
 *
 * Parses the Mermaid fence of the `### Use case diagram` section of every StRS with the project's
 * Mermaid, so a diagram that cannot parse fails here rather than at the site build. The extraction is
 * the one of `parseUseCaseDiagram` in `test/site/requirementsViewer/useCaseDiagram.ts` (the text
 * before the generated links block; the section ends at the next heading of level 1 to 3 or HTML
 * comment outside a fence; the first ```` ```mermaid ```` fence; its trimmed body), so the lint checks
 * exactly what the site draws. A StRS with no section, no Mermaid fence or an empty fence has no
 * diagram: it is not counted and is not an error. The rules for writers are in
 * `requirements/guidelines/project.guidelines.md`, "Use case diagram of a StRS".
 *
 * The StRS are the `*.md` files with an `id` in their front matter under
 * `<bundle root>/tiers/<tiers.StRS.folder of config.yml>/`, walked recursively in sorted order.
 * Line endings are normalised to `\n` first.
 *
 * Mermaid runs in plain Node, with no browser: DOMPurify, which Mermaid imports, has no `window`
 * there and exposes no hooks, so no-op hooks are set on it before Mermaid is imported (the check
 * parses and never draws, so sanitising is not needed). A diagram that parses but cannot be drawn
 * still fails only the site build.
 *
 * Output, on stdout: for each diagram that does not parse
 * `<path>:<line>: <StRS id>: the use case diagram does not parse (see ...)` then Mermaid's message,
 * each line indented by 4 spaces. `<path>` is relative to the current directory with forward
 * slashes; `<line>` is the file line Mermaid names (`Parse error on line <n>`, mapped back through
 * the `%%` comment and `%%{...}%%` directive lines Mermaid removes before numbering), or the line of
 * the ```` ```mermaid ```` fence when Mermaid names none. Known limit: a front matter block inside the
 * fence is not mapped. When every diagram parses: one line
 * `use case diagrams: <n> StRS checked, all parse (Mermaid <version>)`.
 *
 * Exit: 0 when every diagram parses, 1 when one or more do not, 2 when the check cannot run (missing
 * bundle root or `config.yml`, Mermaid not installed), with one line on stderr.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

const GUIDELINE = 'see "Use case diagram of a StRS" in requirements/guidelines/project.guidelines.md';
const LINKS_START = "<!-- okf:links:start -->";
const SECTION = /^###\s+Use case diagram\s*$/mu;
const FENCE = /^```mermaid[^\n]*\n([\s\S]*?)\n```[^\S\n]*$/mu;
// What Mermaid 12 removes before its parser numbers lines (`preprocessDiagram`): directives, then comment
// lines. Copied verbatim from Mermaid's source, so without the `u` flag (the directive one is not valid with it).
const MERMAID_DIRECTIVE = /%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi;
const MERMAID_COMMENT = /^\s*%%(?!{)[^\n]+\n?/gm;

class CannotRun extends Error {}

/** The 1-based line of a character offset in a text. */
function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) if (text[i] === "\n") line += 1;
  return line;
}

/**
 * The use case diagram of a StRS text (line endings already `\n`), with the same rules as
 * `parseUseCaseDiagram`: `{ body, bodyLine, fenceLine }` (1-based file lines of the first body line
 * and of the ```` ```mermaid ```` line), or undefined when there is none.
 */
export function extractUseCaseDiagram(text) {
  const before = text.split(LINKS_START)[0] ?? "";
  const start = SECTION.exec(before);
  if (!start) return undefined;
  const sectionOffset = start.index + start[0].length;
  const lines = [];
  let fenced = false;
  for (const line of before.slice(sectionOffset).split("\n")) {
    if (/^```/u.test(line)) fenced = !fenced;
    else if (!fenced && /^(?:#{1,3}\s|<!--)/u.test(line)) break;
    lines.push(line);
  }
  const fence = FENCE.exec(lines.join("\n"));
  const raw = fence?.[1];
  const body = raw?.trim();
  if (!fence || !body) return undefined;
  const fenceOffset = sectionOffset + fence.index;
  const rawOffset = fenceOffset + fence[0].indexOf("\n") + 1;
  const bodyOffset = rawOffset + raw.search(/\S/u);
  return { body, bodyLine: lineAt(text, bodyOffset), fenceLine: lineAt(text, fenceOffset) };
}

/** Removes every match of `pattern` from `state.text`, keeping in `state.origin` the original offset of each kept character. */
function remove(state, pattern) {
  let text = "";
  const origin = [];
  let last = 0;
  for (const match of state.text.matchAll(pattern)) {
    text += state.text.slice(last, match.index);
    origin.push(...state.origin.slice(last, match.index));
    last = match.index + match[0].length;
  }
  text += state.text.slice(last);
  origin.push(...state.origin.slice(last));
  return { text, origin };
}

/**
 * The 1-based line of `body` that Mermaid calls line `mermaidLine`: Mermaid numbers the text left
 * after removing its directives and `%%` comment lines and trimming the start.
 */
export function bodyLineOf(body, mermaidLine) {
  let state = { text: body, origin: Array.from(body, (_, index) => index) };
  state = remove(state, MERMAID_DIRECTIVE);
  state = remove(state, MERMAID_COMMENT);
  state = remove(state, /^\s+/gu);
  let position = 0;
  for (let line = 1; line < mermaidLine; line += 1) {
    const next = state.text.indexOf("\n", position);
    if (next < 0) return mermaidLine;
    position = next + 1;
  }
  const offset = position < state.origin.length ? state.origin[position] : body.length;
  return lineAt(body, offset);
}

/** The file line to report for a Mermaid error on a diagram from `extractUseCaseDiagram`. */
export function reportedLine(diagram, message) {
  const match = /Parse error on line (\d+)/u.exec(message);
  if (!match) return diagram.fenceLine;
  return diagram.bodyLine + bodyLineOf(diagram.body, Number(match[1])) - 1;
}

/** The `id` of a requirement file's front matter, or undefined. */
function frontMatterId(text) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(text);
  if (!match) return undefined;
  try {
    const data = parseYaml(match[1]);
    return data && typeof data.id === "string" && data.id ? data.id : undefined;
  } catch {
    return undefined;
  }
}

/** Every `*.md` file under `dir`, recursively, in sorted order. */
function markdownFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...markdownFiles(full));
    else if (name.endsWith(".md")) files.push(full);
  }
  return files;
}

/** The StRS folder of a bundle, from its `config.yml`. */
function strsFolder(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new CannotRun(`no bundle root ${root}`);
  const configPath = path.join(root, "config.yml");
  let config;
  try {
    config = parseYaml(readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new CannotRun(`cannot read ${configPath}: ${error.message}`);
  }
  const folder = config?.tiers?.StRS?.folder;
  if (typeof folder !== "string" || !folder) throw new CannotRun(`${configPath} names no tiers.StRS.folder`);
  const dir = path.join(root, "tiers", folder);
  if (!existsSync(dir)) throw new CannotRun(`no StRS folder ${dir}`);
  return dir;
}

/** Imports Mermaid after making DOMPurify usable in plain Node; `{ mermaid, version }`. */
async function loadMermaid() {
  try {
    const { default: purify } = await import("dompurify");
    purify.addHook ??= () => {};
    purify.removeHook ??= () => {};
    purify.removeAllHooks ??= () => {};
    purify.sanitize ??= (text) => text;
    const { default: mermaid } = await import("mermaid");
    const { version } = createRequire(import.meta.url)("mermaid/package.json");
    return { mermaid, version };
  } catch (error) {
    throw new CannotRun(`Mermaid is not installed: ${error.message.split("\n")[0]} (run \`just dev\`)`);
  }
}

/**
 * Parses the use case diagram of every StRS of the bundle at `root`; `{ checked, failures, version }`,
 * where each failure is the report text of one diagram.
 */
// @implements_req SwRS-MDOKFSTUDIO-CORE-090
export async function checkUseCaseDiagrams(root) {
  const dir = strsFolder(root);
  const { mermaid, version } = await loadMermaid();
  let checked = 0;
  const failures = [];
  for (const file of markdownFiles(dir)) {
    const text = readFileSync(file, "utf8").replace(/\r\n?/gu, "\n");
    const id = frontMatterId(text);
    const diagram = id ? extractUseCaseDiagram(text) : undefined;
    if (!diagram) continue;
    checked += 1;
    try {
      await mermaid.parse(diagram.body);
    } catch (error) {
      const message = String(error?.message ?? error).replace(/\r\n?/gu, "\n");
      const where = path.relative(process.cwd(), file).split(path.sep).join("/");
      const indented = message.split("\n").map((line) => `    ${line}`);
      failures.push([`${where}:${reportedLine(diagram, message)}: ${id}: the use case diagram does not parse (${GUIDELINE})`, ...indented].join("\n"));
    }
  }
  return { checked, failures, version };
}

async function main() {
  const root = process.argv[2];
  if (!root) {
    process.stderr.write("check-use-case-diagrams: cannot run: usage: node scripts/check-use-case-diagrams.mjs <bundle root>\n");
    process.exit(2);
  }
  let result;
  try {
    result = await checkUseCaseDiagrams(root);
  } catch (error) {
    if (!(error instanceof CannotRun)) throw error;
    process.stderr.write(`check-use-case-diagrams: cannot run: ${error.message}\n`);
    process.exit(2);
  }
  if (result.failures.length > 0) {
    process.stdout.write(`${result.failures.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`use case diagrams: ${result.checked} StRS checked, all parse (Mermaid ${result.version})\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
