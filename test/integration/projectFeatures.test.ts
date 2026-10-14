import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  getActivePreviewForTests,
} from "./extensionApi";
import {
  attribute,
  findElement,
  hasClass,
  parseHtml,
  textContent,
} from "../rendering/dom";

const extensionRoot = path.resolve(__dirname, "../../..");
const workspaceRoot = extensionRoot;
const fixtureDirectory = path.join(workspaceRoot, "sphinx", "tests", "fixtures", "sphinx-features");

async function waitFor(description: string, predicate: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function replaceDocument(document: vscode.TextDocument, text: string): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    text,
  );
  return edit;
}

export async function run(): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, true);
  const featurePath = path.join(fixtureDirectory, "feature-contract.md");
  const missingPath = path.join(fixtureDirectory, "missing-input.md");
  const originalFeatureSource = fs.readFileSync(featurePath, "utf8");
  const featureDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(featurePath));
  const missingDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(missingPath));
  const dirtyMarker = "Unsaved feature contract marker";
  const mermaidSource = "```mermaid\ngraph LR\n  input --> output\n```\n\n"
    + "```{mermaid}\ngraph LR\n  start --> finish\n```";

  try {
    await vscode.window.showTextDocument(featureDocument, vscode.ViewColumn.One);
    assert.equal(
      await vscode.workspace.applyEdit(
        replaceDocument(featureDocument, `${originalFeatureSource}\n\n${mermaidSource}\n\n${dirtyMarker}\n`),
      ),
      true,
    );
    await vscode.commands.executeCommand(COMMAND_ID);
    await waitFor("the unsaved feature-contract render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready" && preview.html.includes(dirtyMarker);
    });

    const rendered = getActivePreviewForTests();
    assert.ok(rendered);
    assert.equal(rendered.findWidgetEnabled, true);
    const html = parseHtml(rendered.html);
    assert.match(rendered.html, /<script[^>]+src="[^"]*mermaidPreview\.js"[^>]+data-sphinx-preview-mermaid/iu);
    assert.ok(
      rendered.localResourceRoots.some((root) => root.path.endsWith("/out/bundle")),
      "the Mermaid browser bundle directory was not allowed as a webview resource",
    );
    assert.ok(
      findElement(html, (element) => hasClass(element, "myst-mermaid-diagram")),
      "the webview HTML lost the Mermaid diagram source node",
    );
    const heading = findElement(html, (element) => element.tagName === "h1");
    const admonition = findElement(html, (element) =>
      hasClass(element, "admonition") && hasClass(element, "note"));
    const inlineMath = findElement(html, (element) => hasClass(element, "math-inline"));
    const displayMath = findElement(html, (element) => hasClass(element, "math-display"));
    const codeDirective = findElement(html, (element) =>
      element.tagName === "code" && hasClass(element, "language-python"));
    const externalLink = findElement(html, (element) =>
      element.tagName === "a" && attribute(element, "href") === "https://www.sphinx-doc.org/");
    const image = findElement(html, (element) =>
      element.tagName === "img" && attribute(element, "alt") === "Local feature contract image");
    const svgImage = findElement(html, (element) =>
      element.tagName === "img" && attribute(element, "alt") === "Local feature contract SVG image");

    assert.ok(externalLink, "the Webview HTML lost the external link");
    assert.ok(image, "the Webview HTML lost the local image");
    assert.ok(svgImage, "the Webview HTML lost the local SVG image");
    assert.ok(heading, "the Webview HTML lost its heading");
    assert.match(textContent(heading), /Sphinx Feature Contract/u);
    assert.ok(admonition, "the Webview HTML lost its admonition");
    assert.match(textContent(admonition), /semantic Sphinx admonition/u);
    assert.ok(inlineMath, "the Webview HTML lost inline math");
    assert.ok(displayMath, "the Webview HTML lost display math");
    assert.equal(attribute(inlineMath, "data-studio-math-rendered"), "true");
    assert.equal(attribute(displayMath, "data-studio-math-rendered"), "true");
    assert.ok(findElement(displayMath, (element) => hasClass(element, "katex")));
    const mathStylesheet = findElement(html, (element) => attribute(element, "data-studio-math-stylesheet") !== undefined);
    assert.ok(mathStylesheet);
    assert.match(attribute(mathStylesheet, "href") ?? "", /out\/bundle\/katex\/katex\.min\.css/u);
    const mathAssets = path.join(extensionRoot, "out", "bundle", "katex");
    const mathCss = fs.readFileSync(path.join(mathAssets, "katex.min.css"), "utf8");
    const fontReferences = [...mathCss.matchAll(/url\(([^)]+)\)/gu)];
    assert.ok(fontReferences.length > 0, "KaTeX stylesheet has no local font references");
    for (const [, font] of fontReferences) {
      assert.ok(font.startsWith("fonts/"), `KaTeX font must be local: ${font}`);
      assert.ok(fs.existsSync(path.join(mathAssets, font)), `Missing bundled KaTeX font: ${font}`);
    }
    assert.ok(codeDirective, "the Webview HTML lost the Python code directive");
    assert.match(textContent(codeDirective), /Rendered by Sphinx/u);
    assert.equal(attribute(externalLink, "href"), "https://www.sphinx-doc.org/");
    assert.equal(attribute(image, "alt"), "Local feature contract image");
    assert.match(attribute(image, "src") ?? "", /local-image\.png/u);
    assert.match(attribute(svgImage, "src") ?? "", /local-image\.svg/u);
    assert.match(rendered.html, /Content-Security-Policy/u);
    assert.match(rendered.html, /data-sphinx-preview-accessibility/iu);
    assert.match(rendered.html, /<style[^>]+nonce="[^"]+"[^>]+data-sphinx-preview-accessibility/iu);
    assert.doesNotMatch(rendered.html, /sphinx-myst-liveview-accessibility\.css/u);
    assert.doesNotMatch(rendered.html, /unsafe-inline|default-src \*/iu);
    assert.doesNotMatch(rendered.html, /:::\{|```\{include\}/u);

    await vscode.window.showTextDocument(missingDocument, vscode.ViewColumn.One);
    await waitFor("the missing-input diagnostic render", () => {
      const preview = getActivePreviewForTests();
      return preview?.phase === "ready"
        && preview.status === "success"
        && preview.documentUri === missingDocument.uri.toString()
        && preview.html.includes("myst-unresolved")
        && preview.html.includes("does-not-exist.md");
    });

    const missingInputPreview = getActivePreviewForTests();
    assert.ok(missingInputPreview);
    assert.equal(missingInputPreview.documentUri, missingDocument.uri.toString());
    assert.equal(missingInputPreview.phase, "ready");
    assert.equal(missingInputPreview.status, "success");
    const missingInputHtml = parseHtml(missingInputPreview.html);
    const unresolvedInclude = findElement(missingInputHtml, (element) =>
      hasClass(element, "myst-unresolved") && hasClass(element, "myst-directive"));
    assert.ok(unresolvedInclude, "the unavailable include was not preserved as an unresolved directive");
    assert.match(textContent(unresolvedInclude), /does-not-exist\.md/u);
    assert.ok(
      missingInputPreview.diagnostics.some((diagnostic) =>
        diagnostic.code === "missing-resource" && diagnostic.value === "does-not-exist.md"),
      "the unavailable include did not produce a missing-resource diagnostic",
    );
    const placeholder = findElement(missingInputHtml, (element) => hasClass(element, "myst-unresolved"));
    assert.ok(placeholder, "the unavailable include was not preserved as a preview placeholder");
    assert.match(textContent(placeholder ?? missingInputHtml), /\{include\} does-not-exist\.md/u);
    assert.match(missingInputPreview.html, /Directive \{include\} is not available outside a full build/u);
    assert.doesNotMatch(missingInputPreview.html, /Sphinx Feature Contract/u);
    assert.doesNotMatch(missingInputPreview.html, /:::\{include\}|```\{include\}/u);
  } finally {
    disposeActivePreviewForTests();
    if (featureDocument.getText() !== originalFeatureSource) {
      await vscode.workspace.applyEdit(replaceDocument(featureDocument, originalFeatureSource));
    }
  }
}
