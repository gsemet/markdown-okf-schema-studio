import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  buildSphinxSnapshot,
  resetProcessSpawnerForTests,
  setProcessSpawnerForTests,
  SphinxBuildError,
  SphinxBuildCanceledError,
  WorkspaceTrustError,
} from "../../src/build/sphinxBuild";

function documentAt(filePath: string, text: string) {
  return {
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markdown",
    version: 1,
    getText: () => text,
  };
}

class FakeChild extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public killed = false;

  public kill(): boolean {
    this.killed = true;
    process.nextTick(() => this.emit("close", null, "SIGTERM"));
    return true;
  }
}

function createWorkspace(): { root: string; active: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-sphinx-build-test-"));
  fs.mkdirSync(path.join(root, "sphinx"), { recursive: true });
  const active = path.join(root, "active.md");
  fs.writeFileSync(active, "# Active\n");
  return { root, active };
}

test("checks workspace trust before staging or spawning Sphinx", async () => {
  const workspace = createWorkspace();
  let spawnCount = 0;
  setProcessSpawnerForTests({
    spawn: (() => {
      spawnCount += 1;
      throw new Error("spawn must not be reached");
    }) as never,
  });
  try {
    await assert.rejects(
      buildSphinxSnapshot({
        document: documentAt(workspace.active, "# Dirty\n"),
        workspaceRoot: workspace.root,
        requestId: 1,
        isWorkspaceTrusted: () => false,
      }),
      WorkspaceTrustError,
    );
    assert.equal(spawnCount, 0);
  } finally {
    resetProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});

test("invokes only the authentic isolated Sphinx HTML command", async () => {
  const workspace = createWorkspace();
  let observed: {
    command: string;
    args: readonly string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
  } | undefined;
  setProcessSpawnerForTests({
    spawn: ((
      command: string,
      args: readonly string[],
      options: { cwd?: string; env?: NodeJS.ProcessEnv },
    ) => {
      observed = { command, args, cwd: options.cwd as string, env: options.env ?? {} };
      const child = new FakeChild();
      process.nextTick(() => {
        const outputDirectory = args[args.length - 1];
        fs.mkdirSync(outputDirectory, { recursive: true });
        fs.writeFileSync(path.join(outputDirectory, "index.html"), "<html>Sphinx</html>");
        child.emit("close", 0, null);
      });
      return child as never;
    }) as never,
  });
  try {
    const result = await buildSphinxSnapshot({
      document: documentAt(workspace.active, "# Dirty\n"),
      workspaceRoot: workspace.root,
      requestId: 4,
      isWorkspaceTrusted: () => true,
    });
    try {
      assert.equal(result.html, "<html>Sphinx</html>");
      assert.equal(observed?.command, "uv");
      assert.deepEqual(observed?.args.slice(0, 7), [
        "run",
        "--no-sync",
        "--",
        "sphinx-build",
        "--keep-going",
        "-b",
        "html",
      ]);
      assert.equal(observed?.cwd, workspace.root);
      assert.equal(observed?.env.SPHINX_PREVIEW_MODE, "1");
      assert.equal(observed?.env.SPHINX_PREVIEW_ACTIVE_SOURCE, result.stage.activeSourcePath);
      assert.equal(observed?.env.SPHINX_PREVIEW_ACTIVE_FILE, result.stage.activeDocumentPath);
      assert.equal(observed?.env.SPHINX_PREVIEW_DOCUMENT_ID, result.stage.activeDocumentIdentity);
      assert.ok(observed?.env.SPHINX_PREVIEW_SOURCE_ORIGINS);
      assert.ok(observed?.args.includes(path.join(workspace.root, "sphinx")));
      assert.ok(!observed?.args.some((argument) => argument.includes("book-prepare")));
      assert.ok(result.stage.outputDirectory.startsWith(fs.realpathSync(os.tmpdir())));
      assert.ok(result.latencyMs >= 0);
    } finally {
      result.stage.dispose();
    }
  } finally {
    resetProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});

test("returns actionable source diagnostics for a failing Sphinx directive", async () => {
  const workspace = createWorkspace();
  setProcessSpawnerForTests({
    spawn: ((_: string, args: readonly string[]) => {
      const child = new FakeChild();
      process.nextTick(() => {
        child.stderr.emit(
          "data",
          `${path.join(args[args.length - 2], "index.md")}:3: WARNING: bad directive\n`,
        );
        child.emit("close", 1, null);
      });
      return child as never;
    }) as never,
  });
  try {
    await assert.rejects(
      buildSphinxSnapshot({
        document: documentAt(workspace.active, "# Dirty\n\ninvalid\n"),
        workspaceRoot: workspace.root,
        requestId: 5,
        isWorkspaceTrusted: () => true,
      }),
      (error: unknown) => {
        assert.ok(error instanceof SphinxBuildError);
        assert.match(error.message, new RegExp(`${workspace.active}:3: bad directive`, "u"));
        assert.equal(error.diagnostics[0]?.file, workspace.active);
        assert.equal(error.diagnostics[0]?.line, 3);
        assert.equal(error.stage.rootDirectory.startsWith(fs.realpathSync(os.tmpdir())), true);
        return true;
      },
    );
  } finally {
    resetProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});

test("terminates an active Sphinx child and removes its temporary stage on cancellation", async () => {
  const workspace = createWorkspace();
  const child = new FakeChild();
  let outputDirectory = "";
  setProcessSpawnerForTests({
    spawn: ((_: string, args: readonly string[]) => {
      outputDirectory = args[args.length - 1];
      return child as never;
    }) as never,
  });
  const controller = new AbortController();
  try {
    const build = buildSphinxSnapshot({
      document: documentAt(workspace.active, "# Dirty\n"),
      workspaceRoot: workspace.root,
      requestId: 6,
      signal: controller.signal,
      isWorkspaceTrusted: () => true,
    });
    controller.abort();
    await assert.rejects(build, SphinxBuildCanceledError);
    assert.equal(child.killed, true);
    assert.equal(fs.existsSync(path.dirname(outputDirectory)), false);
  } finally {
    resetProcessSpawnerForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
});
