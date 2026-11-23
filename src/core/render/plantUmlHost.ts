/**
 * What the PlantUML renderer needs from its host: to run a program and to read file metadata.
 * `core` imports no other layer, so it declares these shapes itself; the `ProcessRunner` and
 * `FileSystem` ports of `src/host-api/` satisfy them as they are.
 */

/** How to run a program (the part of `ProcessOptions` the renderer sets). */
export interface PlantUmlRunOptions {
  cwd?: string;
  env?: Record<string, string>;
  input?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** The host stops the program when it writes more standard output than this many bytes. */
  maxStdoutBytes?: number;
  /** The host keeps only this many characters of standard error. */
  maxStderrChars?: number;
}

/** How a program ended (the part of `ProcessResult` the renderer reads). */
export interface PlantUmlRunResult {
  exitCode: number | null;
  /** True when the program was stopped by the timeout or the abort signal. */
  stopped: boolean;
  stdout: string;
  stderr: string;
  /** The name of the signal that ended the program, when the host reports it. */
  signal?: string;
  /** True when the program was stopped for writing more than `maxStdoutBytes`. */
  outputExceeded?: boolean;
  /** True when `stderr` was cut at `maxStderrChars`. */
  stderrTruncated?: boolean;
}

/** Runs the jar or the executable; rejects when the program could not be started. */
export interface PlantUmlProcesses {
  run(command: string, args: readonly string[], options?: PlantUmlRunOptions): Promise<PlantUmlRunResult>;
}

/** The metadata of a path; rejects when it does not exist. */
export interface PlantUmlFiles {
  stat(path: string): Promise<{ kind: "file" | "directory" | "other"; size: number; mtimeMs?: number }>;
}
