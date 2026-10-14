import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  resourcePathPart,
  resourceReferenceSuffix,
  SecurityDiagnostic,
} from "../security/resource-policy";
import { appendPreviewBibliography, expandGithubAlerts } from "./sourceTransforms";

export interface PreviewDocument {
  uri: { scheme: string; fsPath: string };
  languageId: string;
  version?: number;
  getText(): string;
}

export interface SnapshotDiagnostic extends SecurityDiagnostic {
  file?: string;
  line?: number;
}

export interface SnapshotOptions {
  document: PreviewDocument;
  workspaceRoot: string;
  /** Package root containing the standalone Sphinx configuration and assets. */
  sphinxRoot?: string;
  requestId: number;
  documentIdentity?: string;
  /** Existing staging root to rebuild into, so Sphinx keeps its doctree cache. */
  rootDirectory?: string;
  getDocument?: (filePath: string) => PreviewDocument | undefined;
}

export interface StagedPreview {
  rootDirectory: string;
  sourceDirectory: string;
  outputDirectory: string;
  doctreeDirectory: string;
  activeSourcePath: string;
  activeDocumentPath: string;
  activeDocumentIdentity: string;
  activeDocumentVersion: number;
  requestId: number;
  dependencies: readonly string[];
  sourceOrigins: ReadonlyMap<string, string>;
  diagnostics: SnapshotDiagnostic[];
  dispose(): void;
}

interface ReferenceMatch {
  start: number;
  end: number;
  value: string;
  line: number;
}

interface PendingReference {
  reference: ReferenceMatch;
  baseDirectory: string;
  sourceFile: string;
  rewriteActiveSource: boolean;
}

interface CopiedInput {
  relativePath: string;
  realPath: string;
  text?: string;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isExternal(value: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(value);
}

function lineNumber(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

function collectReferences(text: string): ReferenceMatch[] {
  const matches: ReferenceMatch[] = [];
  const patterns = [
    /(?:^|\n)[ \t]*(?:`{3,}|:{3,})\{(?:figure|image|download|include)\}[ \t]+<?([^>\s]+)>?/gimu,
    /!\[[^\]]*\]\(\s*<?([^)>\s]+)>?/gu,
    /\[[^\]]*\]\(\s*<?([^)>\s]+)>?/gu,
    /(?:src|href)\s*=\s*["']([^"']+)["']/giu,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1];
      const start = (match.index ?? 0) + match[0].lastIndexOf(value);
      matches.push({
        start,
        end: start + value.length,
        value,
        line: lineNumber(text, start),
      });
    }
  }
  const unique = new Map<string, ReferenceMatch>();
  for (const match of matches.sort((left, right) => left.start - right.start)) {
    unique.set(`${match.start}:${match.value}`, match);
  }
  return [...unique.values()];
}

function addDiagnostic(
  diagnostics: SnapshotDiagnostic[],
  code: string,
  message: string,
  value: string,
  line?: number,
  file?: string,
): void {
  diagnostics.push({ code, message, value, line, file });
}

function copyReferencedInput(
  sourcePath: string,
  workspaceDirectory: string,
  workspaceRealPath: string,
  sourceDirectory: string,
  diagnostics: SnapshotDiagnostic[],
  reference: ReferenceMatch,
  sourceFile: string,
  getDocument: SnapshotOptions["getDocument"],
): CopiedInput | undefined {
  const absolute = path.resolve(sourcePath);
  if (!isWithin(workspaceDirectory, absolute)) {
    addDiagnostic(
      diagnostics,
      "source-outside-workspace",
      `Referenced input is outside the workspace (line ${reference.line}) and was not staged.`,
      sourcePath,
      reference.line,
      sourceFile,
    );
    return undefined;
  }

  let realPath: string;
  try {
    if (!fs.statSync(absolute).isFile()) {
      throw new Error("not a regular file");
    }
    realPath = fs.realpathSync(absolute);
  } catch {
    addDiagnostic(
      diagnostics,
      "unavailable-input",
      `Referenced input is unavailable (line ${reference.line}) and was not staged.`,
      sourcePath,
      reference.line,
      sourceFile,
    );
    return undefined;
  }

  if (!isWithin(workspaceRealPath, realPath)) {
    addDiagnostic(
      diagnostics,
      "source-symlink-escape",
      `Referenced input escapes the workspace through a symlink (line ${reference.line}).`,
      sourcePath,
      reference.line,
      sourceFile,
    );
    return undefined;
  }

  const relativePath = path.relative(workspaceDirectory, absolute);
  const stagedPath = path.join(sourceDirectory, relativePath);
  const openDocument = getDocument?.(realPath);
  const text = openDocument?.getText();
  fs.mkdirSync(path.dirname(stagedPath), { recursive: true });
  if (text === undefined) {
    fs.copyFileSync(realPath, stagedPath);
  } else {
    fs.writeFileSync(stagedPath, text, "utf8");
  }
  return {
    relativePath: relativePath.split(path.sep).join("/"),
    realPath,
    ...(text === undefined ? {} : { text }),
  };
}

function copyIfPresent(sourcePath: string, destinationPath: string): void {
  try {
    if (!fs.statSync(sourcePath).isFile()) {
      return;
    }
  } catch {
    return;
  }
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectory(sourceDirectory: string, destinationDirectory: string): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(sourceDirectory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      copyIfPresent(sourcePath, destinationPath);
    }
  }
}

function canonicalPath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

/** Create a staging root that survives across rebuilds of the same preview. */
export function createStageRoot(): string {
  // Canonicalise immediately: on macOS `os.tmpdir()` is a symlink, and webview
  // `localResourceRoots` are matched against the real path of every resource.
  return fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "markdown-okf-schema-studio-")),
  );
}

export function removeStageRoot(rootDirectory: string): void {
  fs.rmSync(rootDirectory, { recursive: true, force: true });
}

/** Drop previously staged sources while keeping the copied theme assets in place. */
function clearStagedSources(sourceDirectory: string): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(sourceDirectory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "_static" || entry.name === "_templates") {
      continue;
    }
    fs.rmSync(path.join(sourceDirectory, entry.name), { recursive: true, force: true });
  }
}

function trackableDependency(
  sourcePath: string,
  workspaceDirectory: string,
  workspaceRealPath: string,
): string | undefined {
  if (!isWithin(workspaceDirectory, sourcePath)) {
    return undefined;
  }
  try {
    const realPath = fs.realpathSync(sourcePath);
    return isWithin(workspaceRealPath, realPath) ? realPath : undefined;
  } catch {
    return sourcePath;
  }
}

export function stageSnapshot(options: SnapshotOptions): StagedPreview {
  const workspaceDirectory = path.resolve(options.workspaceRoot);
  const workspaceRealPath = fs.realpathSync(workspaceDirectory);
  const documentPath = path.resolve(options.document.uri.fsPath);
  if (
    options.document.uri.scheme !== "file" ||
    !isWithin(workspaceDirectory, documentPath) ||
    !isWithin(workspaceRealPath, fs.realpathSync(documentPath))
  ) {
    throw new Error("The active Markdown file must be a file inside the workspace.");
  }

  const reusedRoot = options.rootDirectory !== undefined;
  const rootDirectory = options.rootDirectory ?? createStageRoot();
  const sourceDirectory = path.join(rootDirectory, "source");
  const outputDirectory = path.join(rootDirectory, "output");
  const doctreeDirectory = path.join(rootDirectory, "doctrees");
  const diagnostics: SnapshotDiagnostic[] = [];
  const sourceOrigins = new Map<string, string>();
  const dependencies = new Set<string>();
  let disposed = false;

  try {
    if (reusedRoot) {
      clearStagedSources(sourceDirectory);
    }
    fs.mkdirSync(sourceDirectory, { recursive: true });
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.mkdirSync(doctreeDirectory, { recursive: true });

    const content = options.document.getText();
    const replacements = new Map<string, string>();
    const pendingReferences: PendingReference[] = collectReferences(content).map((reference) => ({
      reference,
      baseDirectory: path.dirname(documentPath),
      sourceFile: documentPath,
      rewriteActiveSource: true,
    }));
    const processedInputs = new Set<string>();

    for (let index = 0; index < pendingReferences.length; index += 1) {
      const { reference, baseDirectory, sourceFile, rewriteActiveSource } = pendingReferences[index];
      if (isExternal(reference.value)) {
        continue;
      }
      let decodedReference: string;
      try {
        decodedReference = decodeURIComponent(resourcePathPart(reference.value));
      } catch {
        addDiagnostic(
          diagnostics,
          "invalid-input-reference",
          `Referenced input contains an invalid encoded path (line ${reference.line}).`,
          reference.value,
          reference.line,
          sourceFile,
        );
        continue;
      }
      const sourcePath = path.resolve(baseDirectory, decodedReference);
      const trackedDependency = trackableDependency(
        sourcePath,
        workspaceDirectory,
        workspaceRealPath,
      );
      if (trackedDependency) {
        dependencies.add(trackedDependency);
      }
      const copiedInput = copyReferencedInput(
        sourcePath,
        workspaceDirectory,
        workspaceRealPath,
        sourceDirectory,
        diagnostics,
        reference,
        sourceFile,
        options.getDocument,
      );
      if (!copiedInput) {
        continue;
      }
      dependencies.add(copiedInput.realPath);
      const suffix = resourceReferenceSuffix(reference.value);
      if (rewriteActiveSource) {
        replacements.set(reference.value, `${copiedInput.relativePath}${suffix}`);
      }
      if (
        processedInputs.has(copiedInput.realPath) ||
        !/\.(?:md|markdown|rst|txt)$/iu.test(copiedInput.realPath)
      ) {
        continue;
      }
      processedInputs.add(copiedInput.realPath);
      let referencedText = copiedInput.text;
      if (referencedText === undefined) {
        try {
          referencedText = fs.readFileSync(copiedInput.realPath, "utf8");
        } catch {
          continue;
        }
      }
      for (const nestedReference of collectReferences(referencedText)) {
        pendingReferences.push({
          reference: nestedReference,
          baseDirectory: path.dirname(copiedInput.realPath),
          sourceFile: copiedInput.realPath,
          rewriteActiveSource: false,
        });
      }
    }

    let stagedContent = content;
    for (const [original, replacement] of replacements) {
      stagedContent = stagedContent.split(original).join(replacement);
    }
    stagedContent = appendPreviewBibliography(expandGithubAlerts(stagedContent));
    const activeSourcePath = path.join(sourceDirectory, "index.md");
    fs.writeFileSync(activeSourcePath, stagedContent, "utf8");
    sourceOrigins.set(canonicalPath(activeSourcePath), documentPath);
    for (const dependency of dependencies) {
      const relative = path.relative(workspaceDirectory, dependency);
      sourceOrigins.set(canonicalPath(path.resolve(sourceDirectory, relative)), dependency);
    }

    if (!reusedRoot || !fs.existsSync(path.join(sourceDirectory, "_static"))) {
      const sphinxRoot = options.sphinxRoot ?? options.workspaceRoot;
      copyDirectory(path.join(sphinxRoot, "sphinx", "_static"), path.join(sourceDirectory, "_static"));
      copyDirectory(path.join(sphinxRoot, "sphinx", "_templates"), path.join(sourceDirectory, "_templates"));
      copyIfPresent(
        path.join(sphinxRoot, "images", "favicon-96x96.png"),
        path.join(rootDirectory, "images", "favicon-96x96.png"),
      );
      copyIfPresent(
        path.join(sphinxRoot, "images", "favicon.ico"),
        path.join(rootDirectory, "images", "favicon.ico"),
      );
    }

    return {
      rootDirectory,
      sourceDirectory,
      outputDirectory,
      doctreeDirectory,
      activeSourcePath,
      activeDocumentPath: documentPath,
      activeDocumentIdentity: options.documentIdentity ?? documentPath,
      activeDocumentVersion: options.document.version ?? 0,
      requestId: options.requestId,
      dependencies: [...dependencies],
      sourceOrigins,
      diagnostics,
      dispose: () => {
        if (disposed || reusedRoot) {
          return;
        }
        disposed = true;
        fs.rmSync(rootDirectory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (!reusedRoot) {
      fs.rmSync(rootDirectory, { recursive: true, force: true });
    }
    throw error;
  }
}

export function stageActiveDocument(
  document: PreviewDocument,
  workspaceRoot: string,
): StagedPreview {
  return stageSnapshot({ document, workspaceRoot, requestId: 0 });
}
