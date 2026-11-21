import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { createConfLocator } from "../../../src/core/myst/confLocator";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.
// The disk is replaced by a map of files and a clock, so every step is exact.

const ROOT = path.resolve("/project");
const CONF_PATH = path.join(ROOT, "docs", "conf.py");
const confText = (...extensions: string[]) =>
  `extensions = ['myst_parser']\nmyst_enable_extensions = [${extensions.map((name) => `'${name}'`).join(", ")}]\n`;

interface Disk {
  files: Map<string, { mtimeMs: number; size: number; text: string }>;
  now: number;
  reads: number;
  stats: number;
}

function virtualLocator() {
  const disk: Disk = { files: new Map(), now: 0, reads: 0, stats: 0 };
  const locator = createConfLocator({
    now: () => disk.now,
    statFile: (file) => {
      disk.stats += 1;
      const entry = disk.files.get(file);
      return entry ? { mtimeMs: entry.mtimeMs, size: entry.size } : undefined;
    },
    readFile: (file) => {
      disk.reads += 1;
      const entry = disk.files.get(file);
      if (!entry) throw new Error("gone");
      return entry.text;
    },
  });
  const put = (text: string, mtimeMs: number, size = text.length) => disk.files.set(CONF_PATH, { mtimeMs, size, text });
  return { disk, locator, put };
}

const documentIn = (...segments: string[]) => path.join(ROOT, "docs", ...segments, "a.md");

// @tests_req SwRS-MDOKFSTUDIO-MYST-066
test("an answer is trusted for fewer than 2000 ms, and the disk is checked again at exactly 2000 ms", () => {
  const { disk, locator, put } = virtualLocator();
  put(confText("deflist"), 1);
  const document = documentIn();
  assert.deepEqual([...locator.enabledMystExtensions(document, ROOT) ?? []], ["deflist"]);
  const statsAfterFirst = disk.stats;
  disk.now = 1999;
  locator.enabledMystExtensions(document, ROOT);
  assert.equal(disk.stats, statsAfterFirst, "inside the interval nothing is checked");
  disk.now = 2000;
  locator.enabledMystExtensions(document, ROOT);
  assert.ok(disk.stats > statsAfterFirst, "at the interval the file is checked again");
  const statsAfterRecheck = disk.stats;
  disk.now = 2001;
  locator.locate(document, ROOT);
  assert.equal(disk.stats, statsAfterRecheck, "the new check restarts the interval for the folder");
  disk.now = 4000;
  locator.locate(document, ROOT);
  assert.ok(disk.stats > statsAfterRecheck);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-066
test("a conf.py is parsed again when its modification time or its size changes, and only then", () => {
  const { disk, locator, put } = virtualLocator();
  const document = documentIn();
  put(confText("deflist"), 10, 100);
  assert.deepEqual([...locator.enabledMystExtensions(document, ROOT) ?? []], ["deflist"]);
  assert.equal(disk.reads, 1);
  put(confText("colon_fence"), 20, 100);
  disk.now += 5000;
  assert.deepEqual([...locator.enabledMystExtensions(document, ROOT) ?? []], ["colon_fence"], "a new time, the same size");
  assert.equal(disk.reads, 2);
  put(confText("dollarmath"), 20, 101);
  disk.now += 5000;
  assert.deepEqual([...locator.enabledMystExtensions(document, ROOT) ?? []], ["dollarmath"], "the same time, a new size");
  assert.equal(disk.reads, 3);
  disk.now += 5000;
  locator.enabledMystExtensions(document, ROOT);
  assert.equal(disk.reads, 3, "nothing changed");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-066
test("a conf.py that disappears is forgotten, so one that comes back is read again even with the same time and size", () => {
  const { disk, locator, put } = virtualLocator();
  put(confText("deflist"), 10, 50);
  assert.deepEqual([...locator.enabledMystExtensions(documentIn("a"), ROOT) ?? []], ["deflist"]);
  disk.now = 1500;
  locator.enabledMystExtensions(documentIn("b"), ROOT);
  disk.now = 2500;
  disk.files.clear();
  assert.equal(locator.enabledMystExtensions(documentIn("b"), ROOT), undefined, "the file is gone");
  put(confText("colon_fence"), 10, 50);
  disk.now = 2600;
  assert.deepEqual([...locator.enabledMystExtensions(documentIn("b"), ROOT) ?? []], ["colon_fence"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-066
test("a conf.py that cannot be read gives no set, and does not stop other lookups", () => {
  const { disk, locator, put } = virtualLocator();
  disk.files.set(CONF_PATH, { mtimeMs: 1, size: 5, text: "" });
  const failing = createConfLocator({
    now: () => disk.now,
    statFile: () => ({ mtimeMs: 1, size: 5 }),
    readFile: () => { throw new Error("EACCES"); },
  });
  assert.equal(failing.enabledMystExtensions(documentIn(), ROOT), undefined);
  assert.equal(failing.locate(documentIn(), ROOT), CONF_PATH, "it is still the governing conf.py");
  put(confText("deflist"), 2);
  assert.deepEqual([...locator.enabledMystExtensions(documentIn(), ROOT) ?? []], ["deflist"]);
});
