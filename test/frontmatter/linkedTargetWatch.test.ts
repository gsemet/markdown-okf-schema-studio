import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { watchLinkedTargetDirectly } from "../../src/frontmatter/linkedTargetWatch";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(predicate: () => boolean, timeoutMs = 3_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await delay(25);
  }
  return predicate();
}

async function fixture(): Promise<{ directory: string; target: string; sibling: string }> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "linked-target-watch-"));
  const target = path.join(directory, "target.md");
  const sibling = path.join(directory, "other.md");
  fs.writeFileSync(target, "---\ndescription: one\n---\n", "utf8");
  fs.writeFileSync(sibling, "other\n", "utf8");
  // Let the writes of the setup settle so that they are not reported to the watcher started next.
  await delay(200);
  return { directory, target, sibling };
}

test("a linked target written in place is reported by the direct watch, a sibling is not", async () => {
  const { directory, target, sibling } = await fixture();
  let events = 0;
  const dispose = watchLinkedTargetDirectly(target, () => { events += 1; });
  try {
    await delay(100);
    events = 0;
    fs.writeFileSync(sibling, "other changed\n", "utf8");
    await delay(400);
    assert.equal(events, 0, "a write to another file of the folder is not reported");
    fs.writeFileSync(target, "---\ndescription: two\n---\n", "utf8");
    assert.ok(await until(() => events > 0), "the in-place write of the target is reported");
  } finally {
    dispose();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("a linked target replaced by a rename (atomic save) is reported, and dispose stops the events", async () => {
  const { directory, target } = await fixture();
  let events = 0;
  const dispose = watchLinkedTargetDirectly(target, () => { events += 1; });
  try {
    await delay(100);
    events = 0;
    const temporary = path.join(directory, ".target.md.tmp");
    fs.writeFileSync(temporary, "---\ndescription: three\n---\n", "utf8");
    fs.renameSync(temporary, target);
    assert.ok(await until(() => events > 0), "the rename over the target is reported");
    dispose();
    await delay(200);
    const afterDispose = events;
    fs.writeFileSync(target, "---\ndescription: four\n---\n", "utf8");
    await delay(400);
    assert.equal(events, afterDispose, "no event after dispose");
  } finally {
    dispose();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("a folder that cannot be watched gives no events and does not throw", () => {
  const dispose = watchLinkedTargetDirectly(path.join(os.tmpdir(), "no-such-folder-linked-target", "x.md"), () => {
    assert.fail("no event expected");
  });
  dispose();
  dispose();
});
