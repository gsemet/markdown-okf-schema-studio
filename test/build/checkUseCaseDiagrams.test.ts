import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { parseUseCaseDiagram } from "../site/requirementsViewer/useCaseDiagram";

const repo = path.resolve(__dirname, "../../..");
const script = path.join(repo, "scripts", "check-use-case-diagrams.mjs");
const CONFIG = "tiers:\n  StRS:\n    folder: strs\n";
const DOES_NOT_PARSE = "the use case diagram does not parse";

type Files = Record<string, string>;

/** A StRS file whose `### Use case diagram` section holds `section` (a Mermaid fence or other text). */
const strs = (id: string, section: string): string =>
  `---\ntype: StRS\nid: ${id}\nreq_lifecycle: proposed\n---\n\n## ${id}\n\n### User need\n\nA need.\n\n### Use case diagram\n\n${section}\n\n### Main paths\n\n- A path.\n`;
const fence = (...lines: string[]): string => ["```mermaid", ...lines, "```"].join("\n");
const file = (id: string): string => `bundle/tiers/strs/scope/${id}.md`;
/** The 1-based line of the first line of `text` that contains `needle`. */
const lineOf = (text: string, needle: string): number => text.split("\n").findIndex((line) => line.includes(needle)) + 1;

function run(cwd: string, bundle: string): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [script, bundle], { cwd, encoding: "utf8" });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

/** Runs the script on a scratch bundle under `bundle/` holding `files` (paths relative to `bundle/tiers/strs/scope/`); the project's folders are never touched. */
function check(files: Files): { status: number | null; out: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-diagrams-"));
  try {
    const all: Files = { "bundle/config.yml": CONFIG };
    for (const [name, content] of Object.entries(files)) all[`bundle/tiers/strs/scope/${name}`] = content;
    for (const [name, content] of Object.entries(all)) {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      fs.writeFileSync(path.join(root, name), content);
    }
    return run(root, "bundle");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const BOX = fence("sequenceDiagram", "    participant Writer", "    participant Box", "    Writer->>Box: hi");

test("refusal: a participant named Box used in a message is reported at its line with Mermaid's message", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S2
  const id = "StRS-T-PALETTE-001";
  const text = strs(id, BOX);
  const result = check({ [`${id}.md`]: text });
  assert.equal(result.status, 1);
  assert.ok(result.out.includes(`${file(id)}:${lineOf(text, "Writer->>Box")}: ${id}: ${DOES_NOT_PARSE}`), result.out);
  assert.match(result.out, /\n {4}Parse error on line 4:/u);
  assert.match(result.out, /\n {4}Expecting .*got 'box'/u);
  assert.doesNotMatch(result.out, /use case diagrams:/u);
});

test("refusal: a state named state is reported, a valid state diagram is not", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S2
  const broken = "StRS-T-MODE-001";
  const valid = "StRS-T-MODE-002";
  const brokenText = strs(broken, fence("stateDiagram-v2", "    [*] --> Editing", "    Editing --> state"));
  const result = check({
    [`${broken}.md`]: brokenText,
    [`${valid}.md`]: strs(valid, fence("stateDiagram-v2", "    [*] --> Reading", "    Reading --> Editing: edit on", "    Editing --> Reading: edit off")),
  });
  assert.equal(result.status, 1);
  assert.ok(result.out.includes(`${file(broken)}:${lineOf(brokenText, "Editing --> state")}: ${broken}: ${DOES_NOT_PARSE}`), result.out);
  assert.doesNotMatch(result.out, new RegExp(valid, "u"));
  assert.doesNotMatch(result.out, /DOMPurify/u);
});

test("every failure is reported, and a message with no line reports the mermaid fence line", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S3
  const box = "StRS-T-CORE-001";
  const untyped = "StRS-T-CORE-002";
  const untypedText = strs(untyped, fence("hello world"));
  const result = check({ [`${box}.md`]: strs(box, BOX), [`${untyped}.md`]: untypedText });
  assert.equal(result.status, 1);
  assert.equal(result.out.split("\n").filter((line) => line.includes(DOES_NOT_PARSE)).length, 2, result.out);
  assert.ok(result.out.includes(`${file(box)}:`), result.out);
  assert.ok(result.out.includes(`${file(untyped)}:${lineOf(untypedText, "```mermaid")}: ${untyped}: ${DOES_NOT_PARSE}`), result.out);
  assert.match(result.out, /\n {4}No diagram type detected/u);
});

test("boundary: no section, no fence, an empty fence or a fence after the section is no diagram; a CRLF file is counted", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S2
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S3
  const noSection = "---\nid: StRS-T-EDGE-001\n---\n\n## StRS-T-EDGE-001\n\n### User need\n\nA need.\n";
  const afterSection = `---\nid: StRS-T-EDGE-004\n---\n\n### Use case diagram\n\nA caption.\n\n### Main paths\n\n${BOX}\n`;
  const boundary: Files = {
    "StRS-T-EDGE-001.md": noSection,
    "StRS-T-EDGE-002.md": strs("StRS-T-EDGE-002", "A caption with no fence."),
    "StRS-T-EDGE-003.md": strs("StRS-T-EDGE-003", fence("", "  ")),
    "StRS-T-EDGE-004.md": afterSection,
    "index.md": `# Index\n\n### Use case diagram\n\n${BOX}\n`,
  };
  const none = check(boundary);
  assert.equal(none.status, 0, none.out);
  assert.match(none.out, /^use case diagrams: 0 StRS checked, all parse \(Mermaid \d+\.\d+\.\d+\)\n$/u);

  const crlf = strs("StRS-T-EDGE-005", fence("sequenceDiagram", "    participant Writer", "    participant Field", "    Writer->>Field: hi")).replace(/\n/gu, "\r\n");
  const counted = check({ ...boundary, "StRS-T-EDGE-005.md": crlf });
  assert.equal(counted.status, 0, counted.out);
  assert.match(counted.out, /^use case diagrams: 1 StRS checked, all parse/u);
});

test("the shipped bundle parses, with as many diagrams as the site extracts", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S2
  const strsDir = path.join(repo, "requirements", "tiers", "strs");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".md") ? [full] : [];
    });
  const expected = walk(strsDir).filter((name) => parseUseCaseDiagram(fs.readFileSync(name, "utf8")) !== undefined).length;
  assert.ok(expected > 0);
  const result = run(repo, "requirements");
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, new RegExp(`^use case diagrams: ${expected} StRS checked, all parse \\(Mermaid \\d+\\.\\d+\\.\\d+\\)\\n$`, "u"));
});

test("every id the guideline lists as reserved is reported", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S3
  const guideline = fs.readFileSync(path.join(repo, "requirements", "guidelines", "project.guidelines.md"), "utf8");
  const words = (kind: string): string[] => {
    const line = guideline.split(/\r?\n/u).find((entry) => entry.trimStart().startsWith(`- \`${kind}\``));
    assert.ok(line, `no reserved ids line for ${kind}`);
    const list = [...line.slice(line.indexOf(":") + 1).matchAll(/`([^`]+)`/gu)].map((match) => match[1] ?? "");
    assert.ok(list.length > 0, `no reserved id for ${kind}`);
    return list;
  };
  const capitalised = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  const diagrams: Array<[string, string]> = [
    ...words("sequenceDiagram").map((word): [string, string] => [word, fence("sequenceDiagram", "    participant A", `    participant ${capitalised(word)}`, `    A->>${capitalised(word)}: x`)]),
    ...words("flowchart").map((word): [string, string] => [word, fence("flowchart LR", `    A --> ${word}`)]),
    ...words("stateDiagram-v2").map((word): [string, string] => [word, fence("stateDiagram-v2", `    [*] --> ${word}`)]),
  ];
  const files: Files = {};
  const ids = diagrams.map(([word, diagram], index) => {
    const id = `StRS-T-WORD-${String(index + 1).padStart(3, "0")}`;
    files[`${id}.md`] = strs(id, diagram);
    return [id, word] as const;
  });
  const result = check(files);
  assert.equal(result.status, 1, result.out);
  const accepted = ids.filter(([id]) => !result.out.includes(`: ${id}: ${DOES_NOT_PARSE}`)).map(([, word]) => word);
  assert.deepEqual(accepted, [], `Mermaid accepts these listed ids: ${accepted.join(", ")}`);
});

test("the reported line skips the comment and directive lines Mermaid removes before numbering", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S2
  // @tests_req SwRS-MDOKFSTUDIO-CORE-090#S3
  const id = "StRS-T-PALETTE-002";
  const text = strs(
    id,
    fence(
      "%%{init: {'theme': 'neutral'}}%%",
      "sequenceDiagram",
      "    %% the writer types in the box",
      "    participant Writer",
      "    %% the box",
      "    participant Box",
      "",
      "    Writer->>Box: hi",
    ),
  );
  const result = check({ [`${id}.md`]: text });
  assert.equal(result.status, 1);
  assert.ok(result.out.includes(`${file(id)}:${lineOf(text, "Writer->>Box")}: ${id}: ${DOES_NOT_PARSE}`), result.out);
});
