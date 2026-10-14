import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { parse, serialize } from "parse5";

import { RenderDiagnostic } from "./mystRenderer";

const MAX_PLANTUML_SOURCE_LENGTH = 1024 * 1024;
const MAX_PLANTUML_OUTPUT_LENGTH = 8 * 1024 * 1024;

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
  signal?: AbortSignal;
}

export interface PlantUmlProcessSpawner {
  spawn: typeof childProcess.spawn;
}

const defaultProcessSpawner: PlantUmlProcessSpawner = { spawn: childProcess.spawn };
let processSpawner: PlantUmlProcessSpawner = defaultProcessSpawner;

export function setPlantUmlProcessSpawnerForTests(spawner: PlantUmlProcessSpawner): void {
  processSpawner = spawner;
}

export function resetPlantUmlProcessSpawnerForTests(): void {
  processSpawner = defaultProcessSpawner;
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

function validateJarPath(jarPath: string): string | undefined {
  try {
    if (!fs.statSync(jarPath).isFile()) {
      return `The PlantUML JAR path is not a file: ${jarPath}`;
    }
  } catch {
    return `The PlantUML JAR could not be found: ${jarPath}`;
  }
  return undefined;
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

function renderSource(
  source: string,
  command: string,
  args: readonly string[],
  workspaceRoot: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  if (source.length > MAX_PLANTUML_SOURCE_LENGTH) {
    return Promise.reject(new Error("PlantUML source exceeds the 1 MiB preview limit."));
  }
  if (signal?.aborted) {
    return Promise.reject(new Error("PlantUML rendering was canceled."));
  }

  return new Promise((resolve, reject) => {
    let child: childProcess.ChildProcess;
    try {
      child = processSpawner.spawn(
        command,
        args,
        { cwd: workspaceRoot, stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch (error) {
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    const cleanup = (): void => {
      signal?.removeEventListener("abort", abort);
    };
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };
    const abort = (): void => {
      if (settled) {
        return;
      }
      child.kill("SIGTERM");
      finish(() => reject(new Error("PlantUML rendering was canceled.")));
    };
    const appendOutput = (target: "stdout" | "stderr", chunk: Buffer | string): void => {
      const value = chunk.toString();
      if (target === "stdout") {
        stdout += value;
        if (stdout.length > MAX_PLANTUML_OUTPUT_LENGTH) {
          child.kill("SIGTERM");
          finish(() => reject(new Error("PlantUML SVG output exceeds the 8 MiB preview limit.")));
        }
      } else {
        stderr += value;
      }
    };

    child.stdout?.on("data", (chunk: Buffer | string) => appendOutput("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer | string) => appendOutput("stderr", chunk));
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", (code, signalName) => finish(() => {
      if (code !== 0) {
        const detail = stderr.trim() || "PlantUML returned no diagnostic.";
        reject(new Error(
          `PlantUML exited with ${signalName ? `signal ${signalName}` : `code ${code}`}: ${detail}`,
        ));
        return;
      }
      try {
        resolve(svgOutput(stdout));
      } catch (error) {
        reject(error);
      }
    }));
    signal?.addEventListener("abort", abort, { once: true });
    child.stdin?.end(source);
  });
}

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

  const configuredPath = options.jarPath?.trim();
  let command: string;
  let args: readonly string[];
  if (configuredPath) {
    const jarPath = resolvedJarPath(configuredPath, options.workspaceRoot);
    const jarError = validateJarPath(jarPath);
    if (jarError) {
      return {
        diagrams: sources.map(({ line }) => errorResult(jarError, line)),
        diagnostics: sources.map(({ line }) => diagnostic(jarError, line)),
      };
    }
    command = "java";
    args = ["-jar", jarPath, "-pipe", "-tsvg"];
  } else {
    command = resolveExecutablePath(
      options.executablePath?.trim() || "plantuml",
      options.workspaceRoot,
    );
    args = ["-pipe", "-tsvg"];
  }

  const outcomes = await Promise.all(sources.map(async ({ source, line }) => {
    try {
      const svg = await renderSource(source, command, args, options.workspaceRoot, options.signal);
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
