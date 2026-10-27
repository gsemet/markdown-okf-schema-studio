import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { findEscapingPlantUmlInclude } from "../../../src/core/render/plantUmlIncludes";
import {
  renderPlantUmlDiagrams,
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../../src/core/render/plantUmlRenderer";

interface Fixture {
  parent: string;
  root: string;
  sibling: string;
}

/** `<parent>/ws` is the workspace; `<parent>/ws-secret` shares its name prefix. */
function createFixture(): Fixture {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "markdown-okf-jar-include-")));
  const root = path.join(parent, "ws");
  const sibling = path.join(parent, "ws-secret");
  fs.mkdirSync(path.join(root, "sub"), { recursive: true });
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(root, "inside.puml"), "A -> B\n");
  fs.writeFileSync(path.join(sibling, "secret.puml"), "S -> T\n");
  fs.writeFileSync(path.join(parent, "outside.puml"), "O -> P\n");
  return { parent, root, sibling };
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("includes inside the workspace folder are accepted", () => {
  const { parent, root } = createFixture();
  try {
    const source = [
      "@startuml",
      "!include inside.puml",
      "!include ./sub/../inside.puml",
      "!include_once \"inside.puml\"",
      `!include ${path.join(root, "inside.puml")}`,
      "!include missing.puml",
      "!include <C4/C4_Context>",
      "!include https://example.test/x.puml",
      "@enduml",
    ].join("\n");
    assert.equal(findEscapingPlantUmlInclude(source, root), undefined);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("an include that leaves the workspace through parent segments is refused", () => {
  const { parent, root } = createFixture();
  try {
    for (const line of [
      "!include ../outside.puml",
      "!include sub/../../outside.puml",
      "!includesub ../outside.puml!PART",
      "!include_many \"../ws-secret/secret.puml\"",
    ]) {
      const refusal = findEscapingPlantUmlInclude(`@startuml\n${line}\n@enduml`, root);
      assert.match(refusal ?? "", /outside the workspace folder/u, line);
    }
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("an absolute path into a sibling folder sharing the workspace name prefix is refused", () => {
  const { parent, root, sibling } = createFixture();
  try {
    const refusal = findEscapingPlantUmlInclude(
      `@startuml\n!include ${path.join(sibling, "secret.puml")}\n@enduml`,
      root,
    );
    assert.match(refusal ?? "", /outside the workspace folder/u);
    assert.match(
      findEscapingPlantUmlInclude(`!include ${path.join(parent, "outside.puml")}`, root) ?? "",
      /outside/u,
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("a symlink inside the workspace that points out of it is refused", () => {
  const { parent, root, sibling } = createFixture();
  try {
    fs.symlinkSync(sibling, path.join(root, "link"));
    assert.match(
      findEscapingPlantUmlInclude("!include link/secret.puml", root) ?? "",
      /outside the workspace folder/u,
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("a nested include and a computed include path are checked too", () => {
  const { parent, root } = createFixture();
  try {
    fs.writeFileSync(path.join(root, "sub", "nested.puml"), "!include ../../outside.puml\n");
    assert.match(
      findEscapingPlantUmlInclude("!include sub/nested.puml", root) ?? "",
      /outside the workspace folder/u,
    );
    assert.match(findEscapingPlantUmlInclude("!include $path", root) ?? "", /computed/u);
    assert.match(findEscapingPlantUmlInclude("!include %getenv(\"HOME\")", root) ?? "", /computed/u);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-084
test("a diagram whose include leaves the workspace shows a message and starts no process", async () => {
  const { parent, root, sibling } = createFixture();
  let spawned = 0;
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      spawned += 1;
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: Object.assign(new EventEmitter(), { end: (): void => undefined }),
        kill: (): boolean => true,
      });
      process.nextTick(() => {
        child.stdout.emit("data", "<svg></svg>");
        child.emit("close", 0, null);
      });
      return child as never;
    }) as never,
  });
  try {
    const html = (source: string): string =>
      `<div class="myst-plantuml-diagram" data-line="3">${source}</div>`;
    const bad = await renderPlantUmlDiagrams(
      html(`@startuml\n!include ${path.join(sibling, "secret.puml")}\n@enduml`),
      { workspaceRoot: root, trusted: true },
    );
    assert.equal(bad.diagrams[0]?.status, "error");
    assert.match(bad.diagrams[0]?.message ?? "", /outside the workspace folder/u);
    assert.match(bad.diagnostics[0]?.message ?? "", /outside the workspace folder/u);
    const climb = await renderPlantUmlDiagrams(
      html("@startuml\n!include ../outside.puml\n@enduml"),
      { workspaceRoot: root, trusted: true },
    );
    assert.equal(climb.diagrams[0]?.status, "error");
    assert.equal(spawned, 0);
    const good = await renderPlantUmlDiagrams(
      html("@startuml\n!include inside.puml\n@enduml"),
      { workspaceRoot: root, trusted: true },
    );
    assert.equal(good.diagrams[0]?.status, "rendered");
    assert.equal(spawned, 1);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
