import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";

/** The writing skill is installed on machines without this repository: it is checked as a folder. */
const skillDirectory = path.resolve(__dirname, "../../../../skills/writing-for-markdown-okf-schema-studio");
const skillFile = path.join(skillDirectory, "SKILL.md");
const referencesDirectory = path.join(skillDirectory, "references");

const MAX_SKILL_LINES = 160;

function skillSources(): string[] {
  const files = [skillFile];
  if (fs.existsSync(referencesDirectory)) {
    for (const name of fs.readdirSync(referencesDirectory).sort()) {
      if (name.endsWith(".md")) {
        files.push(path.join(referencesDirectory, name));
      }
    }
  }
  return files;
}

/** The `markdown` blocks fenced with four or more backticks: each one is a complete example document. */
function examplesOf(file: string): string[] {
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/^(`{4,})markdown\n([\s\S]*?)\n\1$/gmu)].map((match) => match[2]!);
}

/** Relative files an example names (figure, uml, image): created as stubs so only the syntax is judged. */
function referencedFiles(example: string): string[] {
  const names = [
    ...[...example.matchAll(/^`{3,}\{(?:figure|uml|plantuml|image)\}\s+(\S+)/gmu)].map((match) => match[1]!),
    ...[...example.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/gu)].map((match) => match[1]!),
  ];
  return names.filter((name) => !/^[a-z][a-z0-9+.-]*:/iu.test(name) && !path.isAbsolute(name));
}

function stubContent(name: string): string {
  if (name.endsWith(".svg")) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
  }
  return name.endsWith(".puml") ? "@startuml\nA -> B\n@enduml\n" : "stub";
}

async function renderExample(example: string) {
  const workspaceRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "writing-skill-")));
  for (const name of referencedFiles(example)) {
    fs.mkdirSync(path.dirname(path.join(workspaceRoot, name)), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, name), stubContent(name));
  }
  const text = example.endsWith("\n") ? example : `${example}\n`;
  const result = await renderPreviewDocument({
    document: {
      uri: { scheme: "file", fsPath: path.join(workspaceRoot, "plan.md") },
      languageId: "markdown",
      version: 1,
      getText: () => text,
    },
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
  return result;
}

/** Every syntax family the skill lists: where the examples write it and what the preview must produce. */
const FAMILIES: Array<{ name: string; source: RegExp; html: RegExp }> = [
  { name: "card", source: /^:::\{card\}/mu, html: /class="myst-card/u },
  { name: "grid of cards", source: /^::::\{grid\}/mu, html: /class="myst-grid-card-title"/u },
  { name: "tabs", source: /^::::\{tab-set\}/mu, html: /class="myst-tab-set/u },
  { name: "version note", source: /^:::\{versionadded\}/mu, html: /Added in version 0\.47/u },
  { name: "GitHub alert", source: /^> \[!WARNING\]/mu, html: /<aside class="admonition warning/u },
  { name: "admonition", source: /^:::\{tip\}/mu, html: /<aside class="admonition tip/u },
  { name: "folding admonition", source: /^:class: dropdown/mu, html: /<details class="admonition[^"]*dropdown/u },
  { name: "table of contents", source: /^\[TOC\]$/mu, html: /class="okf-toc/u },
  { name: "math", source: /^\$\$$/mu, html: /class="math-display"/u },
  { name: "list table", source: /^`{3,}\{list-table\}/mu, html: /<table/u },
  { name: "label and reference", source: /\{ref\}`/u, html: /<a href="#cost">/u },
  { name: "task list", source: /^- \[x\]/mu, html: /class="myst-checkbox/u },
  { name: "figure", source: /^`{3,}\{figure\}/mu, html: /<figure[^>]*><img src="diagrams\/layers\.svg"/u },
  { name: "Mermaid", source: /^```mermaid$/mu, html: /class="myst-mermaid-figure/u },
  { name: "PlantUML", source: /^```plantuml$/mu, html: /class="myst-plantuml-figure/u },
  { name: "Vega-Lite", source: /^```vega-lite$/mu, html: /class="myst-vega-figure/u },
  { name: "README HTML", source: /^<div align="center">/mu, html: /<div align="center"/u },
  { name: "TODO comment", source: /^<!-- TODO:/mu, html: /data-okf-comment-kind="todo"/u },
  { name: "comment thread", source: /^<!-- THREAD$/mu, html: /data-okf-comment-kind="thread"/u },
  { name: "front matter", source: /^---\ntitle: /u, html: /<h1[^>]*>Export plan<\/h1>/u },
];

// @tests_req SwRS-MDOKFSTUDIO-CORE-073
test("the writing skill is a self-contained folder of the expected shape", () => {
  assert.ok(fs.existsSync(skillFile), `the skill file ${skillFile} does not exist`);
  const text = fs.readFileSync(skillFile, "utf8");
  const header = /^---\n([\s\S]*?)\n---\n/u.exec(text);
  assert.ok(header, "SKILL.md starts with a front matter block");
  const name = /^name:\s*(\S+)\s*$/mu.exec(header[1]!)?.[1];
  assert.equal(name, path.basename(skillDirectory), "the front matter name is the folder name");
  const description = header[1]!.replace(/^[\s\S]*?^description:\s*/mu, "").replace(/\n {2}/gu, " ").trim();
  assert.ok(description.length > 0 && description.length <= 1024, `description length ${description.length}`);
  assert.match(description, /\bwrite\b/iu);
  assert.match(description, /Studio/u);
  assert.ok(text.split("\n").length <= MAX_SKILL_LINES, `SKILL.md has more than ${MAX_SKILL_LINES} lines: move detail to references/`);
  for (const file of skillSources()) {
    const content = fs.readFileSync(file, "utf8");
    // Links of the prose only (no code spans, no examples): the examples are documents of their own and name files that do not exist here.
    const prose = content.replace(/^(`{3,}).*\n[\s\S]*?^\1$/gmu, "").replace(/`[^`\n]*`/gu, "");
    const links = [...prose.matchAll(/\]\(([^)\s]+)\)/gu)].map((match) => match[1]!);
    for (const link of links.filter((target) => !/^(?:https?:|#)/u.test(target))) {
      const target = path.resolve(path.dirname(file), link);
      assert.ok(target.startsWith(skillDirectory + path.sep), `${path.basename(file)} links outside the skill: ${link}`);
      assert.ok(fs.existsSync(target), `${path.basename(file)} links to a missing file: ${link}`);
    }
    assert.doesNotMatch(content, /\b(?:src|test|out|docs|requirements|\.agents)\/[\w./-]+\.(?:ts|md|json|mjs)\b/u,
      `${path.basename(file)} points into the repository sources`);
    assert.doesNotMatch(content, /(?:\/Users\/|[A-Za-z]:\\|github\.com\/gsemet)/u, `${path.basename(file)} holds an absolute path or repository URL`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-073
test("every example of the writing skill renders without a diagnostic or an unresolved directive", async () => {
  const examples = skillSources().flatMap((file) => examplesOf(file).map((example) => ({ file: path.basename(file), example })));
  assert.ok(examples.length >= 6, `the skill holds ${examples.length} examples, expected at least 6`);
  for (const { file, example } of examples) {
    const label = `${file}: ${example.split("\n")[0]}`;
    const { html, diagnostics } = await renderExample(example);
    assert.ok(html.trim().length > 0, `${label}: nothing was rendered`);
    assert.deepEqual(diagnostics.map((entry) => `${entry.severity}: ${entry.message}`), [], `${label}: diagnostics`);
    assert.doesNotMatch(html, /myst-unresolved|myst-directive-error|class="myst-directive-name"/u, `${label}: unresolved directive`);
    assert.doesNotMatch(html, /<script|\son\w+=/iu, `${label}: active content`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-073
test("the examples of the writing skill cover every syntax family it lists, each rendered as its own element", async () => {
  const examples = skillSources().flatMap((file) => examplesOf(file));
  assert.ok(examples.length > 0, "the skill holds examples");
  const rendered = await Promise.all(examples.map(async (example) => ({ example, html: (await renderExample(example)).html })));
  for (const family of FAMILIES) {
    const holders = rendered.filter(({ example }) => family.source.test(example));
    assert.ok(holders.length > 0, `no example of the skill shows: ${family.name}`);
    assert.ok(holders.some(({ html }) => family.html.test(html)), `${family.name}: the preview does not render the skill's example as expected`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-073
test("an example with an unknown directive is caught by the same check", async () => {
  const { html, diagnostics } = await renderExample(":::{no-such-directive}\nbody\n:::");
  assert.match(html, /myst-unresolved/u);
  assert.ok(diagnostics.some((entry) => entry.severity === "warning"));
});
