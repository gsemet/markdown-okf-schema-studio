import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import { WorkspaceChoices } from "../../src/session/workspaceChoices";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-065
test("the comment author setting is read for the resource of the document, so a folder can override it", async () => {
  const resources: Array<string | undefined> = [];
  const host = {
    settings: {
      section: (_name: string, resource?: string) => {
        resources.push(resource);
        return { get: <T>(key: string, fallback: T): T => (key === "authorName" && resource === "file:///proj/a.md" ? "Folder Alias" as T : fallback) };
      },
    },
    vcs: { userName: () => Promise.resolve("Git Name") },
  } as unknown as HostServices;
  const choices = new WorkspaceChoices(host);
  choices.refreshThreadAuthor("file:///proj/a.md");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(resources, ["file:///proj/a.md"]);
  assert.equal(choices.threadAuthor, "Folder Alias");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-081
test("the closed warning banners of a session are bounded to the most recent documents", () => {
  const choices = new WorkspaceChoices({} as HostServices);
  const capacity = choices.dismissedWarningBanners.capacity;
  for (let index = 0; index < capacity + 50; index += 1) {
    choices.dismissedWarningBanners.set(`file:///w/doc${index}.md`, `key${index}`);
  }
  assert.equal(choices.dismissedWarningBanners.size, capacity);
  assert.equal(choices.dismissedWarningBanners.has("file:///w/doc0.md"), false, "the oldest dismissal is gone");
  assert.equal(choices.dismissedWarningBanners.get(`file:///w/doc${capacity + 49}.md`), `key${capacity + 49}`);
});
