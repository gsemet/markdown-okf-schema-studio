#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const skillRoot = path.resolve(import.meta.dirname, "..");
const skillPath = path.join(skillRoot, "SKILL.md");
const helperPath = path.join(skillRoot, "scripts", "vscode-ui.mjs");
const requiredFiles = [
  "README.md",
  "SKILL.md",
  "references/journeys.md",
  "references/report-template.md",
  "references/tester-notes-template.md",
  "assets/fixtures/finding.md",
  "assets/fixtures/repair-me.md",
  "assets/fixtures/_schema/finding.schema.yaml",
  "scripts/vscode-ui.mjs",
  "scripts/vscode-ui.test.mjs",
];

function read(relativePath) {
  return fs.readFileSync(path.join(skillRoot, relativePath), "utf8");
}

function frontmatterValue(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, "mu"));
  assert.ok(match, `missing frontmatter field: ${name}`);
  return match[1].trim().replace(/^['"]|['"]$/gu, "");
}

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(skillRoot, relativePath)), `missing ${relativePath}`);
}

const skill = fs.readFileSync(skillPath, "utf8");
const frontmatterMatch = skill.match(/^---\n([\s\S]*?)\n---\n/u);
assert.ok(frontmatterMatch, "SKILL.md frontmatter is missing");
const frontmatter = frontmatterMatch[1];
assert.equal(frontmatterValue(frontmatter, "name"), path.basename(skillRoot));
const description = frontmatterValue(frontmatter, "description");
assert.ok(description.length <= 1024, "description exceeds 1024 characters");
assert.ok(!description.includes("\n"), "description must be single-line");
assert.equal(
  frontmatterValue(frontmatter, "skill-id"),
  "85fd65a4-1e19-44f0-94e9-679120fe02a0",
);
assert.match(frontmatter, /owner:.*Gaetan Semet <gaetan\.semet@ampere\.cars>/u);
assert.match(frontmatter, /recommended-models:.*GPT-5\.6 Luna \(copilot\)/u);

for (const match of skill.matchAll(/`((?:references|scripts)\/[A-Za-z0-9._/-]+)`/gu)) {
  assert.ok(fs.existsSync(path.join(skillRoot, match[1])), `broken skill link: ${match[1]}`);
}

const report = read("references/report-template.md");
for (const requiredHeading of ["## Run Summary", "## Environment and Coverage", "## Findings"])
  assert.match(report, new RegExp(requiredHeading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
for (const field of ["Use case and user goal", "Expected behavior", "Observed behavior",
  "User impact", "Category", "Severity", "Confidence", "Evidence"])
  assert.match(report, new RegExp(field, "u"), `report template misses ${field}`);

const helper = fs.readFileSync(helperPath, "utf8");
for (const marker of [
  "--extensionDevelopmentPath",
  "--remote-debugging-port",
  "--shared-data-dir",
  "VSCODE_EXECUTABLE",
  "observed-issue",
  "extensionBundleSha256",
  "helperScriptSha256",
  "assertProcessIdentity",
  "processGroupSnapshot",
  "startMarker",
  "initialization-failure",
  "validateOwnedInstance",
  "verifyCampaignRetained",
  "verify-retained",
])
  assert.ok(helper.includes(marker), `helper misses ${marker}`);
assert.ok(!helper.includes("downloadAndUnzipVSCode"), "helper must not download VS Code");
assert.ok(!helper.includes("npm ci"), "helper must not install dependencies");
assert.match(skill, /Inline Sibling Handoff/u);
assert.match(skill, /goal\.md/u);
assert.match(skill, /status\.json/u);
assert.match(skill, /scripts\/validate\.mjs/u);
assert.match(skill, /four differentiated persona\/condition assignments/u);
assert.match(skill, /Command Palette invocation alone[\s\S]{0,40}not\s+sufficient/u);
assert.match(skill, /final campaign-root check/u);
assert.match(skill, /report\.md[\s\S]{0,180}every tester/u);
assert.match(skill, /real screenshots/u);

const help = spawnSync(process.execPath, [helperPath, "--help"], { encoding: "utf8" });
assert.equal(help.status, 0, help.stderr || "helper --help failed");
assert.match(help.stdout, /Usage:/u);
assert.match(help.stdout, /launch\s+Start isolated VS Code/u);

const safetyTests = spawnSync(process.execPath, [
  "--test",
  path.join(skillRoot, "scripts", "vscode-ui.test.mjs"),
], { encoding: "utf8" });
assert.equal(safetyTests.status, 0, safetyTests.stderr || safetyTests.stdout);

console.log(`validated ${requiredFiles.length} skill files and helper entry point`);
