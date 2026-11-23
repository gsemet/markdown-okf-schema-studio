/** Fakes of the ProcessRunner and FileSystem ports for the PlantUML renderer tests. */
import type { ProcessOptions, ProcessResult, ProcessRunner } from "../../../src/host-api/processRunner";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

export const TINY_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>";

/** The files the renderer reads: the local disk, through the Node file system port. */
export const nodeFiles = createNodeFileSystem();

export interface RunCall {
  command: string;
  args: readonly string[];
  options: ProcessOptions;
}

export type FakeProcessRunner = ProcessRunner & { calls: RunCall[] };

/** A program that ended with exit code 0 and `stdout`. */
export function exited(stdout: string = TINY_SVG, exitCode: number | null = 0, stderr = ""): ProcessResult {
  return { exitCode, stopped: false, stdout, stderr };
}

/** What a conforming runner does with the output caps of `options`. */
function applyCaps(result: ProcessResult, options: ProcessOptions): ProcessResult {
  let capped = result;
  if (options.maxStdoutBytes !== undefined && Buffer.byteLength(result.stdout) > options.maxStdoutBytes) {
    capped = { ...capped, exitCode: null, stopped: true, stdout: "", outputExceeded: true };
  }
  if (options.maxStderrChars !== undefined && result.stderr.length > options.maxStderrChars) {
    capped = { ...capped, stderr: result.stderr.slice(0, options.maxStderrChars), stderrTruncated: true };
  }
  return capped;
}

/** A ProcessRunner whose programs are answered by `handler`; the calls are recorded. */
export function fakeRunner(
  handler: (call: RunCall) => ProcessResult | Promise<ProcessResult> = () => exited(),
): FakeProcessRunner {
  const calls: RunCall[] = [];
  return {
    calls,
    run(command, args, options = {}) {
      const call = { command, args, options };
      calls.push(call);
      try {
        return Promise.resolve(handler(call)).then((result) => applyCaps(result, options));
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
}

/** The error a ProcessRunner rejects with when the program does not exist. */
export function missingProgram(command: string): Error {
  return Object.assign(new Error(`spawn ${command} ENOENT`), { code: "ENOENT" });
}

/** Renderer options that route the work through `runner` and the local disk. */
export function hostOf(runner: ProcessRunner): { processes: ProcessRunner; files: typeof nodeFiles } {
  return { processes: runner, files: nodeFiles };
}
