import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import {
  renderPreviewDocument,
  type PreviewDocument,
} from "../../src/render/renderPipeline";
import { createEditActions } from "../../src/webview/editActions";
import { createMarkdownTableTools } from "../../src/webview/markdownTable";
import { renderMathHtml } from "../../src/render/mathRenderer";
import { rewriteSphinxHtml } from "../../src/security/html-sanitizer";
import { ResourcePolicy } from "../../src/security/resource-policy";
import {
  attribute,
  findElement,
  findElements,
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

function inlineDocument(text: string): PreviewDocument {
  return {
    uri: { scheme: "file", fsPath: path.join(fixtureDirectory, "inline.md") },
    languageId: "markdown",
    version: 1,
    getText: () => text,
  };
}

function isTag(tagName: string): (element: HtmlElement) => boolean {
  return (element) => element.tagName === tagName;
}

test("wikilinks render as lazy note targets without changing code or existing links", async () => {
  const document = inlineDocument(
    "See [[Note]], [[Folder/My Note#Heading|Label]] and [[#Section]].\n\n"
    + "`[[Code]]` and [existing [[label]]](target.md).\n\n```text\n[[Fenced]]\n```\n",
  );
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const links = findElements(parseHtml(result.html), isTag("a"));
  assert.deepEqual(links.map((link) => attribute(link, "href")), [
    "wiki:Note", "wiki:Folder/My%20Note#Heading", "#section", "target.md",
  ]);
  assert.equal(textContent(links[1]), "Label");
  assert.match(result.html, /\[\[Code\]\]/u);
  assert.match(result.html, /\[\[Fenced\]\]/u);
});

test("the in-process renderer preserves the active-file MyST feature contract", async () => {
  const document = fixtureDocument("feature-contract.md");
  const result = await renderPreviewDocument({
    document,
    workspaceRoot,
    requestId: 1,
    documentIdentity: document.uri.fsPath,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const heading = findElement(html, isTag("h1"));
  const subheading = findElement(html, isTag("h2"));
  const admonition = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "note"));
  const inlineMath = findElement(html, (element) => hasClass(element, "math-inline"));
  const displayMath = findElement(html, (element) => hasClass(element, "math-display"));
  const code = findElement(html, (element) =>
    element.tagName === "code" && hasClass(element, "language-python"));
  const externalLink = findElement(html, (element) =>
    element.tagName === "a" && attribute(element, "href") === "https://www.sphinx-doc.org/");
  const figure = findElement(html, (element) => element.tagName === "figure"
    && findElement(element, (child) => child.tagName === "img"
      && attribute(child, "alt") === "Local feature contract image") !== undefined);
  const image = findElement(html, (element) =>
    element.tagName === "img" && attribute(element, "alt") === "Local feature contract image");

  assert.ok(externalLink, "the external link was not rendered");
  assert.ok(image, "the local image was not rendered");
  assert.ok(heading, "the primary heading was not rendered");
  assert.ok(subheading, "the subheading was not rendered");
  assert.ok(admonition, "the note admonition was not rendered");
  assert.ok(code, "the Python code block was not rendered");
  assert.match(textContent(heading), /Sphinx Feature Contract/u);
  assert.match(textContent(subheading), /Headings and semantic blocks/u);
  assert.match(textContent(admonition), /semantic Sphinx admonition/u);
  assert.ok(inlineMath, "inline math was not rendered");
  assert.ok(displayMath, "display math was not rendered");
  assert.match(textContent(code), /Rendered by Sphinx/u);
  assert.ok(figure, "the figure directive did not produce a figure element");
  assert.ok(attribute(figure, "data-line"), "the figure carries a source line for editing");
  // Relative, so the webview resolves it against the document's own directory.
  assert.equal(attribute(image, "src"), "local-image.png");
  assert.equal(result.diagnostics.length, 0);
});

test("figure references render figures whose body supplies the caption", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "See {ref}`fig-example`.\n\n"
      + "```{figure} example.svg\n"
      + ":name: fig-example\n\n"
      + "An example figure.\n"
      + "```\n",
    ),
    workspaceRoot,
    requestId: 2,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const reference = findElement(html, (element) =>
    element.tagName === "a" && attribute(element, "href") === "#fig-example");
  const caption = findElement(html, isTag("figcaption"));

  assert.ok(reference, "the figure reference was not rendered as a link");
  assert.equal(textContent(reference), "An example figure.");
  assert.ok(caption, "the figure body was not rendered as a caption");
  assert.match(textContent(caption), /An example figure\./u);
  assert.equal(result.diagnostics.length, 0);
});

test("references to captionless figures and tables stay readable", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "See {ref}`fig-empty` and {ref}`tbl-empty`.\n\n"
      + "```{figure} image.svg\n"
      + ":name: fig-empty\n"
      + "```\n\n"
      + ":::{table}\n"
      + ":label: tbl-empty\n\n"
      + "| A |\n"
      + "| --- |\n"
      + "| 1 |\n"
      + ":::\n",
    ),
    workspaceRoot,
    requestId: 3,
    isWorkspaceTrusted: () => true,
  });

  const links = findElements(parseHtml(result.html), (element) => element.tagName === "a");

  assert.deepEqual(links.map((link) => attribute(link, "href")), ["#fig-empty", "#tbl-empty"]);
  assert.deepEqual(links.map(textContent), ["fig-empty", "tbl-empty"]);
  assert.equal(result.diagnostics.length, 0);
});

test("MyST code directives number and emphasize lines relative to their start", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "```{code} ipython3\n"
      + ":emphasize-lines: 5,7-8\n"
      + ":lineno-start: 5\n"
      + ":caption: Numbered example\n"
      + ":label: code:numbered\n"
      + ":filename: example.py\n"
      + "print('first')\nprint('second')\nprint('third')\nprint('fourth')\n````\n",
    ),
    workspaceRoot,
    requestId: 18,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const figure = findElement(html, (element) =>
    element.tagName === "figure" && attribute(element, "id") === "code:numbered");
  const lines = findElements(html, (element) =>
    element.tagName === "span" && hasClass(element, "myst-code-line"));

  assert.ok(figure, "the labelled code directive was not rendered");
  assert.match(textContent(figure), /Numbered example/u);
  assert.match(textContent(figure), /example\.py/u);
  assert.deepEqual(lines.map((line) => attribute(line, "data-line-number")), ["5", "6", "7", "8"]);
  assert.deepEqual(lines.map((line) => hasClass(line, "myst-code-line-emphasized")), [true, false, true, true]);
  assert.ok(findElement(html, (element) =>
    element.tagName === "span" && hasClass(element, "hljs-built_in")), "IPython code was not highlighted as Python");
  assert.equal(result.diagnostics.length, 0);
});

test("MyST code-cell directives render numbered input without claiming execution", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "```{code-cell} python\n"
      + ":linenos:\n"
      + ":number-lines: 3\n"
      + ":emphasize-lines: 4\n"
      + "print('first')\nprint('second')\n````\n",
    ),
    workspaceRoot,
    requestId: 19,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const lines = findElements(html, (element) =>
    element.tagName === "span" && hasClass(element, "myst-code-line"));
  const output = findElement(html, (element) => hasClass(element, "myst-code-cell-output"));

  assert.deepEqual(lines.map((line) => attribute(line, "data-line-number")), ["3", "4"]);
  assert.deepEqual(lines.map((line) => hasClass(line, "myst-code-line-emphasized")), [false, true]);
  assert.ok(output, "the unexecuted code-cell output was silently omitted");
  assert.match(textContent(output), /full project build/u);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].severity, "warning");
});

test("Mermaid fences and directives preserve diagram source for webview rendering", async () => {
  const sources = [
    "```mermaid\ngraph LR\n  a --> b\n```",
    "```{mermaid}\ngraph LR\n  a --> b\n```",
  ];

  for (const [index, source] of sources.entries()) {
    const result = await renderPreviewDocument({
      document: inlineDocument(source),
      workspaceRoot,
      requestId: 30 + index,
      isWorkspaceTrusted: () => true,
    });
    const html = parseHtml(result.html);
    const diagram = findElement(html, (element) => hasClass(element, "myst-mermaid-diagram"));

    assert.ok(diagram, "the Mermaid source was not normalized to a diagram node");
    assert.equal(textContent(diagram).trim(), "graph LR\n  a --> b");
    assert.equal(findElement(html, (element) => hasClass(element, "myst-unresolved")), undefined);
    assert.equal(result.diagnostics.length, 0);
  }
});

test("PlantUML fences and directives preserve diagram source for external rendering", async () => {
  const sources = [
    "```plantuml\n@startuml\nAlice -> Bob: hello\n@enduml\n```",
    "```{plantuml}\n@startuml\nAlice -> Bob: hello\n@enduml\n```",
  ];

  for (const [index, source] of sources.entries()) {
    const result = await renderPreviewDocument({
      document: inlineDocument(source),
      workspaceRoot,
      requestId: 40 + index,
      isWorkspaceTrusted: () => true,
      plantUmlJarPath: "missing-test-plantuml.jar",
    });
    const html = parseHtml(result.html);
    const diagram = findElement(html, (element) => hasClass(element, "myst-plantuml-diagram"));

    assert.ok(diagram, "the PlantUML source was not normalized to a diagram node");
    assert.equal(textContent(diagram).trim(), "@startuml\nAlice -> Bob: hello\n@enduml");
    assert.equal(findElement(html, (element) => hasClass(element, "myst-unresolved")), undefined);
    assert.equal(result.diagnostics.length, 0);
    const plantUml = await result.resolvePlantUml();
    assert.equal(plantUml.diagrams[0]?.status, "error");
    assert.match(plantUml.diagrams[0]?.message ?? "", /could not be found/u);
  }
});

test("Sphinx version admonitions render generated titles and Markdown bodies", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      ":::{versionadded} 1.2.3\nA new feature with **bold** text.\n:::\n\n"
      + ":::{versionchanged} 2.0.0\nAn updated behavior.\n:::\n\n"
      + ":::{deprecated} 3.1.0\nAn obsolete behavior.\n:::\n",
    ),
    workspaceRoot,
    requestId: 41,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const cases = [
    { type: "versionadded", title: "Added in version 1.2.3:" },
    { type: "versionchanged", title: "Changed in version 2.0.0:" },
    { type: "deprecated", title: "Deprecated since version 3.1.0:" },
  ];

  for (const admonitionCase of cases) {
    const admonition = findElement(html, (element) =>
      hasClass(element, "admonition") && hasClass(element, admonitionCase.type));
    assert.ok(admonition, `the ${admonitionCase.type} directive was not rendered as an admonition`);
    const title = findElement(admonition, (element) => hasClass(element, "admonition-title"));
    assert.ok(title, `the ${admonitionCase.type} label was not rendered`);
    assert.equal(textContent(title), admonitionCase.title);
  }

  const added = findElement(html, (element) => hasClass(element, "versionadded"));
  assert.ok(added);
  assert.ok(findElement(added, (element) => element.tagName === "strong"));
  assert.match(textContent(added), /A new feature with bold text\./u);
  const addedBody = findElement(added, (element) =>
    element.tagName === "p" && !hasClass(element, "admonition-title"));
  assert.ok(addedBody, "the version-added body paragraph was not rendered");
  assert.equal(attribute(addedBody, "data-line"), "2");
  assert.equal(result.diagnostics.length, 0);
});

test("custom admonition titles preserve inline Markdown and their class", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      ":::{admonition} My custom title with *Markdown*!\n"
      + ":class: tip\n\n"
      + "This is a custom title for a tip admonition.\n:::\n",
    ),
    workspaceRoot,
    requestId: 42,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const admonition = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "tip"));

  assert.ok(admonition, "the custom admonition class was not preserved");
  const title = findElement(admonition, (element) => hasClass(element, "admonition-title"));
  assert.ok(title, "the custom Markdown title was not rendered");
  assert.ok(findElement(title, (element) => element.tagName === "em"));
  assert.equal(textContent(title), "My custom title with Markdown!");
  assert.match(textContent(admonition), /This is a custom title for a tip admonition\./u);
});

test("nested backtick and colon delimiters preserve their enclosing Markdown", async () => {
  for (const outerLength of [4, 5]) {
    const outerFence = "`".repeat(outerLength);
    const innerFence = "`".repeat(outerLength - 1);
    const result = await renderPreviewDocument({
      document: inlineDocument(
        `${outerFence}markdown\n`
        + `${innerFence}markdown\n`
        + "> [!NOTE]\n> This remains literal nested Markdown.\n"
        + `${innerFence}\n`
        + `${outerFence}\n`,
      ),
      workspaceRoot,
      requestId: 32 + outerLength,
      isWorkspaceTrusted: () => true,
    });
    const html = parseHtml(result.html);
    const example = findElement(html, (element) =>
      element.tagName === "code" && hasClass(element, "language-markdown"));

    assert.ok(example, `${outerLength}-backtick Markdown example was not rendered`);
    assert.match(textContent(example), /```markdown[\s\S]*> \[!NOTE\]/u);
    assert.equal(findElement(html, (element) => hasClass(element, "myst-mermaid-figure")), undefined);
  }

  const nestedFence = await renderPreviewDocument({
    document: inlineDocument(
      "````md\n```\n"
      + ":::{admonition} My custom title with *Markdown*!\n"
      + ":class: tip\n\n"
      + "This is a custom title for a tip admonition.\n:::\n"
      + "```\n````\n",
    ),
    workspaceRoot,
    requestId: 41,
    isWorkspaceTrusted: () => true,
  });
  const nestedFenceHtml = parseHtml(nestedFence.html);
  const markdownExample = findElement(nestedFenceHtml, (element) =>
    element.tagName === "code" && hasClass(element, "language-md"));

  assert.ok(markdownExample, "the nested Markdown example was not kept in a code block");
  assert.match(textContent(markdownExample), /:::\{admonition\} My custom title with \*Markdown\*!/u);
  assert.equal(findElement(nestedFenceHtml, (element) =>
    hasClass(element, "admonition") && hasClass(element, "tip")), undefined);

  const nested = await renderPreviewDocument({
    document: inlineDocument(
      "::::{note}\nOuter note.\n:::{tip}\nInner tip.\n:::\n::::\n",
    ),
    workspaceRoot,
    requestId: 40,
    isWorkspaceTrusted: () => true,
  });
  const nestedHtml = parseHtml(nested.html);
  const outer = findElement(nestedHtml, (element) =>
    hasClass(element, "admonition") && hasClass(element, "note"));

  assert.ok(outer, "the four-colon outer directive was not rendered");
  assert.ok(findElement(outer, (element) =>
    hasClass(element, "admonition") && hasClass(element, "tip")), "the nested three-colon directive escaped its parent");
});

test("GitHub alert syntax preserves an explicit title", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("> [!note] Note\n> Tips\n> Keep useful advice concise.\n"),
    workspaceRoot,
    requestId: 5,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const admonition = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "note"));
  assert.ok(admonition, "the titled callout was rendered as a blockquote instead of an admonition");

  const title = findElement(admonition, (element) => hasClass(element, "admonition-title"));
  assert.ok(title, "the callout title was not rendered");
  assert.equal(textContent(title), "Note");
  assert.equal((textContent(admonition).match(/Note/gu) ?? []).length, 1);
  assert.match(textContent(admonition), /Tips/u);
  assert.match(textContent(admonition), /Keep useful advice concise\./u);
});

test("GitHub alert syntax defaults the title when none is provided", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("> [!TIP]\n> Tips remain visible.\n"),
    workspaceRoot,
    requestId: 6,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const admonition = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "tip"));
  assert.ok(admonition, "the untitled GitHub alert was not rendered as an admonition");

  const title = findElement(admonition, (element) => hasClass(element, "admonition-title"));
  assert.ok(title, "the default alert title was not rendered");
  assert.equal(textContent(title), "Tip");
  assert.ok(hasClass(admonition, "simple"));
  assert.match(textContent(admonition), /Tips remain visible\./u);
});

test("GitHub bold Note, Important, and Warning markers become simple admonitions", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "> **Note**\n> Note body.\n\n"
      + "> **Important**\n> Important body.\n\n"
      + "> **Warning**\n> Warning body.\n",
    ),
    workspaceRoot,
    requestId: 13,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  for (const [kind, body] of [
    ["note", "Note body."],
    ["important", "Important body."],
    ["warning", "Warning body."],
  ]) {
    const admonition = findElement(html, (element) =>
      hasClass(element, "admonition") && hasClass(element, kind));
    assert.ok(admonition, `the bold GitHub {${kind}} marker stayed a blockquote`);
    assert.ok(hasClass(admonition, "simple"));
    assert.match(textContent(admonition), new RegExp(body, "u"));
  }
});

test("MyST typography renders definitions, abbreviations, scripts, and footnotes", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "Term\n: Definition text.\n\n"
      + "{abbr}`HR (Heart Rate)`; H{sub}`2`O; x{sup}`th`.\n\n"
      + "A measurement[^hr].\n\n[^hr]: Heart rate in beats per minute.\n",
    ),
    workspaceRoot,
    requestId: 7,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const definitionList = findElement(html, isTag("dl"));
  const abbreviation = findElement(html, isTag("abbr"));
  const subscript = findElement(html, isTag("sub"));
  const superscript = findElement(html, isTag("sup"));
  const footnote = findElement(html, (element) =>
    element.tagName === "li" && attribute(element, "id") === "user-content-fn-hr");

  assert.ok(definitionList, "the definition list was not rendered");
  assert.match(textContent(definitionList), /TermDefinition text\./u);
  assert.ok(abbreviation, "the abbreviation role was not rendered");
  assert.equal(textContent(abbreviation), "HR");
  assert.equal(attribute(abbreviation, "title"), "Heart Rate");
  assert.ok(subscript, "the subscript role was not rendered");
  assert.ok(superscript, "the superscript role was not rendered");
  assert.equal(textContent(subscript), "2");
  assert.equal(textContent(superscript), "th");
  assert.ok(footnote, "the footnote definition was not rendered");
  assert.match(textContent(footnote), /Heart rate in beats per minute\./u);
});

test("all named MyST admonitions receive their documented default title", async () => {
  const titles: Record<string, string> = {
    note: "Note",
    attention: "Attention",
    important: "Important",
    caution: "Caution",
    hint: "Hint",
    warning: "Warning",
    seealso: "See Also",
    danger: "Danger",
    tip: "Tip",
    error: "Error",
  };
  const source = Object.keys(titles)
    .map((kind) => `:::{${kind}}\nBody for ${kind}.\n:::`)
    .join("\n\n");
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 8,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  for (const [kind, titleText] of Object.entries(titles)) {
    const admonition = findElement(html, (element) =>
      hasClass(element, "admonition") && hasClass(element, kind));
    assert.ok(admonition, `the {${kind}} admonition was not rendered`);
    const title = findElement(admonition, (element) => hasClass(element, "admonition-title"));
    assert.ok(title, `the {${kind}} title was not rendered`);
    assert.equal(textContent(title), titleText);
  }
});

test("a leading bold paragraph or heading supplies the MyST admonition title", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      ":::{note}\n**A bold title**\n\nBody after the title.\n:::\n\n"
      + ":::{danger}\n### A heading title\n\nBody after the heading.\n:::\n",
    ),
    workspaceRoot,
    requestId: 14,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const note = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "note"));
  const danger = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "danger"));
  assert.ok(note);
  assert.ok(danger);
  const noteTitle = findElement(note, (element) => hasClass(element, "admonition-title"));
  const dangerTitle = findElement(danger, (element) => hasClass(element, "admonition-title"));
  assert.ok(noteTitle);
  assert.ok(dangerTitle);
  assert.equal(textContent(noteTitle), "A bold title");
  assert.equal(textContent(dangerTitle), "A heading title");
  assert.equal(findElement(danger, isTag("h3")), undefined);
  assert.match(textContent(note), /Body after the title\./u);
  assert.match(textContent(danger), /Body after the heading\./u);
});

test("Quarto callout classes render as semantic MyST admonitions", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "::: {.callout-tip}\n## Tip with Caption\n\nThis is a Quarto callout.\n:::\n",
    ),
    workspaceRoot,
    requestId: 15,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const callout = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "tip"));
  assert.ok(callout, "the Quarto callout remained a generic container");
  assert.ok(hasClass(callout, "simple"));
  const title = findElement(callout, (element) => hasClass(element, "admonition-title"));
  assert.ok(title);
  assert.equal(textContent(title), "Tip with Caption");
  assert.match(textContent(callout), /This is a Quarto callout\./u);
});

test("dropdown admonitions render as openable details with a summary", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      ":::{warning} Read more\n:class: simple dropdown\n:open: true\n:icon: false\n\nDetails body.\n:::\n\n"
      + ":::{tip} Open option only\n:open: true\n\nOpen body.\n:::\n",
    ),
    workspaceRoot,
    requestId: 9,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const dropdown = findElement(html, (element) =>
    element.tagName === "details" && hasClass(element, "admonition"));
  assert.ok(dropdown, "the dropdown admonition was rendered as a static block");
  assert.ok(hasClass(dropdown, "warning"));
  assert.ok(hasClass(dropdown, "simple"));
  assert.ok(hasClass(dropdown, "no-icon"));
  assert.notEqual(attribute(dropdown, "open"), undefined);
  const title = findElement(dropdown, isTag("summary"));
  assert.ok(title, "the dropdown title was not rendered as a summary");
  assert.equal(textContent(title), "Read more");
  assert.match(textContent(dropdown), /Details body\./u);

  const openOnly = findElement(html, (element) =>
    element.tagName === "details" && hasClass(element, "tip"));
  assert.ok(openOnly, "the open option did not turn the admonition into a dropdown");
  assert.notEqual(attribute(openOnly, "open"), undefined);
});

test("MyST GFM and directive tables preserve captions, headers, and alignment", async () => {
  const source = [
    "| left | center | right |",
    "| :--- | :----: | ----: |",
    "| a | b | c |",
    "",
    ":::{table} Directive table caption",
    ":label: tbl:alignment",
    ":align: center",
    "",
    "| Name | Value |",
    "| --- | --- |",
    "| item | 3 |",
    ":::",
    "",
    "```{list-table} List table caption",
    ":header-rows: 1",
    ":align: right",
    "",
    "* - List heading",
    "  - Count",
    "* - item",
    "  - 3",
    "```",
    "",
    "```{csv-table} CSV table caption",
    ":header: \"CSV heading\", \"Description\"",
    ":align: center",
    "\"csv item\", \"line one",
    "line two\"",
    "```",
  ].join("\n");
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 10,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const leftHeading = findElement(html, (element) =>
    element.tagName === "th" && textContent(element) === "left");
  const centerHeading = findElement(html, (element) =>
    element.tagName === "th" && textContent(element) === "center");
  const rightHeading = findElement(html, (element) =>
    element.tagName === "th" && textContent(element) === "right");
  const tableFigure = findElement(html, (element) =>
    element.tagName === "figure" && attribute(element, "id") === "tbl:alignment");
  const directiveTable = tableFigure && findElement(tableFigure, isTag("table"));
  const listTable = findElement(html, (element) =>
    element.tagName === "table" && textContent(element).includes("List heading"));
  const csvTable = findElement(html, (element) =>
    element.tagName === "table" && textContent(element).includes("csv item"));

  assert.ok(leftHeading, "the left-aligned header was not rendered");
  assert.ok(centerHeading, "the center-aligned header was not rendered");
  assert.ok(rightHeading, "the right-aligned header was not rendered");
  assert.equal(attribute(leftHeading, "align"), "left");
  assert.equal(attribute(centerHeading, "align"), "center");
  assert.equal(attribute(rightHeading, "align"), "right");
  assert.ok(tableFigure, "the table directive label and caption were not rendered");
  assert.match(textContent(tableFigure), /Directive table caption/u);
  assert.ok(directiveTable, "the table directive did not produce a table");
  assert.equal(attribute(directiveTable, "align"), "center");
  assert.ok(listTable, "the list-table directive was not rendered");
  assert.equal(attribute(listTable, "align"), "right");
  assert.ok(csvTable, "the csv-table directive was not rendered");
  assert.equal(attribute(csvTable, "align"), "center");
  assert.match(textContent(csvTable), /line one\s+line two/u);
});

test("raw HTML tables preserve complex cell spans without active content", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "<table>\n"
      + "<tr><th rowspan=\"2\">Projection</th><th colspan=\"2\">Area</th></tr>\n"
      + "<tr><th>Horizontal</th><th>Vertical</th></tr>\n"
      + "<tr><td>Web</td><td>7</td><td><strong>10</strong><script>unsafe()</script></td></tr>\n"
      + "</table>\n",
    ),
    workspaceRoot,
    requestId: 11,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const table = findElement(html, isTag("table"));
  const rowSpanCell = findElement(html, (element) =>
    element.tagName === "th" && attribute(element, "rowspan") === "2");
  const columnSpanCell = findElement(html, (element) =>
    element.tagName === "th" && attribute(element, "colspan") === "2");

  assert.ok(table, "the raw HTML table was discarded");
  assert.ok(rowSpanCell, "the row span was not preserved");
  assert.ok(columnSpanCell, "the column span was not preserved");
  assert.match(textContent(table), /Projection\s*Area\s*Horizontal\s*Vertical\s*Web\s*7\s*10/u);
  assert.doesNotMatch(result.html, /<script|unsafe\(\)/u);
});

test("raw HTML table cell styles are preserved as safe preview metadata", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      '<table><tr><th style="background: -webkit-linear-gradient(20deg, #09009f, #E743D9); '
      + '-webkit-background-clip: text; -webkit-text-fill-color: transparent">Gradient</th>'
      + '<td style="background-color: red; color: white">Difference</td></tr></table>\n',
    ),
    workspaceRoot,
    requestId: 17,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const gradientCell = findElement(html, (element) =>
    element.tagName === "th" && textContent(element) === "Gradient");
  const colorCell = findElement(html, (element) =>
    element.tagName === "td" && textContent(element) === "Difference");

  assert.ok(gradientCell, "the styled gradient header was not rendered");
  assert.ok(colorCell, "the styled value cell was not rendered");
  assert.equal(
    attribute(gradientCell, "data-myst-table-style"),
    "background: -webkit-linear-gradient(20deg, #09009f, #e743d9); -webkit-background-clip: text; -webkit-text-fill-color: transparent",
  );
  assert.equal(
    attribute(colorCell, "data-myst-table-style"),
    "background-color: red; color: white",
  );
  assert.equal(attribute(gradientCell, "style"), undefined);
  assert.equal(attribute(colorCell, "style"), undefined);

  const rewritten = rewriteSphinxHtml(result.html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const webviewHtml = parseHtml(rewritten.html);
  const stylesheet = findElement(webviewHtml, (element) =>
    element.tagName === "style" && attribute(element, "nonce") === "unit-nonce");
  const styledGradientCell = findElement(webviewHtml, (element) =>
    element.tagName === "th" && hasClass(element, "myst-inline-table-style-1"));
  assert.ok(stylesheet, "safe table styles were not emitted in the nonce stylesheet");
  assert.match(textContent(stylesheet), /-webkit-linear-gradient\(20deg, #09009f, #e743d9\)/u);
  assert.ok(styledGradientCell, "the gradient style class was not attached to the header");
  assert.doesNotMatch(rewritten.html, /data-myst-table-style/u);
});

test("table directives render trusted workspace-local HTML includes", async () => {
  const document = inlineDocument(
    "::::{table} Included table\n:label: tbl:included\n:align: center\n\n"
    + ":::{include} included-table.html\n:::\n::::\n",
  );
  const result = await renderPreviewDocument({
    document,
    workspaceRoot,
    requestId: 12,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const figure = findElement(html, (element) =>
    element.tagName === "figure" && attribute(element, "id") === "tbl:included");
  const table = figure && findElement(figure, isTag("table"));

  assert.ok(table, "the included table was not rendered inside its table directive");
  assert.match(textContent(table), /Imported projection/iu);
  assert.equal(attribute(table, "align"), "center");
  assert.ok(
    result.stage.dependencies.includes(path.join(fixtureDirectory, "included-table.html")),
    "the included file was not recorded as a preview dependency",
  );
  assert.equal(result.diagnostics.length, 0);
});

test("Jupyter table output embeds show a project-build placeholder", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      ":::{table} Notebook table\n:label: tbl:notebook\n\n![](#tbl:data-cars)\n:::\n",
    ),
    workspaceRoot,
    requestId: 16,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const figure = findElement(html, (element) =>
    element.tagName === "figure" && attribute(element, "id") === "tbl:notebook");
  assert.ok(figure);
  const placeholder = findElement(figure, (element) => hasClass(element, "myst-notebook-output"));
  assert.ok(placeholder, "the notebook output was rendered as a broken image");
  assert.match(textContent(placeholder), /#tbl:data-cars/u);
  assert.equal(findElement(figure, isTag("img")), undefined);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].severity, "warning");
  assert.equal(result.diagnostics[0].line, 4);
});

test("block elements carry the source line the editor scrolls against", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("# One\n\nalpha\n\n## Two\n\nbeta\n\n| A | B |\n|---|---|\n| x | y |\n"),
    workspaceRoot,
    requestId: 2,
    isWorkspaceTrusted: () => true,
  });

  assert.match(result.html, /<h1 data-line="1" data-end-line="1">/u);
  assert.match(result.html, /<p data-line="3" data-end-line="3">/u);
  assert.match(result.html, /<h2 data-line="5" data-end-line="5">/u);
  assert.match(result.html, /<p data-line="7" data-end-line="7">/u);
  assert.match(result.html, /<table data-line="9" data-end-line="11">/u);
});

test("multiline blocks retain their full mapped source range", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("First line\ncontinued line\n\nSecond block.\n"),
    workspaceRoot,
    requestId: 21,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const paragraph = findElement(html, (element) =>
    element.tagName === "p" && textContent(element).includes("continued line"));

  assert.ok(paragraph, "the multiline paragraph was not rendered");
  assert.equal(attribute(paragraph, "data-line"), "1");
  assert.equal(attribute(paragraph, "data-end-line"), "2");
});

test("MyST admonitions retain the directive range through the closing fence", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "Before the calibration gate.\n\n"
      + "```{warning} Calibration gate\n"
      + "This warning must be acknowledged before calibration.\n"
      + "```\n",
    ),
    workspaceRoot,
    requestId: 23,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const admonition = findElement(html, (element) =>
    hasClass(element, "admonition") && hasClass(element, "warning"));

  assert.ok(admonition, "the warning admonition was not rendered");
  assert.equal(attribute(admonition, "data-line"), "3");
  assert.equal(attribute(admonition, "data-end-line"), "5");
});

test("standalone hyphenated context tags render as mapped Markdown admonitions", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "Before the allocation context.\n\n"
      + "<fullcycle-model-allocation>\n\n"
      + "```yaml\n"
      + "models:\n"
      + "  planner: gpt-5\n"
      + "```\n\n"
      + "The **allocation body** includes a [link](https://example.com).\n\n"
      + "</fullcycle-model-allocation>\n\n"
      + "After the allocation context.\n",
    ),
    workspaceRoot,
    requestId: 24,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const context = findElement(html, (element) => hasClass(element, "myst-context-admonition"));
  const title = context && findElement(context, (element) => hasClass(element, "admonition-title"));
  const code = context && findElement(context, (element) =>
    element.tagName === "code" && hasClass(element, "language-yaml"));
  const link = context && findElement(context, (element) =>
    element.tagName === "a" && attribute(element, "href") === "https://example.com");

  assert.ok(context, "the standalone context tag was not rendered as an admonition");
  assert.ok(title, "the context tag title was not rendered");
  assert.equal(textContent(title), "<fullcycle-model-allocation>");
  assert.ok(code, "the YAML fence inside the context tag was not rendered as code");
  assert.match(textContent(code), /planner: gpt-5/u);
  assert.ok(link, "Markdown links inside the context tag were not parsed");
  assert.equal(attribute(context, "data-line"), "3");
  assert.equal(attribute(context, "data-end-line"), "12");
  assert.equal(result.diagnostics.length, 0);
  assert.doesNotMatch(result.html, /<fullcycle-model-allocation>/u);
});

test("simple and snake_case context tags preserve adjacent fences and source ranges", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "<context>\n"
      + "```yaml\n"
      + "model: gpt-5.6\n"
      + "```\n"
      + "</context>\n\n"
      + "<instructions>\n\n"
      + "Use the selected model.\n\n"
      + "<model_allocation>\n\n"
      + "Allocation body.\n\n"
      + "</model_allocation>\n\n"
      + "</instructions>\n",
    ),
    workspaceRoot,
    requestId: 27,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const contexts = findElements(html, (element) => hasClass(element, "myst-context-admonition"));
  const titles = contexts.map((context) =>
    textContent(findElement(context, (element) => hasClass(element, "admonition-title"))!),
  );
  const yaml = findElement(contexts[0]!, (element) =>
    element.tagName === "code" && hasClass(element, "language-yaml"));

  assert.deepEqual(titles, ["<context>", "<instructions>", "<model_allocation>"]);
  assert.ok(yaml, "the adjacent YAML fence was not rendered as code");
  assert.match(textContent(yaml), /model: gpt-5\.6/u);
  assert.equal(attribute(contexts[0]!, "data-line"), "1");
  assert.equal(attribute(contexts[0]!, "data-end-line"), "5");
  assert.equal(attribute(contexts[1]!, "data-line"), "7");
  assert.equal(attribute(contexts[1]!, "data-end-line"), "17");
  assert.equal(attribute(contexts[2]!, "data-line"), "11");
  assert.equal(attribute(contexts[2]!, "data-end-line"), "15");
  assert.equal(result.diagnostics.length, 0);
});

test("nested context tags preserve each wrapper range", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "<outer-context>\n\n"
      + "Outer body.\n\n"
      + "<inner-context>\n\n"
      + "Inner body.\n\n"
      + "</inner-context>\n\n"
      + "</outer-context>\n",
    ),
    workspaceRoot,
    requestId: 25,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const contexts = findElements(html, (element) => hasClass(element, "myst-context-admonition"));
  const outerTitle = findElement(contexts[0]!, (element) => hasClass(element, "admonition-title"));
  const innerTitle = findElement(contexts[1]!, (element) => hasClass(element, "admonition-title"));

  assert.equal(contexts.length, 2);
  assert.equal(textContent(outerTitle!), "<outer-context>");
  assert.equal(textContent(innerTitle!), "<inner-context>");
  assert.equal(attribute(contexts[0]!, "data-line"), "1");
  assert.equal(attribute(contexts[0]!, "data-end-line"), "11");
  assert.equal(attribute(contexts[1]!, "data-line"), "5");
  assert.equal(attribute(contexts[1]!, "data-end-line"), "9");
});

test("unsupported context boundaries stay literal and fenced XML stays code", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "<broken-context>\n\n"
      + "This body must remain visible.\n\n"
      + "</different-context>\n\n"
      + "<attribute-context data-mode=\"unsafe\">\n\n"
      + "Attribute body remains visible.\n\n"
      + "</attribute-context>\n\n"
      + "```xml\n"
      + "<fullcycle-model-allocation>\n"
      + "  <child />\n"
      + "</fullcycle-model-allocation>\n"
      + "```\n",
    ),
    workspaceRoot,
    requestId: 26,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const contexts = findElements(html, (element) => hasClass(element, "myst-context-admonition"));
  const xml = findElement(html, (element) =>
    element.tagName === "code" && hasClass(element, "language-xml"));

  assert.equal(contexts.length, 0);
  assert.match(textContent(html), /<broken-context>/u);
  assert.match(textContent(html), /Attribute body remains visible\./u);
  assert.ok(xml, "the XML fence was not rendered as literal code");
  assert.match(textContent(xml), /<fullcycle-model-allocation>/u);
  assert.match(textContent(xml), /<child \/>/u);
  assert.doesNotMatch(result.html, /<attribute-context data-mode=/u);
});

test("standard HTML and inline or fenced XML stay outside context grouping", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "<div class=\"real-html\">\n"
      + "HTML div body.\n"
      + "</div>\n\n"
      + "<details open>\n"
      + "<summary title=\"real\">Real HTML details</summary>\n"
      + "Details body.\n"
      + "</details>\n\n"
      + "<table class=\"real-table\">\n<tr><td>Cell</td></tr>\n</table>\n\n"
      + "<script type=\"application/json\">unsafe()</script>\n\n"
      + "Inline XML: <model_allocation>token</model_allocation>.\n\n"
      + "```xml\n"
      + "<model_allocation>\n"
      + "  <child />\n"
      + "</model_allocation>\n"
      + "```\n",
    ),
    workspaceRoot,
    requestId: 28,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const inlineXml = findElement(html, (element) =>
    element.tagName === "p" && textContent(element).startsWith("Inline XML:"));
  const xml = findElement(html, (element) =>
    element.tagName === "code" && hasClass(element, "language-xml"));

  assert.equal(findElements(html, (element) => hasClass(element, "myst-context-admonition")).length, 0);
  assert.ok(findElement(html, isTag("table")), "the standard HTML table was changed");
  assert.doesNotMatch(result.html, /&#x3C;div class="real-html">/u);
  assert.doesNotMatch(result.html, /&#x3C;details open>/u);
  assert.equal(textContent(inlineXml!), "Inline XML: <model_allocation>token</model_allocation>.");
  assert.ok(xml, "the fenced XML was not rendered as code");
  assert.match(textContent(xml), /<model_allocation>/u);
  assert.match(textContent(xml), /<child \/>/u);
  assert.equal(result.diagnostics.length, 0);
});

test("block source ranges stay absolute when leading frontmatter is stripped", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("---\ntype: finding\nstatus: draft\n---\n# Heading\n\nFirst line\ncontinued line\n"),
    workspaceRoot,
    requestId: 22,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const heading = findElement(html, (element) => element.tagName === "h1");
  const paragraph = findElement(html, (element) =>
    element.tagName === "p" && textContent(element).includes("continued line"));

  assert.ok(heading);
  assert.ok(paragraph);
  assert.equal(attribute(heading, "data-line"), "5");
  assert.equal(attribute(paragraph, "data-line"), "7");
  assert.equal(attribute(paragraph, "data-end-line"), "8");
});

test("project-scoped roles and directives degrade to labelled placeholders", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("Text {cite}`smith2024` here.\n\n```{animation} chart.js\n```\n"),
    workspaceRoot,
    requestId: 3,
    isWorkspaceTrusted: () => true,
  });

  const html = parseHtml(result.html);
  const citation = findElement(html, (element) => hasClass(element, "myst-cite"));
  const directive = findElement(html, (element) => hasClass(element, "myst-directive"));

  assert.ok(citation, "the unresolved citation was not rendered");
  assert.equal(textContent(citation), "[smith2024]");
  assert.ok(directive, "the unknown directive was not rendered");
  assert.match(textContent(directive), /\{animation\} chart\.js/u);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].severity, "warning");
  assert.equal(result.diagnostics[0].line, 3);
});

test("an untrusted workspace refuses to render", async () => {
  await assert.rejects(
    renderPreviewDocument({
      document: inlineDocument("# Nope\n"),
      workspaceRoot,
      requestId: 4,
      isWorkspaceTrusted: () => false,
    }),
    /trusted/u,
  );
});

test("figures and plain images are mapped blocks with their closing source line", async () => {
  const source = "Intro\n\n:::{figure} a.svg\n:alt: x\n\nCap\n:::\n\n"
    + "```{figure} b.svg\n\nCap2\n```\n\n![alt](c.png)\n";
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 3,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const figures = findElements(html, isTag("figure"));
  assert.deepEqual(
    figures.map((figure) => [attribute(figure, "data-line"), attribute(figure, "data-end-line")]),
    [["3", "7"], ["9", "12"]],
  );
  // A lone image paragraph is lifted to a bare <img> by MyST; it must stay a mapped block so the
  // preview can offer an insertion point after it (also as the last block of the document).
  const plain = findElement(html, (element) =>
    element.tagName === "img" && attribute(element, "alt") === "alt");
  assert.ok(plain, "the plain image was not rendered");
  const block = findElement(html, (element) => attribute(element, "data-line") === "14"
    && findElement(element, (child) => child === plain) !== undefined);
  assert.ok(block, "the plain image paragraph carries no source line");
  assert.equal(attribute(block, "data-end-line"), "14");
});

test("image directives are mapped blocks spanning the directive's source lines", async () => {
  const source = "Intro\n\n```{image} b.png\n:alt: x\n```\n\n:::{image} d.png\n:::\n";
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 4,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const blocks = findElements(html, (element) => attribute(element, "data-line") !== undefined
    && findElement(element, isTag("img")) !== undefined);
  assert.deepEqual(
    blocks.map((block) => [attribute(block, "data-line"), attribute(block, "data-end-line")]),
    [["3", "5"], ["7", "8"]],
  );
});

test("tilde pairs render as struck-through text only in prose", async () => {
  const includedPath = path.join(fixtureDirectory, "included-strike.md");
  fs.writeFileSync(includedPath, "Included ~~gone~~ text.\n");
  try {
    const document = inlineDocument(
      "Para ~~gone~~ here and single ~x~ stays.\n\n"
      + "- item ~~gone~~\n\n"
      + "| A |\n| - |\n| ~~gone~~ |\n\n"
      + "`~~code~~`\n\n```text\n~~fenced~~\n```\n\n"
      + "```{include} included-strike.md\n```\n",
    );
    const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
      documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
    const root = parseHtml(result.html);
    const dels = findElements(root, isTag("del"));
    assert.deepEqual(dels.map((del) => textContent(del)), ["gone", "gone", "gone", "gone"]);
    const parents = dels.map((del) => findElement(root, (el) =>
      el.tagName !== "del" && findElements(el, (c) => c === del).length > 0
      && ["p", "li", "td"].includes(el.tagName)));
    assert.deepEqual(parents.map((p) => p?.tagName), ["p", "li", "td", "p"]);
    assert.ok(result.html.includes("~~code~~"), "inline code must stay literal");
    assert.ok(result.html.includes("~~fenced~~"), "fenced code must stay literal");
    assert.ok(result.html.includes("~x~"), "single tilde must stay literal");
  } finally {
    fs.rmSync(includedPath, { force: true });
  }
});

test("a lone raw <img> block is a mapped block with a source line", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument("Before.\n\n<img src=\"img.png\" alt=\"c\">\n\nAfter.\n"),
    workspaceRoot,
    requestId: 3,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(result.html);
  const image = findElement(html, (element) =>
    element.tagName === "img" && attribute(element, "alt") === "c");
  assert.ok(image, "the raw image was not rendered");
  assert.equal(attribute(image, "src"), "img.png");
  const mapped = findElement(html, (element) =>
    attribute(element, "data-line") === "3"
    && findElement(element, (child) => child.tagName === "img") !== undefined);
  assert.ok(mapped, "the raw <img> block carries its source line");
});

test("a table inserted by the edition palette renders as a table with its header", async () => {
  const insertion = createEditActions().byId.get("table")!.apply({
    value: "Intro", selectionStart: 5, selectionEnd: 5, scope: "block", arg: "3x4",
  })!;
  const document = inlineDocument("Intro" + insertion.text + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const root = parseHtml(result.html);
  const tables = findElements(root, isTag("table"));
  assert.equal(tables.length, 1);
  assert.deepEqual(
    findElements(tables[0], isTag("th")).map((cell) => textContent(cell).trim()),
    ["Column 1", "Column 2", "Column 3", "Column 4"],
  );
  const rows = findElements(tables[0], isTag("tr"));
  assert.equal(rows.length, 3, "the header row and two empty rows");
  assert.equal(findElements(rows[2], isTag("td")).length, 4);
});

// T25: what the GFM group of the palette writes renders as an alert, checkboxes and a table.
function paletteInsert(id: string, value: string, at: number, arg?: string): string {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get(id)!.apply({
    value, selectionStart: at, selectionEnd: at, scope: "block", ...(arg === undefined ? {} : { arg }),
  })!;
  return value.slice(0, edit.start) + edit.text + value.slice(edit.end);
}

test("an alert inserted by the edition palette renders as an admonition of the chosen type", async () => {
  const written = paletteInsert("alert", "Mind the gap", 4, "WARNING");
  assert.equal(written, "> [!WARNING]\n> Mind the gap");
  const document = inlineDocument(written + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const admonition = findElement(parseHtml(result.html), (element) =>
    hasClass(element, "admonition") && hasClass(element, "warning"));
  assert.ok(admonition, "the inserted alert was not rendered as an admonition");
  assert.equal(textContent(findElement(admonition, (e) => hasClass(e, "admonition-title"))!), "Warning");
  assert.match(textContent(admonition), /Mind the gap/u);
});

test("checkboxes written by the edition palette render as checkbox inputs", async () => {
  let text = "buy milk\nbake bread";
  text = paletteInsert("checkbox", text, 0);
  const first = text.indexOf("bake");
  text = paletteInsert("checkbox", text, first);
  assert.equal(text, "- [ ] buy milk\n- [ ] bake bread");
  const document = inlineDocument(text + "\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const boxes = findElements(parseHtml(result.html), (element) =>
    element.tagName === "input" && hasClass(element, "myst-checkbox"));
  assert.equal(boxes.length, 2);
});

test("a pipe table converted by the edition palette renders as a table with the same text", async () => {
  const source = "| Name | Qty |\n| :--- | ---: |\n| a & b | <3 |\n| c | 4 |";
  const html = paletteInsert("htmlTable", source, 3);
  assert.equal(html.startsWith("<table>"), true);
  const document = inlineDocument("Intro\n\n" + html + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const tables = findElements(parseHtml(result.html), isTag("table"));
  assert.equal(tables.length, 1);
  assert.deepEqual(
    findElements(tables[0], isTag("th")).map((cell) => textContent(cell).trim()),
    ["Name", "Qty"],
  );
  assert.deepEqual(
    findElements(tables[0], isTag("td")).map((cell) => textContent(cell).trim()),
    ["a & b", "<3", "c", "4"],
  );
  assert.equal(findElements(tables[0], isTag("tr")).length, 3);
});

test("a new HTML table inserted by the edition palette renders as a 2 x 2 table", async () => {
  const html = paletteInsert("htmlTable", "Intro", 5);
  const document = inlineDocument(html + "\n\nAfter.\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const tables = findElements(parseHtml(result.html), isTag("table"));
  assert.equal(tables.length, 1);
  assert.equal(findElements(tables[0], isTag("th")).length, 2);
  assert.equal(findElements(tables[0], isTag("td")).length, 2);
  assert.match(result.html, /After\./u);
});

// T26: what the details, footnote, mermaid, alignment and kbd actions write renders.
async function renderPalette(markdown: string) {
  const document = inlineDocument(markdown + "\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  return { html: parseHtml(result.html), raw: result.html };
}

test("a collapsible section inserted by the edition palette renders as details with a summary", async () => {
  const { html } = await renderPalette(paletteInsert("details", "Intro", 5));
  const details = findElement(html, isTag("details"));
  assert.ok(details, "no details element");
  assert.equal(textContent(findElement(details, isTag("summary"))!).trim(), "Summary");
  assert.match(textContent(details), /Content/u);
});

test("a footnote inserted by the edition palette renders a reference and a definition", async () => {
  const written = paletteInsert("footnote", "A claim.", 7) + "The source.";
  assert.equal(written, "A claim[^1].\n\n[^1]: The source.");
  const { html } = await renderPalette(written);
  const definition = findElement(html, (element) =>
    element.tagName === "li" && attribute(element, "id") === "user-content-fn-1");
  assert.ok(definition, "the footnote definition was not rendered");
  assert.match(textContent(definition), /The source\./u);
});

test("a Mermaid fence inserted by the edition palette renders a diagram container", async () => {
  const { html } = await renderPalette(paletteInsert("mermaid", "Intro", 5));
  const diagram = findElement(html, (element) => hasClass(element, "myst-mermaid-diagram"));
  assert.ok(diagram, "no Mermaid diagram node");
  assert.match(textContent(diagram), /flowchart TD/u);
});

test("a column aligned by the edition palette renders with that alignment only", async () => {
  const source = "| Name | Qty |\n| --- | --- |\n| a | 1 |";
  const at = source.indexOf("Qty");
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("columnAlign")!.apply({
    value: source, selectionStart: at, selectionEnd: at, scope: "block", arg: "right" })!;
  const written = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  const { html } = await renderPalette(written);
  const cells = findElements(html, (element) => element.tagName === "th" || element.tagName === "td");
  assert.equal(cells.length, 4);
  const aligned = cells.map((cell) => /right/u.test((attribute(cell, "align") ?? "") + (attribute(cell, "style") ?? "") + (attribute(cell, "class") ?? "")));
  assert.deepEqual(aligned, [false, true, false, true]);
});

test("a kbd element written by the edition palette is kept in the preview", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("kbd")!.apply({
    value: "Press Ctrl now", selectionStart: 6, selectionEnd: 10, scope: "block" })!;
  const written = "Press Ctrl now".slice(0, edit.start) + edit.text + "Press Ctrl now".slice(edit.end);
  assert.equal(written, "Press <kbd>Ctrl</kbd> now");
  const { html } = await renderPalette(written);
  const key = findElement(html, isTag("kbd"));
  assert.ok(key, "the kbd element was stripped");
  assert.equal(textContent(key), "Ctrl");
});

// T27: amsmath environments, figure size and alignment, and label anchors.
test("an amsmath align environment in a dollar block and in a math directive renders with KaTeX", async () => {
  const environment = "\\begin{align}a&=b\\\\c&=d\\end{align}";
  for (const written of [`$$\n${environment}\n$$`, "```{math}\n" + environment + "\n```"]) {
    const { raw } = await renderPalette(written);
    const typeset = parseHtml(renderMathHtml(raw, "katex.css", "nonce"));
    const math = findElement(typeset, (element) => hasClass(element, "math-display"));
    assert.ok(math, `no display math block for ${written}`);
    assert.equal(attribute(math, "data-studio-math-error"), undefined, "the environment was rejected by KaTeX");
    assert.equal(findElements(math, isTag("mtr")).length, 2, "the two aligned rows were not typeset");
  }
});

test("a figure keeps its width and alignment as data attributes and classes", async () => {
  const { html } = await renderPalette(":::{figure} img/a.png\n:width: 60%\n:align: center\n:alt: A\n\nCaption\n:::");
  const figure = findElement(html, isTag("figure"))!;
  const image = findElement(figure, isTag("img"))!;
  assert.equal(attribute(image, "data-okf-width"), "60%");
  assert.equal(attribute(image, "width"), undefined, "the legacy width attribute must not be left behind");
  assert.ok(hasClass(image, "align-center"), "the image has no align-center class");
  assert.ok(hasClass(figure, "align-center"), "the figure has no align-center class");
  assert.equal(attribute(figure, "style"), undefined);
});

test("an image directive keeps its width and alignment", async () => {
  const { html } = await renderPalette("```{image} img/a.png\n:width: 12.5em\n:align: right\n```");
  const image = findElement(html, isTag("img"))!;
  assert.equal(attribute(image, "data-okf-width"), "12.5em");
  assert.ok(hasClass(image, "align-right"));
});

test("an invalid figure width or alignment is ignored", async () => {
  const { html, raw } = await renderPalette(
    ":::{figure} img/a.png\n:width: 60%;position:fixed\n:align: sideways\n\nCaption\n:::");
  const image = findElement(html, isTag("img"))!;
  assert.equal(attribute(image, "data-okf-width"), undefined);
  assert.equal(attribute(image, "width"), undefined);
  assert.doesNotMatch(raw, /align-sideways|position:fixed/u);
});

test("a label before a paragraph renders an anchor icon span that is the link target", async () => {
  const { html } = await renderPalette("(intro)=\nA paragraph.\n\nSee {ref}`intro` and {ref}`Title <intro>`.");
  const anchors = findElements(html, (element) => hasClass(element, "okf-anchor"));
  assert.equal(anchors.length, 1);
  assert.equal(attribute(anchors[0], "id"), "intro");
  assert.equal(attribute(anchors[0], "data-okf-label"), "intro");
  assert.equal(attribute(anchors[0], "title"), "Anchor: intro");
  assert.equal(attribute(anchors[0], "data-line"), undefined);
  assert.equal(attribute(anchors[0], "data-okf-label-line"), "1");
  const paragraph = findElement(html, isTag("p"))!;
  assert.equal((paragraph.childNodes[0] as HtmlElement), anchors[0], "the anchor is not the first child");
  assert.match(textContent(paragraph), /^A paragraph\./u);
  const links = findElements(html, (element) => element.tagName === "a" && attribute(element, "href") === "#intro");
  assert.deepEqual(links.map((link) => textContent(link)), ["intro", "Title"]);
});

test("a label before a heading keeps one element with the id and adds the icon inside it", async () => {
  const { html, raw } = await renderPalette("(intro)=\n# Heading\n\nSee {ref}`intro`.");
  const heading = findElement(html, isTag("h1"))!;
  assert.equal(attribute(heading, "id"), "intro");
  const anchor = findElement(heading, (element) => hasClass(element, "okf-anchor"))!;
  assert.ok(anchor, "no anchor in the heading");
  assert.equal(attribute(anchor, "data-okf-label"), "intro");
  assert.equal(attribute(anchor, "title"), "Anchor: intro");
  assert.equal((raw.match(/id="intro"/gu) ?? []).length, 1, "the label id is duplicated");
  assert.equal(textContent(heading).trim(), "Heading");
});

test("a label before a list or at the end of the document renders its own anchor row", async () => {
  const { html } = await renderPalette("(items)=\n- a\n- b\n\n(last)=");
  const anchors = findElements(html, (element) => hasClass(element, "okf-anchor"));
  assert.deepEqual(anchors.map((anchor) => attribute(anchor, "id")), ["items", "last"]);
  assert.equal(findElements(html, isTag("ul")).length, 1);
  assert.deepEqual(anchors.map((anchor) => attribute(anchor, "data-okf-label-line")), ["1", "5"]);
  assert.equal(findElement(html, isTag("ul"))!.childNodes.some((node) => "attrs" in node && hasClass(node as HtmlElement, "okf-anchor")), false);
});

test("an anchor icon is not a mapped block or Tab stop, while the labelled blocks keep their mapping", async () => {
  const document = inlineDocument("(intro)=\nA paragraph.\n\n(sec)=\n# Heading\n\n(items)=\n- a\n");
  const result = await renderPreviewDocument({ document, workspaceRoot, requestId: 1,
    documentIdentity: document.uri.fsPath, isWorkspaceTrusted: () => true });
  const rewritten = rewriteSphinxHtml(result.html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    sourceMapping: { sourceFile: document.uri.fsPath, documentId: "preview-1" },
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  const html = parseHtml(rewritten.html);
  const anchors = findElements(html, (element) => hasClass(element, "okf-anchor"));
  assert.equal(anchors.length, 3);
  for (const anchor of anchors) {
    assert.equal(attribute(anchor, "tabindex"), undefined);
    assert.equal(attribute(anchor, "data-sphinx-preview-block"), undefined);
    assert.equal(attribute(anchor, "data-line"), undefined);
    assert.equal(attribute(anchor, "data-sphinx-source-line"), undefined);
  }
  assert.deepEqual(anchors.map((anchor) => attribute(anchor, "data-okf-label-line")), ["1", "4", "7"]);
  const paragraph = findElement(html, isTag("p"))!;
  const heading = findElement(html, isTag("h1"))!;
  for (const block of [paragraph, heading]) {
    assert.ok(attribute(block, "data-sphinx-preview-block"), "labelled block lost its mapping");
    assert.equal(attribute(block, "tabindex"), "0");
  }
});

// T28: what the MyST group of the palette writes renders.
function paletteWrite(id: string, value: string, selection: [number, number], arg?: string): string {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get(id)!.apply({
    value, selectionStart: selection[0], selectionEnd: selection[1], scope: "block",
    ...(arg === undefined ? {} : { arg }),
  })!;
  return value.slice(0, edit.start) + edit.text + value.slice(edit.end);
}

test("an admonition of every palette type renders with its title, empty or wrapped", async () => {
  for (const type of ["note", "tip", "important", "warning", "caution", "danger", "attention", "error", "hint", "seealso"]) {
    for (const written of [paletteWrite("admonition", "Body text", [0, 9], type), paletteWrite("admonition", "Intro", [5, 5], type)]) {
      const { html } = await renderPalette(written);
      const admonition = findElement(html, (element) => hasClass(element, "admonition") && hasClass(element, type));
      assert.ok(admonition, `${type} was not rendered as an admonition: ${written}`);
      assert.ok(findElement(admonition, (e) => hasClass(e, "admonition-title")), `${type} has no title`);
    }
  }
  const nested = paletteWrite("admonition", ":::{note}\nInner\n:::", [0, 19], "warning");
  const { html } = await renderPalette(nested);
  const outer = findElement(html, (e) => hasClass(e, "admonition") && hasClass(e, "warning"))!;
  assert.ok(outer, "outer admonition missing");
  assert.ok(findElement(outer, (e) => hasClass(e, "admonition") && hasClass(e, "note")), "nested note missing");
});

test("a custom admonition from the palette renders its title and class", async () => {
  const written = paletteWrite("admonition", "Body text", [0, 9], "custom").replace("Title", "My title");
  const { html } = await renderPalette(written);
  const admonition = findElement(html, (e) => hasClass(e, "admonition") && hasClass(e, "note"));
  assert.ok(admonition, "no custom admonition");
  assert.equal(textContent(findElement(admonition, (e) => hasClass(e, "admonition-title"))!).trim(), "My title");
  assert.match(textContent(admonition), /Body text/u);
});

test("a definition list from the palette renders a dl with its term and definition", async () => {
  const { html } = await renderPalette(paletteWrite("deflist", "Alpha", [0, 5]));
  const list = findElement(html, isTag("dl"))!;
  assert.ok(list, "no dl");
  assert.equal(textContent(findElement(list, isTag("dt"))!).trim(), "Alpha");
  assert.equal(textContent(findElement(list, isTag("dd"))!).trim(), "Definition");
});

test("inline, display and aligned math from the palette typeset with KaTeX", async () => {
  const inline = paletteWrite("math", "Value x here", [6, 7], "inline");
  const display = paletteWrite("math", "Intro", [5, 5], "display");
  const aligned = paletteWrite("math", "Intro", [5, 5], "aligned");
  for (const [written, selector] of [[inline, "math-inline"], [display, "math-display"], [aligned, "math-display"]] as const) {
    const { raw } = await renderPalette(written);
    const typeset = parseHtml(renderMathHtml(raw, "katex.css", "nonce"));
    const math = findElement(typeset, (element) => hasClass(element, selector));
    assert.ok(math, `no ${selector} for ${written}`);
    assert.equal(attribute(math, "data-studio-math-error"), undefined, `KaTeX rejected ${written}`);
  }
  const { raw } = await renderPalette(aligned);
  const rows = findElements(parseHtml(renderMathHtml(raw, "katex.css", "nonce")), isTag("mtr"));
  assert.equal(rows.length, 1);
});

test("sub and sup written by the palette render sub and sup elements", async () => {
  const { html } = await renderPalette(
    paletteWrite("sub", "H2O", [1, 2]) + " and " + paletteWrite("sup", "x2", [1, 2]));
  assert.equal(textContent(findElement(html, isTag("sub"))!), "2");
  assert.equal(textContent(findElement(html, isTag("sup"))!), "2");
});

test("a label written by the palette renders an anchor icon for the block", async () => {
  const { html } = await renderPalette(paletteWrite("label", "A paragraph.", [0, 0]).replace("label-name", "my-label"));
  const anchor = findElement(html, (e) => hasClass(e, "okf-anchor"))!;
  assert.ok(anchor, "no anchor icon");
  assert.equal(attribute(anchor, "id"), "my-label");
});

test("the anchor carries the source line of its label in a document with frontmatter", async () => {
  const text = "---\ntitle: T\n---\n\n# Head\n\n(intro)=\nA paragraph.\n";
  const { html } = await renderPalette(text);
  const anchor = findElement(html, (element) => hasClass(element, "okf-anchor"))!;
  assert.equal(text.split("\n")[Number(attribute(anchor, "data-okf-label-line")) - 1], "(intro)=");
});

// T30: what the reference, citation, dropdown, captioned table and key actions write renders.
test("T30: a {ref} inserted by the edition palette renders as a link to the label", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("ref")!.apply({
    value: "See ", selectionStart: 4, selectionEnd: 4, scope: "block", arg: "intro" })!;
  const written = "(intro)=\n# Introduction\n\n" + "See ".slice(0, edit.start) + edit.text;
  assert.match(written, /\{ref\}`intro`/u);
  const { html } = await renderPalette(written);
  const link = findElement(html, (element) => element.tagName === "a" && attribute(element, "href") === "#intro");
  assert.ok(link, "the reference was not rendered as a link");
  assert.match(textContent(link), /Introduction/u);
});

test("T30: a {cite} inserted by the edition palette renders the citation placeholder", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("cite")!.apply({
    value: "Claim ", selectionStart: 6, selectionEnd: 6, scope: "block", arg: "smith2024" })!;
  const { html } = await renderPalette("Claim " + edit.text);
  const citation = findElement(html, (element) => hasClass(element, "myst-cite"));
  assert.ok(citation, "no citation placeholder");
  assert.equal(textContent(citation), "[smith2024]");
});

test("T30: a dropdown inserted by the edition palette renders as details with the title", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("dropdown")!.apply({
    value: "", selectionStart: 0, selectionEnd: 0, scope: "block" })!;
  const { html } = await renderPalette(edit.text);
  const details = findElement(html, isTag("details"));
  assert.ok(details, "the dropdown was not rendered as details");
  assert.equal(textContent(findElement(details, isTag("summary"))!).trim(), "Title");
  assert.match(textContent(details), /Content/u);
});

test("T30: a captioned table inserted by the edition palette renders a caption", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("tableCaption")!.apply({
    value: "", selectionStart: 0, selectionEnd: 0, scope: "block" })!;
  const { html } = await renderPalette(edit.text);
  const table = findElement(html, isTag("table"));
  assert.ok(table, "no table");
  assert.match(textContent(findElement(html, (element) =>
    element.tagName === "figcaption" || element.tagName === "caption") ?? table), /Caption/u);
  assert.equal(findElements(html, (element) => element.tagName === "th").length, 2);
});

test("T30: a {kbd} role inserted by the edition palette renders a kbd element", async () => {
  const edit = createEditActions([], createMarkdownTableTools()).byId.get("roleKbd")!.apply({
    value: "Press ", selectionStart: 6, selectionEnd: 6, scope: "block" })!;
  const { html } = await renderPalette("Press " + edit.text + " now");
  const key = findElement(html, isTag("kbd"));
  assert.ok(key, "the {kbd} role was not rendered as a kbd element");
  assert.equal(textContent(key), "Ctrl+K");
});
