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
  /** True when the path itself is a symbolic link (not followed); false when it does not exist. */
  isSymbolicLink(path: string): Promise<boolean>;
  /** Moves `from` onto `to`, replacing `to` itself (never what a link at `to` points to). */
  rename(from: string, to: string): Promise<void>;
  /** Deletes a file; used to drop a temporary file after a failed write. */
  remove(path: string): Promise<void>;
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

/** Writes a temporary file next to `path`, then renames it onto `path`: readers never see a partial file. */
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-054
async function writeAtomically(io: CommentFileIo, path: string, text: string): Promise<void> {
  const temporary = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await io.write(temporary, text);
    await io.rename(temporary, path);
  } catch (error) {
    await io.remove(temporary).catch(() => undefined);
    throw error;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-054
export function createCommentStore(io: CommentFileIo): {
  /** `renameDocument` stores `documentName` in the file even when the file already names another. */
  update(
    path: string,
    documentName: string,
    change: CommentChange,
    options?: { renameDocument?: boolean },
  ): Promise<CommentUpdateResult>;
} {
  const queues = new Map<string, Promise<unknown>>();

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-004
  const step = async (
    path: string,
    documentName: string,
    change: CommentChange,
    renameDocument: boolean,
  ): Promise<CommentUpdateResult> => {
    try {
      if (await io.isSymbolicLink(path)) {
        return { ok: false, reason: "the comments file is a symbolic link and is left untouched" };
      }
      const existing = await io.read(path);
      let threads: CommentThread[] = [];
      let document = documentName;
      if (existing !== undefined) {
        const parsed = parseSidecar(existing);
        if (parsed.errors.length > 0) {
          return { ok: false, reason: `the comments file is not valid (${parsed.errors[0]}) and is left untouched` };
        }
        threads = parsed.threads;
        if (!renameDocument) document = parsed.document;
      }
      const next = change(threads);
      if (typeof next === "string") return { ok: false, reason: next };
      const text = serializeSidecar({ document, threads: next });
      if (new TextEncoder().encode(text).length > MAX_SIDECAR_BYTES) {
        return { ok: false, reason: "the comments file would become too large" };
      }
      await writeAtomically(io, path, text);
      return { ok: true, text, hash: hashText(text) };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    update(path, documentName, change, options) {
      const run = (queues.get(path) ?? Promise.resolve())
        .then(() => step(path, documentName, change, options?.renameDocument === true));
      const tail = run.then(() => undefined);
      queues.set(path, tail);
      void tail.then(() => {
        if (queues.get(path) === tail) queues.delete(path);
      });
      return run;
    },
  };
}
