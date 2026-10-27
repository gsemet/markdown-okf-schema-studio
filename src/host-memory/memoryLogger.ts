/** The memory host's `Logger`: keeps every entry in a list for a test to read. */

import type { Logger } from "../host-api/logger";

/** One line a memory logger received. */
export interface MemoryLogEntry {
  readonly level: "error" | "warn" | "info";
  readonly message: string;
  /** The error given with an `error` entry. */
  readonly error?: unknown;
}

/** A `Logger` that records what it is given. */
export interface MemoryLogger extends Logger {
  readonly entries: readonly MemoryLogEntry[];
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-002
/** Creates an empty memory logger. */
export function createMemoryLogger(): MemoryLogger {
  const entries: MemoryLogEntry[] = [];
  return {
    entries,
    error: (message, error) => void entries.push({ level: "error", message, error }),
    warn: (message) => void entries.push({ level: "warn", message }),
    info: (message) => void entries.push({ level: "info", message }),
  };
}
