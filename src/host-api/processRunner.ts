/**
 * The `ProcessRunner` port: runs an external program (PlantUML on Java, Sphinx through `uv`).
 * Optional: a host that cannot start processes says so in its capabilities, and the features that
 * need one report it instead of failing.
 */

/** How to run a program. */
export interface ProcessOptions {
  /** Working directory (a file system path). */
  cwd?: string;
  /** Extra environment variables, on top of the host's environment. */
  env?: Record<string, string>;
  /** Text written to the program's standard input, which is then closed. */
  input?: string;
  /** Stops the program after this many milliseconds. */
  timeoutMs?: number;
  /** Stops the program when aborted. */
  signal?: AbortSignal;
}

/** How a program ended. */
export interface ProcessResult {
  /** The exit code; null when the program was stopped by a signal. */
  exitCode: number | null;
  /** True when the program was stopped by the timeout or the abort signal. */
  stopped: boolean;
  stdout: string;
  stderr: string;
}

/** Starts programs. */
export interface ProcessRunner {
  /** Runs `command` with `args` and resolves when it ended; rejects when it could not be started. */
  run(command: string, args: readonly string[], options?: ProcessOptions): Promise<ProcessResult>;
}
