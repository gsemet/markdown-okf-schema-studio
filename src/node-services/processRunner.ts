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
          });
        } catch (error) {
          reject(error);
          return;
        }
        let stdout = "";
        let stderr = "";
        let stopped = false;
        let settled = false;
        const stop = (): void => {
          if (child.exitCode !== null || child.signalCode !== null) return;
          stopped = true;
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
          stdout += chunk;
        });
        child.stderr?.setEncoding("utf8").on("data", (chunk: string) => {
          stderr += chunk;
        });
        child.on("error", (error) => finish(() => reject(error)));
        child.on("close", (exitCode) => finish(() => resolve({ exitCode, stopped, stdout, stderr })));
        child.stdin?.on("error", () => undefined);
        child.stdin?.end(options.input ?? "");
      });
    },
  };
}
