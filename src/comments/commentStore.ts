/**
 * The host side of writing review comments (T43). No `vscode` import: the file access is passed in,
 * so the queue is tested with an in-memory file system.
 *
 * Every change of a sidecar goes through `update`: one queue per file path runs the steps one after
 * another, each reading the LATEST file, applying the change, serializing and writing. Two quick
 * creates therefore both land. An invalid existing file is never overwritten.
 */

import { createHash, randomBytes } from "node:crypto";

import { MAX_SIDECAR_BYTES, parseSidecar, serializeSidecar, type CommentThread } from "./commentModel";

export interface CommentFileIo {
  /** The text of the file; undefined when it does not exist. */
  read(path: string): Promise<string | undefined>;
  write(path: string, text: string): Promise<void>;
}

export type CommentUpdateResult =
  | { ok: true; text: string; hash: string }
  | { ok: false; reason: string };

/** A change returns the new threads, or a string: the reason for refusing. */
export type CommentChange = (threads: CommentThread[]) => CommentThread[] | string;

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** `t_` or `c_` and 8 hex characters from 4 random bytes. */
export function formatId(prefix: "t_" | "c_", bytes: Uint8Array): string {
  return prefix + Array.from(bytes.slice(0, 4), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newId(prefix: "t_" | "c_"): string {
  return formatId(prefix, randomBytes(4));
}

export function createCommentStore(io: CommentFileIo): {
  update(path: string, documentName: string, change: CommentChange): Promise<CommentUpdateResult>;
} {
  const queues = new Map<string, Promise<unknown>>();

  const step = async (path: string, documentName: string, change: CommentChange): Promise<CommentUpdateResult> => {
    try {
      const existing = await io.read(path);
      let threads: CommentThread[] = [];
      let document = documentName;
      if (existing !== undefined) {
        const parsed = parseSidecar(existing);
        if (parsed.errors.length > 0) {
          return { ok: false, reason: `the comments file is not valid (${parsed.errors[0]}) and is left untouched` };
        }
        threads = parsed.threads;
        document = parsed.document;
      }
      const next = change(threads);
      if (typeof next === "string") return { ok: false, reason: next };
      const text = serializeSidecar({ document, threads: next });
      if (new TextEncoder().encode(text).length > MAX_SIDECAR_BYTES) {
        return { ok: false, reason: "the comments file would become too large" };
      }
      await io.write(path, text);
      return { ok: true, text, hash: hashText(text) };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    update(path, documentName, change) {
      const run = (queues.get(path) ?? Promise.resolve()).then(() => step(path, documentName, change));
      const tail = run.then(() => undefined);
      queues.set(path, tail);
      void tail.then(() => {
        if (queues.get(path) === tail) queues.delete(path);
      });
      return run;
    },
  };
}
