/**
 * The {@link ProcessRunner} port on Node's `child_process`: the program runs without a shell, its
 * output is collected as UTF-8 text, and the timeout or the abort signal stops it.
 */

import * as childProcess from "node:child_process";

import type { ProcessOptions, ProcessResult, ProcessRunner } from "../host-api/processRunner";

/** A {@link ProcessRunner} that starts local programs. */
export function createNodeProcessRunner(): ProcessRunner {
  return {
    run(command: string, args: readonly string[], options: ProcessOptions = {}): Promise<ProcessResult> {
      return new Promise((resolve, reject) => {
        let child: childProcess.ChildProcess;
        try {
          child = childProcess.spawn(command, [...args], {
            cwd: options.cwd,
            env: options.env ? { ...process.env, ...options.env } : process.env,
            shell: false,
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
            // On POSIX the program leads its own process group, so stopping it also stops what a
            // wrapper script started (a launcher that leaves the JVM running).
            detached: process.platform !== "win32",
          });
        } catch (error) {
          reject(error);
          return;
        }
        let stdout = "";
        let stderr = "";
        let stopped = false;
        let outputExceeded = false;
        let stderrTruncated = false;
        let stdoutBytes = 0;
        let settled = false;
        const stop = (): void => {
          if (child.exitCode !== null || child.signalCode !== null) return;
          stopped = true;
          if (process.platform !== "win32" && child.pid !== undefined) {
            try {
              process.kill(-child.pid, "SIGTERM");
              return;
            } catch {
              // Fall back to stopping the direct child.
            }
          }
          child.kill();
        };
        const timer = options.timeoutMs !== undefined ? setTimeout(stop, options.timeoutMs) : undefined;
        const onAbort = (): void => stop();
        if (options.signal?.aborted) stop();
        options.signal?.addEventListener("abort", onAbort, { once: true });
        const finish = (action: () => void): void => {
          if (settled) return;
          settled = true;
          if (timer !== undefined) clearTimeout(timer);
          options.signal?.removeEventListener("abort", onAbort);
          action();
        };
        child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
          if (outputExceeded) return;
          stdoutBytes += Buffer.byteLength(chunk);
          if (options.maxStdoutBytes !== undefined && stdoutBytes > options.maxStdoutBytes) {
            // Past the cap nothing is kept: the program is stopped and the caller told.
            outputExceeded = true;
            stdout = "";
            stop();
            return;
          }
          stdout += chunk;
        });
        child.stderr?.setEncoding("utf8").on("data", (chunk: string) => {
          const room = options.maxStderrChars === undefined ? Infinity : options.maxStderrChars - stderr.length;
          if (chunk.length > room) {
            stderrTruncated = true;
            stderr += chunk.slice(0, Math.max(room, 0));
            return;
          }
          stderr += chunk;
        });
        child.on("error", (error) => finish(() => reject(error)));
        child.on("close", (exitCode, signal) => finish(() => resolve({
          exitCode,
          stopped,
          stdout,
          stderr,
          ...(signal ? { signal } : {}),
          ...(outputExceeded ? { outputExceeded } : {}),
          ...(stderrTruncated ? { stderrTruncated } : {}),
        })));
        child.stdin?.on("error", () => undefined);
        child.stdin?.end(options.input ?? "");
      });
    },
  };
}
