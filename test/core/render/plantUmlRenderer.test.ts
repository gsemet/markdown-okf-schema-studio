import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  injectPlantUmlDiagrams,
  resetPlantUmlTimeoutForTests,
  setPlantUmlTimeoutForTests,
  PLANTUML_TIMEOUT_MS,
  PLANTUML_LIMIT_SIZE,
  PLANTUML_SECURITY_PROFILE,
  resolveJavaCommand,
  renderPlantUmlDiagrams,
} from "../../../src/core/render/plantUmlRenderer";
import {
  exited,
  fakeRunner,
  hostOf,
  missingProgram,
  nodeFiles,
  type FakeProcessRunner,
} from "./plantUmlFakes";

function createWorkspace(): { root: string; jarPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "markdown-okf-plantuml-test-"));
  const jarPath = path.join(root, "plantuml.jar");
  fs.writeFileSync(jarPath, "fake JAR");
  return { root, jarPath };
}

function diagramHtml(source = "@startuml\nAlice -> Bob: hello\n@enduml"): string {
  return `<figure class="myst-plantuml-figure" data-line="7"><div class="myst-plantuml-diagram">${source}</div></figure>`;
}

async function withWorkspace<T>(run: (workspace: { root: string; jarPath: string }) => Promise<T>): Promise<T> {
  const workspace = createWorkspace();
  try {
    return await run(workspace);
  } finally {
    resetPlantUmlTimeoutForTests();
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
}

const render = (
  workspace: { root: string; jarPath: string },
  runner: FakeProcessRunner,
  extra: { signal?: AbortSignal; source?: string } = {},
) =>
  renderPlantUmlDiagrams(diagramHtml(extra.source), {
    workspaceRoot: workspace.root,
    trusted: true,
    jarPath: workspace.jarPath,
    ...hostOf(runner),
    ...(extra.signal ? { signal: extra.signal } : {}),
  });

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-105#S6
test("renders PlantUML through the configured external JAR and injects an image", async () => {
  await withWorkspace(async (workspace) => {
    const runner = fakeRunner(() => exited(`PlantUML log\n<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>\n`));
    const source = "@startuml\nAlice -> Bob: hello\n@enduml";

    const result = await renderPlantUmlDiagrams(diagramHtml(source), {
      jarPath: "plantuml.jar",
      workspaceRoot: workspace.root,
      trusted: true,
      ...hostOf(runner),
    });

    assert.equal(runner.calls.length, 1);
    const [call] = runner.calls;
    assert.deepEqual(
      { command: call?.command, args: call?.args.filter((arg) => !arg.startsWith("-D")), cwd: call?.options.cwd },
      {
        command: await resolveJavaCommand(nodeFiles),
        args: ["-jar", workspace.jarPath, "-pipe", "-tsvg"],
        cwd: workspace.root,
      },
    );
    assert.equal(call?.options.input, source);
    assert.equal(call?.options.timeoutMs, PLANTUML_TIMEOUT_MS);
    assert.equal(result.diagnostics.length, 0);
    assert.deepEqual(result.diagrams[0], {
      status: "rendered",
      line: 7,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>',
    });

    const injected = injectPlantUmlDiagrams(diagramHtml(source), result.diagrams);
    assert.match(injected, /data-render-state="rendered"/u);
    assert.match(injected, /class="myst-plantuml-image"/u);
    assert.match(injected, /data:image\/svg\+xml;charset=utf-8,/u);
    assert.doesNotMatch(injected, /@startuml/u);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S3
test("uses the PATH executable when no JAR is configured and reports missing commands", async () => {
  await withWorkspace(async (workspace) => {
    const runner = fakeRunner(({ command }) => {
      throw missingProgram(command);
    });

    const untrusted = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: false,
      jarPath: workspace.jarPath,
      ...hostOf(runner),
    });
    assert.equal(untrusted.diagrams[0]?.status, "unavailable");
    assert.match(untrusted.diagrams[0]?.message ?? "", /untrusted workspace/u);

    const unconfigured = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      ...hostOf(runner),
    });
    assert.equal(unconfigured.diagrams[0]?.status, "unavailable");
    assert.equal(runner.calls[0]?.command, "plantuml");
    assert.deepEqual(runner.calls[0]?.args, ["-pipe", "-tsvg"]);
    assert.match(unconfigured.diagrams[0]?.message ?? "", /not found on PATH/u);

    const invalid = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: "missing.jar",
      ...hostOf(runner),
    });
    assert.equal(invalid.diagrams[0]?.status, "error");
    assert.match(invalid.diagrams[0]?.message ?? "", /could not be found/u);
    assert.equal(runner.calls.length, 1, "a missing JAR is refused before any process starts");
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S3
test("a JAR path that is a folder is refused before any process starts", async () => {
  await withWorkspace(async (workspace) => {
    const runner = fakeRunner();
    const result = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: workspace.root,
      ...hostOf(runner),
    });
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagrams[0]?.message ?? "", /is not a file/u);
    assert.equal(runner.calls.length, 0);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089#S8
test("a host without a process runner reports the diagrams unavailable and starts nothing", async () => {
  await withWorkspace(async (workspace) => {
    const unconfigured = await renderPlantUmlDiagrams(diagramHtml(), {
      workspaceRoot: workspace.root,
      trusted: true,
      files: nodeFiles,
    });
    assert.equal(unconfigured.diagrams[0]?.status, "unavailable");
    assert.equal(unconfigured.diagrams[0]?.line, 7);
    assert.match(unconfigured.diagrams[0]?.message ?? "", /host that can run programs/u);
    assert.match(unconfigured.diagnostics[0]?.message ?? "", /built-in engine/u);

    const configured = await renderPlantUmlDiagrams(diagramHtml(), {
      files: nodeFiles,
      workspaceRoot: workspace.root,
      trusted: true,
      jarPath: workspace.jarPath,
    });
    assert.equal(configured.diagrams[0]?.status, "unavailable");
  });
});

test("returns diagnostics for PlantUML process failures and malformed output", async () => {
  await withWorkspace(async (workspace) => {
    const answers = [exited("", 1, "syntax error"), exited("not SVG"), { exitCode: null, stopped: false, stdout: "", stderr: "killed", signal: "SIGKILL" }];
    const runner = fakeRunner(() => answers.shift() ?? exited());

    const processFailure = await render(workspace, runner);
    assert.equal(processFailure.diagrams[0]?.status, "error");
    assert.match(processFailure.diagrams[0]?.message ?? "", /exited with code 1: syntax error/u);
    assert.equal(processFailure.diagnostics[0]?.severity, "warning");

    const malformed = await render(workspace, runner);
    assert.equal(malformed.diagrams[0]?.status, "error");
    assert.match(malformed.diagrams[0]?.message ?? "", /did not return SVG/u);

    const signalled = await render(workspace, runner);
    assert.match(signalled.diagrams[0]?.message ?? "", /exited with signal SIGKILL: killed/u);
  });
});

test("cancels an active PlantUML process", async () => {
  await withWorkspace(async (workspace) => {
    const controller = new AbortController();
    const runner = fakeRunner(({ options }) => {
      assert.equal(options.signal, controller.signal, "the runner receives the abort signal");
      controller.abort();
      return { exitCode: null, stopped: true, stdout: "", stderr: "" };
    });
    const result = await render(workspace, runner, { signal: controller.signal });
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagrams[0]?.message ?? "", /canceled/u);
  });
});

test("a render canceled before it starts runs no process", async () => {
  await withWorkspace(async (workspace) => {
    const controller = new AbortController();
    controller.abort();
    const runner = fakeRunner();
    const result = await render(workspace, runner, { signal: controller.signal });
    assert.match(result.diagrams[0]?.message ?? "", /canceled/u);
    assert.equal(runner.calls.length, 0);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097#S1
test("asks the runner to cap stderr at 64 KiB and notes the truncation it reports", async () => {
  await withWorkspace(async (workspace) => {
    const runner = fakeRunner(() => ({
      exitCode: 1,
      stopped: false,
      stdout: "",
      stderr: "E".repeat(64 * 1024),
      stderrTruncated: true,
    }));
    const message = (await render(workspace, runner)).diagnostics[0]?.message ?? "";
    assert.equal(runner.calls[0]?.options.maxStderrChars, 64 * 1024);
    assert.match(message, /\[stderr truncated at 64 KiB\]/u);
    assert.ok(message.includes("E".repeat(1000)));
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097#S1
test("a stderr within the cap carries no truncation note", async () => {
  await withWorkspace(async (workspace) => {
    const message = (await render(workspace, fakeRunner(() => exited("", 1, "boom")))).diagnostics[0]?.message ?? "";
    assert.match(message, /code 1: boom$/u);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-097#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-097#S3
test("asks the runner to stop a program past 8 MiB of SVG and reports the limit", async () => {
  await withWorkspace(async (workspace) => {
    // A host that enforces the cap stops the program and says so; the renderer reports the limit
    // even though the program also counts as stopped.
    const runner = fakeRunner(() => ({ exitCode: null, stopped: true, outputExceeded: true, stdout: "", stderr: "" }));
    const result = await render(workspace, runner);
    assert.equal(runner.calls[0]?.options.maxStdoutBytes, 8 * 1024 * 1024);
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagnostics[0]?.message ?? "", /exceeds the 8 MiB preview limit/u);
    assert.doesNotMatch(result.diagnostics[0]?.message ?? "", /did not finish/u);
  });
});

test("a program stopped at the timeout gives a clear diagnostic", async () => {
  assert.equal(PLANTUML_TIMEOUT_MS, 30_000);
  setPlantUmlTimeoutForTests(30);
  await withWorkspace(async (workspace) => {
    const runner = fakeRunner(() => ({ exitCode: null, stopped: true, stdout: "", stderr: "" }));
    const result = await render(workspace, runner);
    assert.equal(runner.calls[0]?.options.timeoutMs, 30);
    assert.equal(result.diagrams[0]?.status, "error");
    assert.match(result.diagnostics[0]?.message ?? "", /did not finish within 0\.03 s/u);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-084#S3
test("the JAR and the PATH command run under the allowlist security profile with a size limit", async () => {
  await withWorkspace(async (workspace) => {
    const runner = fakeRunner();
    await renderPlantUmlDiagrams(diagramHtml(), { jarPath: "plantuml.jar", workspaceRoot: workspace.root, trusted: true, ...hostOf(runner) });
    await renderPlantUmlDiagrams(diagramHtml(), { workspaceRoot: workspace.root, trusted: true, ...hostOf(runner) });
    assert.equal(runner.calls.length, 2);
    for (const call of runner.calls) {
      assert.equal(call.options.env?.PLANTUML_SECURITY_PROFILE, "ALLOWLIST");
      assert.equal(PLANTUML_SECURITY_PROFILE, "ALLOWLIST");
      assert.equal(call.options.env?.PLANTUML_LIMIT_SIZE, String(PLANTUML_LIMIT_SIZE));
      assert.equal(call.options.env?.PLANTUML_ALLOWLIST_PATH, workspace.root);
    }
    assert.deepEqual(runner.calls[0]?.args, [
      `-Dplantuml.allowlist.path=${workspace.root}`,
      `-DPLANTUML_LIMIT_SIZE=${PLANTUML_LIMIT_SIZE}`,
      "-jar", workspace.jarPath, "-pipe", "-tsvg",
    ]);
    assert.equal(runner.calls[0]?.command, await resolveJavaCommand(nodeFiles));
  });
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084#S2
// @tests_req SwRS-MDOKFSTUDIO-DIAG-084#S3
test("java is taken from JAVA_HOME when it holds a binary, else from the PATH", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "markdown-okf-java-home-"));
  // Below the working directory: a temporary folder on another Windows drive has no relative path.
  const relativeHome = fs.mkdtempSync(path.join("out", "markdown-okf-java-home-"));
  try {
    assert.equal(await resolveJavaCommand(nodeFiles, { JAVA_HOME: home }, "linux"), "java");
    for (const directory of [home, relativeHome]) {
      fs.mkdirSync(path.join(directory, "bin"));
      fs.writeFileSync(path.join(directory, "bin", "java"), "");
    }
    assert.equal(await resolveJavaCommand(nodeFiles, { JAVA_HOME: home }, "linux"), path.join(home, "bin", "java"));
    assert.equal(await resolveJavaCommand(nodeFiles, {}, "linux"), "java");
    assert.equal(await resolveJavaCommand(nodeFiles, { JAVA_HOME: relativeHome }, "linux"), "java");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(relativeHome, { recursive: true, force: true });
  }
});
