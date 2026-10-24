/** Shared helpers of the MyST feature tests: fixture and inline documents, tag matchers. */

import * as fs from "node:fs";
import * as path from "node:path";

import type { PreviewDocument } from "../../../src/core/render/renderPipeline";
import type { HtmlElement } from "./dom";

const extensionRoot = path.resolve(__dirname, "../../../..");
export const workspaceRoot = extensionRoot;
export const fixtureDirectory = path.join(workspaceRoot, "sphinx", "tests", "fixtures", "sphinx-features");

export function fixtureDocument(fileName: string): PreviewDocument {
  const filePath = path.join(fixtureDirectory, fileName);
  return {
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markdown",
    version: 1,
    getText: () => fs.readFileSync(filePath, "utf8"),
  };
}

export function inlineDocument(text: string): PreviewDocument {
  return {
    uri: { scheme: "file", fsPath: path.join(fixtureDirectory, "inline.md") },
    languageId: "markdown",
    version: 1,
    getText: () => text,
  };
}

export function isTag(tagName: string): (element: HtmlElement) => boolean {
  return (element) => element.tagName === tagName;
}
