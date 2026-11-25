// Tests of the Git repository that the diff-side-by-side scenario makes off camera: the shipped scenario.mjs and
// stage files, in temporary folders outside the repository. Node built-ins only: no VS Code, no network.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const clipDir = fileURLToPath(new URL("../../clips/diff-side-by-side/", import.meta.url));
const { COMMITTED, NOW, makeRepository } = await import(pathToFileURL(join(clipDir, "scenario.mjs")).href);

/** git for the test itself: no system or global config. */
function git(cwd, args) {
  const empty = join(cwd, "..", "gitconfig-empty");
  writeFileSync(empty, "");
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: empty };
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY"]) delete env[name];
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env, stdio: ["pipe", "pipe", "pipe"] });
}

/** A fresh folder under the temporary folder with a `workspace` subfolder; `body` gets both, the folder is removed. */
function inTemporaryFolder(body) {
  const folder = mkdtempSync(join(tmpdir(), "okfclip-repository-test-"));
  const workspace = join(folder, "workspace");
  mkdirSync(workspace);
  try {
    body(workspace, folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

test("the stage files of the clip are the committed text and the text now", () => {
  assert.equal(COMMITTED, readFileSync(join(clipDir, "stage", "deploy-guide.committed.md"), "utf8"));
  assert.equal(NOW, readFileSync(join(clipDir, "stage", "deploy-guide.md"), "utf8"));
  assert.notEqual(COMMITTED, NOW);
});

test("makeRepository commits the committed text and leaves the working file as the stage made it", () => {
  inTemporaryFolder((workspace) => {
    copyFileSync(join(clipDir, "stage", "deploy-guide.md"), join(workspace, "deploy-guide.md"));
    const id = makeRepository(workspace);
    assert.match(id, /^[0-9a-f]{40,64}$/u);
    assert.equal(git(workspace, ["rev-parse", "HEAD"]).trim(), id);
    assert.equal(git(workspace, ["rev-list", "--count", "HEAD"]).trim(), "1");
    assert.equal(git(workspace, ["show", "HEAD:deploy-guide.md"]), readFileSync(join(clipDir, "stage", "deploy-guide.committed.md"), "utf8"));
    assert.equal(readFileSync(join(workspace, "deploy-guide.md"), "utf8"), readFileSync(join(clipDir, "stage", "deploy-guide.md"), "utf8"));
    assert.equal(git(workspace, ["status", "--porcelain"]).trimEnd(), " M deploy-guide.md");
    assert.deepEqual(git(workspace, ["log", "--format=%an"]).trim().split("\n"), ["Studio Demo"]);
    // A later take: the kit copies the stage again and keeps the workspace.
    assert.equal(makeRepository(workspace), id);
    assert.equal(git(workspace, ["rev-list", "--count", "HEAD"]).trim(), "1");
  });
});

test("a workspace inside a Git work tree is refused", () => {
  inTemporaryFolder((workspace) => {
    git(workspace, ["init", "-b", "main"]);
    const inner = join(workspace, "inner");
    mkdirSync(inner);
    assert.throws(() => makeRepository(inner), { message: /inside a Git work tree/u });
  });
});

test("a workspace whose repository has another HEAD text is refused", () => {
  inTemporaryFolder((workspace) => {
    git(workspace, ["init", "-b", "main"]);
    git(workspace, ["config", "user.name", "Someone"]);
    git(workspace, ["config", "user.email", "someone@example.invalid"]);
    git(workspace, ["config", "commit.gpgsign", "false"]);
    writeFileSync(join(workspace, "deploy-guide.md"), "# Another file\n");
    git(workspace, ["add", "deploy-guide.md"]);
    git(workspace, ["commit", "-m", "Another commit"]);
    assert.throws(() => makeRepository(workspace), { message: /another repository/u });
  });
});
