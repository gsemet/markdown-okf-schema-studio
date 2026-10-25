import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createHeadBaseline, type GitExtensionLike } from "../../src/host-vscode/headBaseline";

interface FakeUri { scheme: string; fsPath: string }
const file = (fsPath: string): FakeUri => ({ scheme: "file", fsPath });

function fakeGit(options: { commit?: string; blob?: string | Error; repo?: boolean } = {}) {
  const shows: string[] = [];
  const listeners: Array<() => void> = [];
  const state = {
    HEAD: options.commit === undefined ? undefined : { commit: options.commit },
    onDidChange: (listener: () => void) => {
      listeners.push(listener);
      return { dispose: () => { listeners.splice(listeners.indexOf(listener), 1); } };
    },
  };
  const repository = {
    state,
    show: async (ref: string, fsPath: string) => {
      shows.push(`${ref}:${fsPath}`);
      if (options.blob instanceof Error) throw options.blob;
      return options.blob ?? "base\n";
    },
  };
  let activations = 0;
  const extension: GitExtensionLike<FakeUri> = {
    isActive: false,
    activate: async () => { activations += 1; extension.isActive = true; },
    exports: { getAPI: () => ({ getRepository: () => (options.repo === false ? null : repository) }) },
  };
  return { extension, shows, listeners, state, activations: () => activations };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-203
test("T16: no Git extension, no repository or a failing show give undefined", async () => {
  assert.equal(await createHeadBaseline<FakeUri>(() => undefined).read(file("/w/a.md"), 10), undefined);
  const noRepo = fakeGit({ commit: "c1", repo: false });
  assert.equal(await createHeadBaseline(() => noRepo.extension).read(file("/w/a.md"), 10), undefined);
  const untracked = fakeGit({ commit: "c1", blob: new Error("path does not exist in HEAD") });
  assert.equal(await createHeadBaseline(() => untracked.extension).read(file("/w/a.md"), 10), undefined);
  const noHead = fakeGit({});
  assert.equal(await createHeadBaseline(() => noHead.extension).read(file("/w/a.md"), 10), undefined);
});

test("T16: only file documents under 1 MB are compared, big blobs are skipped", async () => {
  const git = fakeGit({ commit: "c1" });
  const baseline = createHeadBaseline(() => git.extension);
  assert.equal(await baseline.read({ scheme: "untitled", fsPath: "/w/a.md" }, 10), undefined);
  assert.equal(await baseline.read(file("/w/a.md"), 1024 * 1024 + 1), undefined);
  assert.equal(git.shows.length, 0);
  const big = fakeGit({ commit: "c1", blob: "x".repeat(1024 * 1024 + 1) });
  assert.equal(await createHeadBaseline(() => big.extension).read(file("/w/a.md"), 10), undefined);
});

test("T16: the base is cached by path and commit, a new commit fetches again", async () => {
  const git = fakeGit({ commit: "c1", blob: "one\n" });
  const baseline = createHeadBaseline(() => git.extension);
  assert.deepEqual(await baseline.read(file("/w/a.md"), 10), { commit: "c1", text: "one\n" });
  await baseline.read(file("/w/a.md"), 10);
  assert.equal(git.shows.length, 1);
  assert.equal(git.activations(), 1);
  git.state.HEAD = { commit: "c2" };
  await baseline.read(file("/w/a.md"), 10);
  assert.equal(git.shows.length, 2);
  await baseline.read(file("/w/b.md"), 10);
  assert.equal(git.shows.length, 3);
});

test("T16: a state change with the same commit id does not notify, a new commit does", () => {
  const git = fakeGit({ commit: "c1" });
  git.extension.isActive = true;
  const baseline = createHeadBaseline(() => git.extension);
  const seen: Array<string | undefined> = [];
  const subscription = baseline.watch(file("/w/a.md"), (commit) => seen.push(commit));
  assert.ok(subscription);
  git.listeners.forEach((listener) => listener());
  assert.deepEqual(seen, []);
  git.state.HEAD = { commit: "c2" };
  git.listeners.forEach((listener) => listener());
  git.listeners.forEach((listener) => listener());
  assert.deepEqual(seen, ["c2"]);
  subscription.dispose();
  assert.equal(git.listeners.length, 0);
});

test("T16: watch gives nothing without the extension, a repository or an active API", () => {
  assert.equal(createHeadBaseline<FakeUri>(() => undefined).watch(file("/w/a.md"), () => undefined), undefined);
  const noRepo = fakeGit({ repo: false });
  assert.equal(createHeadBaseline(() => noRepo.extension).watch(file("/w/a.md"), () => undefined), undefined);
});
