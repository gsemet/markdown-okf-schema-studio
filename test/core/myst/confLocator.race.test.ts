import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { createConfLocator } from "../../../src/core/myst/confLocator";

const ROOT = path.resolve("/project");
const CONF_PATH = path.join(ROOT, "docs", "conf.py");
const DOCUMENT = path.join(ROOT, "docs", "a.md");
const textOf = (extension: string) => `extensions = ['myst_parser']\nmyst_enable_extensions = ['${extension}']\n`;

// @tests_req SwRS-MDOKFSTUDIO-MYST-066
test("an invalidation during a lookup in flight stores nothing stale: the next lookup reads the file again", async () => {
  let text = textOf("deflist");
  let reads = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const locator = createConfLocator({
    files: {
      stat: async (file) => {
        if (file !== CONF_PATH) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        return { kind: "file", mtimeMs: 1, size: text.length };
      },
      readFile: async () => {
        reads += 1;
        const answer = new TextEncoder().encode(text);
        if (reads === 1) await gate;
        return answer;
      },
    },
  });
  const inFlight = locator.enabledMystExtensions(DOCUMENT, ROOT);
  await new Promise<void>((resolve) => setImmediate(resolve));
  // The file changes and the host invalidates while the first read is still waiting.
  text = textOf("colon_fence");
  locator.invalidate();
  release!();
  assert.deepEqual([...(await inFlight) ?? []], ["deflist"], "the lookup in flight answers with what it read");
  assert.deepEqual([...(await locator.enabledMystExtensions(DOCUMENT, ROOT)) ?? []], ["colon_fence"],
    "its answer was not kept: the next lookup reads the new file");
  assert.equal(reads, 2);
});
