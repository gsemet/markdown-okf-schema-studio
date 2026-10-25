/**
 * The pasted-image write of the host request controller (`src/session/features/hostRequests.ts`).
 * CI run 40016132398 read an empty `image.png`: a host's `writeFile` creates the file before it
 * writes its bytes (VS Code's disk provider opens it with `w`, then writes), so the chosen name was
 * visible empty while the write ran, and stayed empty or partial when the write failed. The file
 * system here writes the same way, in two steps, and records what the folder shows in between.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { FileSystem } from "../../src/host-api/fileSystem";
import { createMemoryFileSystem } from "../../src/host-memory/memoryFileSystem";
import { HostRequestController } from "../../src/session/features/hostRequests";
import type { PageMessageRouter } from "../../src/session/pageMessages";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const FOLDER = "/ws/docs";
/** A 1x1 transparent PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

interface Harness {
  files: FileSystem;
  /** `name (size)` of every visible image file of the folder, seen while a write was half done. */
  seenMidWrite: string[];
  paste(): Promise<Record<string, unknown> | undefined>;
  images(): Promise<string[]>;
}

/**
 * A controller over an in-memory folder whose `writeFile` first creates the file empty, lets the
 * event loop run (where a reader looks at the folder), then writes the bytes, or fails when
 * `failWrite` is set, like a full disk.
 */
function harness(options: { failWrite?: boolean; beforeWrite?: (files: FileSystem) => Promise<void> } = {}): Harness {
  const memory = createMemoryFileSystem();
  memory.addFile(`${FOLDER}/chapter.md`, "# Chapter\n");
  const seenMidWrite: string[] = [];
  const images = async (): Promise<string[]> => (await memory.readDirectory(FOLDER))
    .map(([name]) => name).filter((name) => name !== "chapter.md").sort();
  let beforeWrite = options.beforeWrite;
  const files: FileSystem = {
    ...memory,
    async writeFile(target, data) {
      if (beforeWrite) {
        const step = beforeWrite;
        beforeWrite = undefined;
        await step(memory);
      }
      await memory.writeFile(target, new Uint8Array());
      await Promise.resolve();
      for (const name of await images()) {
        if (!name.startsWith(".")) seenMidWrite.push(`${name} (${(await memory.stat(`${FOLDER}/${name}`)).size})`);
      }
      if (options.failWrite) throw Object.assign(new Error("ENOSPC: no space left on device"), { code: "ENOSPC" });
      await memory.writeFile(target, data);
    },
  };
  const manager = {
    host: { files, workspace: { folderOf: () => ({ path: "/ws" }) }, ui: {} },
    canonicalPath: (value: string) => value,
  } as unknown as PreviewManager;
  const handlers = new Map<string, (message: unknown, preview: PreviewSession) => unknown>();
  const router = { on: (type: string, handler: never) => handlers.set(type, handler) } as unknown as PageMessageRouter;
  new HostRequestController(manager).register(router);
  const posted: Array<Record<string, unknown>> = [];
  const preview = {
    readOnly: false,
    documentUri: "file:///ws/docs/chapter.md",
    document: { id: "file:///ws/docs/chapter.md", path: `${FOLDER}/chapter.md` },
    postToPage: (message: Record<string, unknown>) => {
      posted.push(message);
      return Promise.resolve(true);
    },
  } as unknown as PreviewSession;
  let count = 0;
  return {
    files: memory,
    seenMidWrite,
    images,
    async paste() {
      count += 1;
      const editId = `paste-${count}`;
      await handlers.get("previewPasteImage")!({
        type: "previewPasteImage", documentId: preview.documentUri, revision: 1, requestId: 1, editId,
        mime: "image/png", dataBase64: PNG.toString("base64"),
      }, preview);
      return posted.find((message) => message.editId === editId);
    },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196
test("a pasted image never shows under its name before all its bytes are written", async () => {
  const { files, seenMidWrite, paste, images } = harness();
  const result = await paste();
  assert.deepEqual(result?.ok, true, `host answer: ${JSON.stringify(result)}`);
  assert.equal(result?.fileName, "image.png");
  assert.deepEqual(seenMidWrite, [], "while the bytes were written, the folder showed these images");
  assert.deepEqual(await images(), ["image.png"], "nothing but the image is left in the folder");
  assert.deepEqual(Buffer.from(await files.readFile(`${FOLDER}/image.png`)), PNG);
});

test("a failed write leaves no file, empty or partial, and the page gets the reason", async () => {
  const { paste, images } = harness({ failWrite: true });
  const result = await paste();
  assert.equal(result?.ok, false, `host answer: ${JSON.stringify(result)}`);
  assert.match(String(result?.reason), /ENOSPC/u);
  assert.deepEqual(await images(), [], "the folder keeps no file of the failed paste");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196
test("a file created under the chosen name during the write is kept and the paste takes the next name", async () => {
  const other = new TextEncoder().encode("written by someone else");
  const { files, paste, images } = harness({
    beforeWrite: (memory) => memory.writeFile(`${FOLDER}/image.png`, other),
  });
  const result = await paste();
  assert.equal(result?.ok, true, `host answer: ${JSON.stringify(result)}`);
  assert.equal(result?.fileName, "image-1.png");
  assert.deepEqual(await files.readFile(`${FOLDER}/image.png`), other, "the other writer's file is unchanged");
  assert.deepEqual(Buffer.from(await files.readFile(`${FOLDER}/image-1.png`)), PNG);
  assert.deepEqual(await images(), ["image-1.png", "image.png"], "the hidden file of the paste is removed");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196
test("the next paste removes old hidden partial files of its own naming and nothing else", async () => {
  const old = Date.now() - 60 * 60 * 1000;
  const { files, paste, images } = harness();
  const memory = files as unknown as { addFile(path: string, text: string, mtimeMs?: number): void };
  const staleOurs = [".image.png.k3j9x0ab.partial", ".image-12.webp.0a.partial"];
  const keep = [
    ".image.png.zz9.partial", // ours but recent: another paste may still be writing it
    ".notes.txt.k3j9x0ab.partial", // not an image name of ours
    "image.png.k3j9x0ab.partial", // not hidden
    ".image.png.K3J9X0AB.partial", // wrong alphabet
    "old.png", // an ordinary old file
  ];
  for (const name of [...staleOurs, ...keep]) memory.addFile(`${FOLDER}/${name}`, "x", name === keep[0] ? Date.now() : old);
  const result = await paste();
  assert.equal(result?.ok, true, `host answer: ${JSON.stringify(result)}`);
  assert.deepEqual(await images(), [...keep, "image.png"].sort());
});
