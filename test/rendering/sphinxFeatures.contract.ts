import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import {
  buildSphinxSnapshot,
  type PreviewDocument,
} from "../../src/build/sphinxBuild";
import {
  attribute,
  findElement,
  hasClass,
  parseHtml,
  textContent,
  type HtmlElement,
} from "./dom";

const extensionRoot = path.resolve(__dirname, "../../..");
const workspaceRoot = extensionRoot;
const fixtureDirectory = path.join(workspaceRoot, "sphinx", "tests", "fixtures", "sphinx-features");

function fixtureDocument(fileName: string): PreviewDocument {
  const filePath = path.join(fixtureDirectory, fileName);
  return {
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markdown",
    version: 1,
    getText: () => fs.readFileSync(filePath, "utf8"),
  };
}

function isTag(tagName: string): (element: HtmlElement) => boolean {
  return (element) => element.tagName === tagName;
}

test("real Sphinx HTML preserves the active-file MyST feature contract", async (context) => {
  const document = fixtureDocument("feature-contract.md");
  assert.doesNotMatch(document.getText(), /\{cite\}/u);
  const result = await buildSphinxSnapshot({
    document,
    workspaceRoot,
    sphinxRoot: extensionRoot,
    requestId: 1,
    documentIdentity: document.uri.fsPath,
    isWorkspaceTrusted: () => true,
  });
  context.after(() => result.stage.dispose());

  const html = parseHtml(result.html);
  const heading = findElement(html, isTag("h1"));
  const subheading = findElement(html, isTag("h2"));
  const admonition = findElement(html, (element) =>
    element.tagName === "div" && hasClass(element, "admonition") && hasClass(element, "note"));
  const inlineMath = findElement(html, (element) =>
    element.tagName === "span" && hasClass(element, "math"));
  const displayMath = findElement(html, (element) =>
    element.tagName === "div" && hasClass(element, "math"));
  const codeDirective = findElement(html, (element) =>
    element.tagName === "div" && hasClass(element, "highlight-python"));
  const externalLink = findElement(html, (element) =>
    element.tagName === "a" && hasClass(element, "reference") && hasClass(element, "external"));
  const figure = findElement(html, isTag("figure"));
  const image = findElement(html, (element) =>
    element.tagName === "img" && attribute(element, "alt") === "Local feature contract image");

  assert.ok(heading, "the primary heading was not rendered");
  assert.ok(subheading, "the subheading was not rendered");
  assert.ok(admonition, "the note admonition was not rendered");
  assert.ok(codeDirective, "the Python code directive was not rendered");
  assert.ok(externalLink, "the external link was not rendered");
  assert.ok(image, "the local image was not rendered");
  assert.match(textContent(heading), /Sphinx Feature Contract/u);
  assert.match(textContent(subheading), /Headings and semantic blocks/u);
  assert.match(textContent(admonition), /semantic Sphinx admonition/u);
  assert.ok(inlineMath, "inline math was not rendered as a math element");
  assert.ok(displayMath, "display math was not rendered as a math element");
  assert.match(textContent(codeDirective), /Rendered by Sphinx/u);
  assert.equal(attribute(externalLink, "href"), "https://www.sphinx-doc.org/");
  assert.ok(figure, "the figure directive did not produce a figure element");
  assert.equal(attribute(image, "alt"), "Local feature contract image");
  assert.equal(attribute(image, "src"), "_images/local-image.png");
  assert.equal(result.diagnostics.length, 0);
  assert.ok(fs.existsSync(path.join(result.stage.outputDirectory, "_images", "local-image.png")));
});

test("missing active-file input returns a source diagnostic", async (context) => {
  const document = fixtureDocument("missing-input.md");
  const result = await buildSphinxSnapshot({
    document,
    workspaceRoot,
    sphinxRoot: extensionRoot,
    requestId: 2,
    documentIdentity: document.uri.fsPath,
    isWorkspaceTrusted: () => true,
  });
  context.after(() => result.stage.dispose());
  const diagnostic = result.diagnostics.find((entry) => entry.code === "unavailable-input");
  assert.ok(diagnostic, "expected an unavailable-input diagnostic");
  assert.equal(diagnostic.file, document.uri.fsPath);
  assert.equal(diagnostic.line, 5);
});
