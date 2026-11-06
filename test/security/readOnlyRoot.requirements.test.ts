import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import {
  createPreviewResourcePolicy,
  isBroadRestrictedRoot,
  readBoundedText,
} from "../../src/core/security/resource-policy";
import { needsSymlinks } from "../shared/symlinks";

const SECRET = "PRIVATE-KEY-MATERIAL";
const savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
let sandbox = "";
let home = "";

beforeEach(() => {
  sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "readonly-root-")));
  home = path.join(sandbox, "home");
  fs.mkdirSync(path.join(home, ".ssh"), { recursive: true });
  fs.mkdirSync(path.join(home, "project", ".agents"), { recursive: true });
  fs.writeFileSync(path.join(home, ".ssh", "id_rsa"), SECRET);
  fs.writeFileSync(path.join(home, "part.md"), "Included part\n");
  fs.writeFileSync(path.join(home, "project", "part.md"), "Included part\n");
  fs.writeFileSync(path.join(home, "project", ".agents", "rule.md"), `${SECRET}\n`);
  fs.writeFileSync(path.join(home, "project", "image.png"), "png");
  process.env.HOME = home;
  process.env.USERPROFILE = home;
});

afterEach(() => {
  for (const [name, value] of Object.entries(savedHome)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  fs.rmSync(sandbox, { recursive: true, force: true });
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("the home folder, its ancestors and file-system roots are broad roots", () => {
  assert.equal(isBroadRestrictedRoot(home), true);
  assert.equal(isBroadRestrictedRoot(sandbox), true);
  assert.equal(isBroadRestrictedRoot(path.parse(sandbox).root), true);
  assert.equal(isBroadRestrictedRoot(path.join(home, "project")), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a restricted-reads policy in the home folder reads nothing", () => {
  const policy = createPreviewResourcePolicy(home, home, true);
  const read = readBoundedText(policy, "part.md", home);
  assert.deepEqual(read, { ok: false, refusal: "restricted-root" });
  assert.ok(policy.diagnostics.some((entry) => entry.code === "restricted-root"));
  assert.equal(readBoundedText(policy, ".ssh/id_rsa", home).ok, false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a restricted-reads policy refuses dot-segments but a trusted policy keeps them", () => {
  const project = path.join(home, "project");
  const restrictedReads = createPreviewResourcePolicy(project, project, true);
  assert.equal(readBoundedText(restrictedReads, "part.md", project).ok, true);
  assert.deepEqual(readBoundedText(restrictedReads, ".agents/rule.md", project), { ok: false, refusal: "hidden-path" });
  assert.ok(restrictedReads.diagnostics.some((entry) => entry.code === "hidden-path"));

  const trusted = createPreviewResourcePolicy(project, project, false);
  assert.equal(readBoundedText(trusted, ".agents/rule.md", project).ok, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a restricted-reads dot-directory is refused through a symbolic link as well", needsSymlinks, () => {
  const project = path.join(home, "project");
  fs.symlinkSync(path.join(project, ".agents"), path.join(project, "visible"));
  const policy = createPreviewResourcePolicy(project, project, true);
  const read = readBoundedText(policy, "visible/rule.md", project);
  assert.equal(read.ok, false);
});

async function render(text: string, documentDirectory: string, restrictedReads: boolean) {
  return renderPreviewDocument({
    document: {
      uri: { scheme: "file", fsPath: path.join(documentDirectory, "doc.md") },
      languageId: "markdown",
      version: 1,
      getText: () => text,
    },
    workspaceRoot: documentDirectory,
    restrictedReads,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("an include of a document in the home folder is refused with a diagnostic", async () => {
  const result = await render("```{include} .ssh/id_rsa\n```\n\n```{include} part.md\n```\n", home, true);
  assert.equal(result.html.includes(SECRET), false);
  assert.equal(result.html.includes("Included part"), false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "restricted-root"));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a restricted-reads preview includes a plain file but not a dot-directory file", async () => {
  const project = path.join(home, "project");
  const result = await render("```{include} part.md\n```\n\n```{include} .agents/rule.md\n```\n", project, true);
  assert.ok(result.html.includes("Included part"));
  assert.equal(result.html.includes(SECRET), false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "hidden-path"));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a trusted workspace still includes from a dot-directory", async () => {
  const project = path.join(home, "project");
  const result = await render("```{include} .agents/rule.md\n```\n", project, false);
  assert.ok(result.html.includes(SECRET));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a standalone file (no workspace root) includes a plain sibling, refuses dot-directories and non-image files outside its folder", () => {
  const project = path.join(home, "project");
  const sub = path.join(project, "sub");
  fs.mkdirSync(path.join(sub, ".hidden"), { recursive: true });
  fs.writeFileSync(path.join(sub, "doc.md"), "doc\n");
  fs.writeFileSync(path.join(sub, ".hidden", "rule.md"), `${SECRET}\n`);
  // The production root: a file outside every workspace folder has its own folder as resource root.
  const standalone = createPreviewResourcePolicy(sub, sub, true);
  assert.equal(readBoundedText(standalone, "doc.md", sub).ok, true);
  assert.deepEqual(readBoundedText(standalone, ".hidden/rule.md", sub), { ok: false, refusal: "hidden-path" });
  assert.deepEqual(readBoundedText(standalone, "../part.md", sub), { ok: false, refusal: "resource-outside-root" });
  // A non-image file is refused outside the folder even when an image request would not be.
  assert.deepEqual(standalone.resolveResourceDetailed("../part.md", sub, { image: true }), { refusal: "resource-outside-root" });
  assert.deepEqual(standalone.resolveResourceDetailed("../image.png", sub, { image: true }), { refusal: "resource-outside-root" });
  assert.equal(standalone.resolveResource("../image.png", sub, { image: true }), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("the home folder is found with another letter case on case-insensitive systems", () => {
  const insensitive = process.platform === "win32" || process.platform === "darwin";
  assert.equal(isBroadRestrictedRoot(home.toUpperCase()), insensitive);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("on Windows USERPROFILE wins over HOME, elsewhere HOME wins", () => {
  const other = path.join(sandbox, "other");
  fs.mkdirSync(other);
  process.env.HOME = other;
  process.env.USERPROFILE = home;
  const windows = process.platform === "win32";
  assert.equal(isBroadRestrictedRoot(home), windows);
  assert.equal(isBroadRestrictedRoot(other), !windows);
});
