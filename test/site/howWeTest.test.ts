/**
 * Drift test of `docs/how-we-test.md`: what the page names (links, test folders, CI jobs, e2e groups,
 * marker verbs, coverage mode, acceptance groups, lint commands, diagram) is read from the repository.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";
import { parse } from "yaml";

import { EXTENSION_ROOT } from "../reportPaths";
import { GROUPS } from "../shared/e2eGroups";
import { isAbsoluteUrl } from "./siteLinks";

const PAGE_FOLDER = path.join(EXTENSION_ROOT, "docs");
const DIAGRAM = "../images/how-we-test/test-levels.svg";
const STRICT_MODE = "linked-swrs-and-acceptance-paths";
const NOT_ENFORCED = "## What is not enforced yet";
const ACCEPTANCE_LINE = "Groups with acceptance files:";

function read(...file: string[]): string {
  return fs.readFileSync(path.join(EXTENSION_ROOT, ...file), "utf8").replace(/\r\n?/gu, "\n");
}

function shippedPage(): string {
  return read("docs", "how-we-test.md");
}

function ciJobs(): Record<string, { strategy?: { matrix?: { group?: string[] } } }> {
  return (parse(read(".github", "workflows", "ci.yml")) as { jobs: ReturnType<typeof ciJobs> }).jobs;
}

function requirementsConfig(): { strs_test_coverage_mode: string; markers: Record<"implements" | "tests" | "accepts", string> } {
  return parse(read("requirements", "config.yml")) as ReturnType<typeof requirementsConfig>;
}

function codeSpans(page: string): string[] {
  return [...page.matchAll(/`([^`]+)`/gu)].map((match) => match[1].replace(/\n\s*/gu, " "));
}

/** A command or a marker verb is named when a code span is it, or starts with it and a space. */
function missingCommands(page: string, commands: readonly string[]): string[] {
  const spans = codeSpans(page);
  return commands.filter((command) => !spans.some((span) => span === command || span.startsWith(`${command} `)));
}

function brokenLinks(page: string, folder: string): string[] {
  const broken: string[] = [];
  for (const match of page.matchAll(/\]\(\s*<?([^()\s<>]+)>?(?:\s+"[^"]*")?\s*\)/gu)) {
    const target = match[1];
    if (isAbsoluteUrl(target)) continue;
    const file = target.replace(/[?#].*$/u, "");
    if (file && !fs.existsSync(path.resolve(folder, file))) broken.push(`line ${page.slice(0, match.index).split("\n").length}: ${target}`);
  }
  return broken;
}

function modeProblems(page: string, mode: string): string[] {
  const problems: string[] = [];
  const named = [...page.matchAll(/The StRS coverage mode is `([^`]+)`\./gu)].map((match) => match[1]);
  if (named.length !== 1) problems.push(`the page has ${named.length} coverage mode lines, not one`);
  for (const other of named) {
    if (other !== mode) problems.push(`the page names the coverage mode ${other}, requirements/config.yml has ${mode}`);
  }
  const hasSection = page.split("\n").includes(NOT_ENFORCED);
  if (hasSection && mode === STRICT_MODE) problems.push(`the page keeps "${NOT_ENFORCED}" under the mode ${mode}`);
  if (!hasSection && mode !== STRICT_MODE) problems.push(`the page lacks "${NOT_ENFORCED}" under the mode ${mode}`);
  return problems;
}

function acceptanceProblems(page: string, groups: readonly string[]): string[] {
  const lines = page.split("\n").filter((line) => line.startsWith(ACCEPTANCE_LINE));
  if (lines.length !== 1) return [`the page has ${lines.length} lines starting "${ACCEPTANCE_LINE}", not one`];
  const named = codeSpans(lines[0]);
  const problems: string[] = [];
  const missing = groups.filter((group) => !named.includes(group));
  const unknown = named.filter((group) => !groups.includes(group));
  if (missing.length > 0) problems.push(`groups of the acceptance job missing from the page: ${missing.join(", ")}`);
  if (unknown.length > 0) problems.push(`groups of the page that the acceptance job does not have: ${unknown.join(", ")}`);
  return problems;
}

test("every relative link and image of How we test resolves from docs/", () => {
  assert.deepEqual(brokenLinks(shippedPage(), PAGE_FOLDER), []);
});

test("the link check refuses a broken relative link and leaves an absolute URL alone", () => {
  const page = "[a](https://example.com/missing)\n[b](../CONTRIBUTING.md#checks) [c](#here)\n![d](../images/how-we-test/missing.svg)\n";
  assert.deepEqual(brokenLinks(page, PAGE_FOLDER), ["line 3: ../images/how-we-test/missing.svg"]);
});

test("How we test names every test folder", () => {
  const spans = codeSpans(shippedPage());
  const folders = fs.readdirSync(path.join(EXTENSION_ROOT, "test"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => `test/${entry.name}`);
  assert.deepEqual([...folders, "sphinx/tests"].filter((folder) => !spans.includes(folder) && !spans.includes(`${folder}/`)), []);
});

test("How we test names every CI job", () => {
  const spans = codeSpans(shippedPage());
  assert.deepEqual(Object.keys(ciJobs()).filter((job) => !spans.includes(job)), []);
});

test("How we test names every e2e group", () => {
  const spans = codeSpans(shippedPage());
  assert.deepEqual(GROUPS.map((group) => group.id).filter((id) => !spans.includes(id)), []);
});

test("How we test names every marker verb of the requirements configuration", () => {
  const { implements: implementsVerb, tests, accepts } = requirementsConfig().markers;
  assert.deepEqual(missingCommands(shippedPage(), [implementsVerb, tests, accepts]), []);
});

test("How we test names the StRS coverage mode and says what is not enforced under it", () => {
  assert.deepEqual(modeProblems(shippedPage(), requirementsConfig().strs_test_coverage_mode), []);
});

test("the coverage mode check refuses another mode, two mode lines and a stale section", () => {
  const line = (mode: string) => `The StRS coverage mode is \`${mode}\`.\n`;
  const loose = "linked-swrs-and-validation-test";
  assert.deepEqual(modeProblems(`${line(loose)}${NOT_ENFORCED}\n`, loose), []);
  assert.deepEqual(modeProblems(line(STRICT_MODE), STRICT_MODE), []);
  assert.deepEqual(modeProblems(`${line("another-mode")}${NOT_ENFORCED}\n`, loose), [`the page names the coverage mode another-mode, requirements/config.yml has ${loose}`]);
  assert.deepEqual(modeProblems(`${line(loose)}${line(loose)}${NOT_ENFORCED}\n`, loose), ["the page has 2 coverage mode lines, not one"]);
  assert.deepEqual(modeProblems(`${line(STRICT_MODE)}${NOT_ENFORCED}\n`, STRICT_MODE), [`the page keeps "${NOT_ENFORCED}" under the mode ${STRICT_MODE}`]);
});

test("How we test lists the groups of the acceptance job", () => {
  assert.deepEqual(acceptanceProblems(shippedPage(), ciJobs().acceptance.strategy?.matrix?.group ?? []), []);
});

test("the acceptance group check refuses a missing group and an unknown one", () => {
  const page = `${ACCEPTANCE_LINE} \`gfm\`.\n`;
  assert.deepEqual(acceptanceProblems(page, ["gfm"]), []);
  assert.deepEqual(acceptanceProblems(page, ["gfm", "myst"]), ["groups of the acceptance job missing from the page: myst"]);
  assert.deepEqual(acceptanceProblems(page, []), ["groups of the page that the acceptance job does not have: gfm"]);
});

test("How we test names every command of just requirements-lint", () => {
  const recipe = /^requirements-lint:.*\n((?:[ \t]+.*\n)+)/mu.exec(read("justfile"))?.[1] ?? "";
  const okfreq = [...recipe.matchAll(/\{\{\s*okfreq\s*\}\}\s+([\w-]+)/gu)].map((match) => `okfreq ${match[1]}`);
  const scripts = [...recipe.matchAll(/\bscripts\/[\w./-]+/gu)].map((match) => match[0]);
  const npm = [...recipe.matchAll(/(?:\{\{\s*npm\s*\}\}|\bnpm)\s+run\s+([\w:-]+)/gu)].map((match) => match[1]);
  assert.ok(okfreq.length > 0, "the requirements-lint recipe is read from the justfile");
  const page = shippedPage();
  const spans = codeSpans(page);
  assert.deepEqual(
    [...missingCommands(page, [...okfreq, ...scripts]), ...npm.filter((name) => !spans.includes(name) && !spans.includes(`npm run ${name}`))],
    [],
  );
});

test("the diagram of How we test has a title, a description and an alternative text", () => {
  const svg = read("images", "how-we-test", "test-levels.svg");
  assert.match(svg, /<title\b[^>]*>[^<]*\S[^<]*<\/title>/u);
  assert.match(svg, /<desc\b[^>]*>[^<]*\S[^<]*<\/desc>/u);
  const alts = [...shippedPage().matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/gu)].filter((match) => match[2] === DIAGRAM).map((match) => match[1].trim());
  assert.equal(alts.length, 1, `the page shows ${DIAGRAM} once`);
  assert.notEqual(alts[0], "");
});
