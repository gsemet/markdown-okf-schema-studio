import * as path from "../path/hostPath";

import { parse, serialize } from "parse5";

import type { PlantUmlFiles, PlantUmlProcesses } from "./plantUmlHost";
import type { RenderDiagnostic } from "./mystRenderer";
import type { PolicyFiles } from "../security/resource-policy";
import { findEscapingPlantUmlInclude } from "./plantUmlIncludes";
import { MAX_PLANTUML_SOURCE_LENGTH } from "./plantUmlLimits";

const MAX_PLANTUML_OUTPUT_LENGTH = 8 * 1024 * 1024;
const MAX_PLANTUML_STDERR_LENGTH = 64 * 1024;
export const PLANTUML_TIMEOUT_MS = 30_000;
// Strictest PlantUML profile that still reads local `!include` files; the allowlist path is the
// workspace root. PlantUML's own check does not fully confine includes, so the extension
// refuses a diagram whose includes leave the root before the process starts (plantUmlIncludes).
export const PLANTUML_SECURITY_PROFILE = "ALLOWLIST";
export const PLANTUML_LIMIT_SIZE = 4096;

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  nodeName: string;
  tagName?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
  value?: string;
}

interface PlantUmlSource {
  source: string;
  line?: number;
}

export interface PlantUmlDiagramRender {
  status: "rendered" | "unavailable" | "error";
  message?: string;
  svg?: string;
  line?: number;
}

export interface PlantUmlRenderResult {
  diagrams: readonly PlantUmlDiagramRender[];
  diagnostics: RenderDiagnostic[];
}

export interface PlantUmlRenderOptions {
  jarPath?: string;
  executablePath?: string;
  workspaceRoot: string;
  trusted: boolean;
  /** Reads the files a diagram includes and the jar's metadata and the Java home (`stat`). */
  files: PolicyFiles & PlantUmlFiles;
  signal?: AbortSignal;
  /**
   * Runs the jar or the executable. Absent: the host cannot start programs (`capabilities.processes`
   * is false) and the diagrams are reported unavailable; the host then draws them with the built-in
   * engine (see `PlantUmlController.engineFor`).
   */
  processes?: PlantUmlProcesses;
}

// A render that finished is reused for the same source under the same invocation, so editing
// another part of the page does not start a JVM per unchanged diagram.
export const PLANTUML_MAX_CONCURRENT_RENDERS = 2;
const PLANTUML_CACHE_MAX_ENTRIES = 64;
const svgCache = new Map<string, string>();
// Diagram text that reads files or the environment can change output without changing the text.
const UNCACHEABLE_SOURCE = /!(?:include|import|theme|pragma)|%(?:getenv|load_json|date|now|random|file_exists|dirpath|filename)/iu;

export function clearPlantUmlCacheForTests(): void {
  svgCache.clear();
}

export function plantUmlCacheSizeForTests(): number {
  return svgCache.size;
}

// The JAR identity (size and mtime) joins the key so replacing the JAR invalidates its entries.
async function jarIdentityOf(files: PlantUmlFiles, jarPath: string | undefined): Promise<string | undefined> {
  if (jarPath === undefined) {
    return "";
  }
  try {
    const stat = await files.stat(jarPath);
    return `${stat.size}:${stat.mtimeMs ?? ""}`;
  } catch {
    return undefined;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-009
function cacheKey(
  source: string,
  command: string,
  args: readonly string[],
  workspaceRoot: string,
  jarIdentity: string | undefined,
): string | undefined {
  if (UNCACHEABLE_SOURCE.test(source) || jarIdentity === undefined) {
    return undefined;
  }
  // The whole tuple is the key (no digest), so a hash collision can never serve another diagram.
  return JSON.stringify([command, args, workspaceRoot, PLANTUML_SECURITY_PROFILE, jarIdentity, source]);
}

function cacheStore(key: string, svg: string): void {
  svgCache.delete(key);
  svgCache.set(key, svg);
  while (svgCache.size > PLANTUML_CACHE_MAX_ENTRIES) {
    const oldest = svgCache.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    svgCache.delete(oldest);
  }
}

let activeRenders = 0;
const renderWaiters: Array<() => void> = [];

// @implements_req SwRS-MDOKFSTUDIO-DIAG-084
// Returns undefined when a slot was taken at once, so the process starts in the same tick.
function acquireRenderSlot(signal: AbortSignal | undefined): Promise<void> | undefined {
  if (activeRenders < PLANTUML_MAX_CONCURRENT_RENDERS) {
    activeRenders += 1;
    return undefined;
  }
  return new Promise<void>((resolve, reject) => {
    const waiter = (): void => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = (): void => {
      const index = renderWaiters.indexOf(waiter);
      if (index >= 0) {
        renderWaiters.splice(index, 1);
      }
      reject(new Error("PlantUML rendering was canceled."));
    };
    renderWaiters.push(waiter);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function releaseRenderSlot(): void {
  const next = renderWaiters.shift();
  if (next) {
    next(); // The slot passes straight to the waiter.
    return;
  }
  activeRenders -= 1;
}

let timeoutMs = PLANTUML_TIMEOUT_MS;

export function setPlantUmlTimeoutForTests(milliseconds: number): void {
  timeoutMs = milliseconds;
}

export function resetPlantUmlTimeoutForTests(): void {
  timeoutMs = PLANTUML_TIMEOUT_MS;
}

function attr(node: HtmlNode, name: string): HtmlAttribute | undefined {
  return node.attrs?.find((candidate) => candidate.name === name);
}

function setAttr(node: HtmlNode, name: string, value: string): void {
  const existing = attr(node, name);
  if (existing) {
    existing.value = value;
    return;
  }
  node.attrs ??= [];
  node.attrs.push({ name, value });
}

function hasClass(node: HtmlNode, className: string): boolean {
  return (attr(node, "class")?.value ?? "").split(/\s+/u).includes(className);
}

function textContent(node: HtmlNode): string {
  if (node.value !== undefined) {
    return node.value;
  }
  return (node.childNodes ?? []).map(textContent).join("");
}

function collectSources(node: HtmlNode, inheritedLine: number | undefined, output: PlantUmlSource[]): void {
  const lineValue = attr(node, "data-line")?.value;
  const line = lineValue && /^[1-9]\d*$/u.test(lineValue) ? Number(lineValue) : inheritedLine;
  if (hasClass(node, "myst-plantuml-diagram")) {
    output.push({ source: textContent(node).trim(), ...(line === undefined ? {} : { line }) });
    return;
  }
  for (const child of node.childNodes ?? []) {
    collectSources(child, line, output);
  }
}

function diagnostic(message: string, line?: number): RenderDiagnostic {
  return {
    message,
    severity: "warning",
    ...(line === undefined ? {} : { line }),
  };
}

function unavailableResult(message: string, line?: number): PlantUmlDiagramRender {
  return { status: "unavailable", message, ...(line === undefined ? {} : { line }) };
}

function errorResult(message: string, line?: number): PlantUmlDiagramRender {
  return { status: "error", message, ...(line === undefined ? {} : { line }) };
}

function resolvedJarPath(jarPath: string, workspaceRoot: string): string {
  return path.isAbsolute(jarPath) ? jarPath : path.resolve(workspaceRoot, jarPath);
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-089
async function validateJarPath(files: PlantUmlFiles, jarPath: string): Promise<string | undefined> {
  try {
    if ((await files.stat(jarPath)).kind !== "file") {
      return `The PlantUML JAR path is not a file: ${jarPath}`;
    }
  } catch {
    return `The PlantUML JAR could not be found: ${jarPath}`;
  }
  return undefined;
}

// An explicit Java: JAVA_HOME when it holds a java binary, else the one on the PATH.
export async function resolveJavaCommand(
  files: PlantUmlFiles,
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Promise<string> {
  const javaHome = environment.JAVA_HOME?.trim();
  if (javaHome && path.isAbsolute(javaHome)) {
    const candidate = path.join(javaHome, "bin", platform === "win32" ? "java.exe" : "java");
    try {
      if ((await files.stat(candidate)).kind === "file") {
        return candidate;
      }
    } catch {
      // Fall back to the PATH lookup.
    }
  }
  return "java";
}

function resolveExecutablePath(executablePath: string, workspaceRoot: string): string {
  if (path.isAbsolute(executablePath) || executablePath.includes("/") || executablePath.includes("\\")) {
    return path.isAbsolute(executablePath) ? executablePath : path.resolve(workspaceRoot, executablePath);
  }
  return executablePath;
}

function isMissingExecutable(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT";
}

function missingExecutableMessage(command: string): string {
  const pathHint = path.isAbsolute(command) ? "" : " on PATH";
  return `PlantUML executable "${command}" was not found${pathHint}. `
    + "Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path.";
}

function svgOutput(stdout: string): string {
  const start = stdout.indexOf("<svg");
  const end = stdout.lastIndexOf("</svg>");
  if (start < 0 || end < start) {
    throw new Error("PlantUML did not return SVG output.");
  }
  return stdout.slice(start, end + "</svg>".length);
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-097
async function renderSource(
  source: string,
  processes: PlantUmlProcesses,
  command: string,
  args: readonly string[],
  env: Record<string, string>,
  workspaceRoot: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  if (source.length > MAX_PLANTUML_SOURCE_LENGTH) {
    throw new Error("PlantUML source exceeds the 1 MiB preview limit.");
  }
  if (signal?.aborted) {
    throw new Error("PlantUML rendering was canceled.");
  }
  const result = await processes.run(command, args, {
    cwd: workspaceRoot,
    env,
    input: source,
    timeoutMs,
    maxStdoutBytes: MAX_PLANTUML_OUTPUT_LENGTH,
    maxStderrChars: MAX_PLANTUML_STDERR_LENGTH,
    ...(signal ? { signal } : {}),
  });
  if (result.outputExceeded) {
    throw new Error("PlantUML SVG output exceeds the 8 MiB preview limit.");
  }
  if (result.stopped) {
    throw new Error(signal?.aborted
      ? "PlantUML rendering was canceled."
      : `PlantUML did not finish within ${timeoutMs / 1000} s.`);
  }
  if (result.exitCode !== 0) {
    const truncated = result.stderrTruncated === true;
    const detail = (result.stderr.trim() || "PlantUML returned no diagnostic.")
      + (truncated ? "\n[stderr truncated at 64 KiB]" : "");
    throw new Error(
      `PlantUML exited with ${result.exitCode === null ? `signal ${result.signal ?? "unknown"}` : `code ${result.exitCode}`}: ${detail}`,
    );
  }
  return svgOutput(result.stdout);
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-084
// @implements_req SwRS-MDOKFSTUDIO-DIAG-105
export async function renderPlantUmlDiagrams(
  html: string,
  options: PlantUmlRenderOptions,
): Promise<PlantUmlRenderResult> {
  const sources: PlantUmlSource[] = [];
  collectSources(parse(html) as unknown as HtmlNode, undefined, sources);
  if (sources.length === 0) {
    return { diagrams: [], diagnostics: [] };
  }

  if (!options.trusted) {
    const message = "PlantUML preview is disabled in an untrusted workspace.";
    return {
      diagrams: sources.map(({ line }) => unavailableResult(message, line)),
      diagnostics: sources.map(({ line }) => diagnostic(message, line)),
    };
  }

  const { processes, files } = options;
  if (!processes || !files) {
    const message = "PlantUML needs a host that can run programs; the built-in engine draws diagrams without one.";
    return {
      diagrams: sources.map(({ line }) => unavailableResult(message, line)),
      diagnostics: sources.map(({ line }) => diagnostic(message, line)),
    };
  }

  const configuredPath = options.jarPath?.trim();
  let command: string;
  let args: readonly string[];
  let jarIdentity: string | undefined = "";
  if (configuredPath) {
    const jarPath = resolvedJarPath(configuredPath, options.workspaceRoot);
    const jarError = await validateJarPath(files, jarPath);
    if (jarError) {
      return {
        diagrams: sources.map(({ line }) => errorResult(jarError, line)),
        diagnostics: sources.map(({ line }) => diagnostic(jarError, line)),
      };
    }
    command = await resolveJavaCommand(files);
    jarIdentity = await jarIdentityOf(files, jarPath);
    args = [
      `-Dplantuml.allowlist.path=${options.workspaceRoot}`,
      `-DPLANTUML_LIMIT_SIZE=${PLANTUML_LIMIT_SIZE}`,
      "-jar", jarPath, "-pipe", "-tsvg",
    ];
  } else {
    command = resolveExecutablePath(
      options.executablePath?.trim() || "plantuml",
      options.workspaceRoot,
    );
    args = ["-pipe", "-tsvg"];
  }
  // The runner adds these to the host's own environment.
  const env: Record<string, string> = {
    PLANTUML_SECURITY_PROFILE,
    PLANTUML_LIMIT_SIZE: String(PLANTUML_LIMIT_SIZE),
    PLANTUML_ALLOWLIST_PATH: options.workspaceRoot,
  };

  const inFlight = new Map<string, Promise<string>>();
  const renderCached = (source: string): Promise<string> => {
    if (source.length > MAX_PLANTUML_SOURCE_LENGTH || options.signal?.aborted) {
      return renderSource(source, processes, command, args, env, options.workspaceRoot, options.signal);
    }
    const key = cacheKey(source, command, args, options.workspaceRoot, jarIdentity);
    const hit = key === undefined ? undefined : svgCache.get(key);
    if (key !== undefined && hit !== undefined) {
      cacheStore(key, hit);
      return Promise.resolve(hit);
    }
    const pending = key === undefined ? undefined : inFlight.get(key);
    if (pending) {
      return pending;
    }
    const start = (): Promise<string> => renderSource(
      source, processes, command, args, env, options.workspaceRoot, options.signal,
    ).finally(releaseRenderSlot);
    const waiting = acquireRenderSlot(options.signal);
    const run = waiting ? waiting.then(start) : start();
    if (key !== undefined) {
      inFlight.set(key, run);
    }
    return run.then((svg) => {
      if (key !== undefined) {
        cacheStore(key, svg);
      }
      return svg;
    });
  };

  const outcomes = await Promise.all(sources.map(async ({ source, line }) => {
    try {
      const escape = await findEscapingPlantUmlInclude(options.files, source, options.workspaceRoot);
      if (escape) {
        throw new Error(escape);
      }
      const svg = await renderCached(source);
      return { diagram: { status: "rendered", svg, ...(line === undefined ? {} : { line }) } as PlantUmlDiagramRender };
    } catch (error) {
      const message = isMissingExecutable(error)
        ? missingExecutableMessage(command)
        : error instanceof Error ? error.message : String(error);
      const diagram = isMissingExecutable(error)
        ? unavailableResult(message, line)
        : errorResult(message, line);
      return { diagram, diagnostic: diagnostic(message, line) };
    }
  }));

  return {
    diagrams: outcomes.map(({ diagram }) => diagram),
    diagnostics: outcomes.flatMap(({ diagnostic: item }) => item ? [item] : []),
  };
}

function textNode(value: string): HtmlNode {
  return { nodeName: "#text", value };
}

function elementNode(
  tagName: string,
  attributes: HtmlAttribute[],
  children: HtmlNode[] = [],
): HtmlNode {
  return { nodeName: tagName, tagName, attrs: attributes, childNodes: children };
}

function dataImageUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function injectPlantUmlDiagrams(
  html: string,
  diagrams: readonly PlantUmlDiagramRender[],
): string {
  if (diagrams.length === 0 || !html.includes("myst-plantuml-diagram")) {
    return html;
  }
  const document = parse(html) as unknown as HtmlNode;
  let index = 0;
  const visit = (node: HtmlNode): void => {
    if (hasClass(node, "myst-plantuml-diagram")) {
      const diagram = diagrams[index];
      index += 1;
      if (diagram) {
        setAttr(node, "data-render-state", diagram.status);
        node.childNodes = diagram.status === "rendered" && diagram.svg
          ? [elementNode("img", [
            { name: "class", value: "myst-plantuml-image" },
            { name: "alt", value: "PlantUML diagram" },
            { name: "src", value: dataImageUri(diagram.svg) },
          ])]
          : [elementNode("p", [
            { name: "class", value: "myst-plantuml-error" },
          ], [textNode(diagram.message ?? "Unable to render PlantUML diagram.")])];
      }
      return;
    }
    for (const child of node.childNodes ?? []) {
      visit(child);
    }
  };
  visit(document);
  return serialize(document as never);
}
