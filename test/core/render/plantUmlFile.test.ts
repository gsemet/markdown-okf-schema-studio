import * as assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import {
  resetPlantUmlProcessSpawnerForTests,
  setPlantUmlProcessSpawnerForTests,
} from "../../../src/core/render/plantUmlRenderer";
import { renderPreviewDocument, type PreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";

const SEQUENCE = "@startuml\nAlice -> Bob: from a file\n@enduml\n";

/** workspace/{docs/{page.md, diagrams/flow.puml, part.md, sub/inner.puml}, shared/common.puml}, outside/x.puml */
function workspace(): { workspaceRoot: string; docs: string; root: string } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "plantuml-file-")));
  const workspaceRoot = path.join(root, "workspace");
  const docs = path.join(workspaceRoot, "docs");
  fs.mkdirSync(path.join(docs, "diagrams"), { recursive: true });
  fs.mkdirSync(path.join(docs, "sub"), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "shared"), { recursive: true });
  fs.mkdirSync(path.join(root, "outside"), { recursive: true });
  fs.writeFileSync(path.join(docs, "diagrams", "flow.puml"), SEQUENCE);
  fs.writeFileSync(path.join(docs, "sub", "inner.puml"), "@startuml\nX -> Y\n@enduml\n");
  fs.writeFileSync(path.join(docs, "sub", "part.md"), "```{uml} inner.puml\n```\n\n```plantuml\n!include styles.puml\nA -> B\n```\n");
  fs.writeFileSync(path.join(workspaceRoot, "shared", "common.puml"), SEQUENCE);
  fs.writeFileSync(path.join(root, "outside", "x.puml"), SEQUENCE);
  return { workspaceRoot, docs, root };
}

function previewDocument(filePath: string, text: string): PreviewDocument {
  return { uri: { scheme: "file", fsPath: filePath }, languageId: "markdown", version: 1, getText: () => text };
}

async function render(text: string, options: { trusted?: boolean; resourceRoot?: string } = {}) {
  const { workspaceRoot, docs, root } = workspace();
  const documentPath = path.join(docs, "page.md");
  const result = await renderPreviewDocument({
    document: previewDocument(documentPath, text),
    // The extension passes the document's folder as the resource root of a Restricted Mode preview.
    workspaceRoot: options.resourceRoot === "document" ? docs : workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => options.trusted !== false,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
  return { result, html: parseHtml(result.html), docs, root };
}

function diagrams(html: ReturnType<typeof parseHtml>) {
  return findElements(html, (element) => hasClass(element, "myst-plantuml-diagram"));
}

function fileErrors(html: ReturnType<typeof parseHtml>): string[] {
  return findElements(html, (element) => hasClass(element, "myst-plantuml-file-error"))
    .map((element) => textContent(element).trim());
}

test("{uml} path.puml and a body-less {plantuml} path.puml render the file, name it and depend on it", async () => {
  const { result, html, docs } = await render(
    "# Page\n\n```{uml} diagrams/flow.puml\n```\n\n```{plantuml} diagrams/flow.puml\n:caption: Flow\n```\n\n"
      + "```{plantuml}\nInline -> Body\n```\n",
  );
  const found = diagrams(html);
  assert.equal(found.length, 3);
  for (const diagram of found.slice(0, 2)) {
    assert.equal(textContent(diagram).trim(), SEQUENCE.trim());
    assert.equal(attribute(diagram, "data-plantuml-file"), "diagrams/flow.puml");
    assert.equal(attribute(diagram, "data-plantuml-base"), path.join(docs, "diagrams", "flow.puml"),
      "the diagram's own !include lines resolve next to its file");
  }
  const source = findElement(html, (element) => hasClass(element, "myst-plantuml-source"));
  assert.ok(source);
  assert.match(textContent(source), /Alice -> Bob: from a file/u, "the file text is the expandable source");
  assert.equal(textContent(found[2]!).trim(), "Inline -> Body", "a {plantuml} body is still the diagram");
  assert.equal(attribute(found[2]!, "data-plantuml-file"), undefined);
  assert.ok(result.stage.dependencies.includes(path.join(docs, "diagrams", "flow.puml")),
    "a change of the file renders the preview again");
  assert.deepEqual(fileErrors(html), []);
  assert.equal(result.diagnostics.filter((diagnostic) => /PlantUML|uml/u.test(diagnostic.message)).length, 0);
});

test("a missing diagram file shows a clear message, is reported and is watched for its creation", async () => {
  const { result, html, docs } = await render("```{uml} diagrams/later.puml\n```\n\nAfter.\n");
  assert.equal(diagrams(html).length, 0, "no diagram for the engines to draw");
  assert.deepEqual(fileErrors(html), ["PlantUML file not found: diagrams/later.puml."]);
  const message = findElement(html, (element) => hasClass(element, "myst-plantuml-error"));
  assert.ok(message, "the message uses the PlantUML error style");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.message === "PlantUML file not found: diagrams/later.puml."
    && diagnostic.line === 1 && diagnostic.severity === "warning"));
  assert.ok(result.stage.dependencies.includes(path.join(docs, "diagrams", "later.puml")));
});

test("a diagram file outside the bounds is refused like an {include}; Restricted Mode keeps to the document's folder", async () => {
  const outside = await render("```{uml} ../../outside/x.puml\n```\n");
  assert.deepEqual(fileErrors(outside.html), [
    "PlantUML file ../../outside/x.puml is outside the folders the preview reads "
      + "(the workspace, or only the document's folder in Restricted Mode).",
  ]);
  assert.equal(outside.result.stage.dependencies.length, 0, "a refused path outside the roots is not watched");

  const absolute = await render(`\`\`\`{uml} ${path.join(outside.root, "outside", "x.puml")}\n\`\`\`\n`);
  assert.match(fileErrors(absolute.html)[0] ?? "", /must be a relative path to a local file/u);

  const trusted = await render("```{uml} ../shared/common.puml\n```\n");
  assert.equal(diagrams(trusted.html).length, 1, "a trusted preview reads the workspace");
  const restricted = await render("```{uml} ../shared/common.puml\n```\n", { trusted: false, resourceRoot: "document" });
  assert.equal(diagrams(restricted.html).length, 0);
  assert.match(fileErrors(restricted.html)[0] ?? "", /outside the folders the preview reads/u);
});

test("a {uml} directive with neither a file nor a body says so", async () => {
  const { html, result } = await render("```{uml}\n```\n");
  assert.deepEqual(fileErrors(html), ["The {uml} directive needs a diagram file path or a diagram body."]);
  assert.ok(result.diagnostics.some((diagnostic) => /needs a diagram file path/u.test(diagnostic.message)));
});

test("in an included document, {uml} resolves next to it and inline diagrams take it as their include base", async () => {
  const { html, docs } = await render("```{include} sub/part.md\n```\n");
  const [file, inline] = diagrams(html);
  assert.ok(file && inline);
  assert.equal(textContent(file).trim(), "@startuml\nX -> Y\n@enduml");
  assert.equal(attribute(file, "data-plantuml-base"), path.join(docs, "sub", "inner.puml"));
  assert.equal(attribute(inline, "data-plantuml-base"), path.join(docs, "sub", "part.md"));
});

test("without a readDiagramFile hook the {include} resolver reads the file", async () => {
  const result = await renderMyst("```{uml} flow.puml\n```\n", {
    sourcePath: "/docs/page.md",
    resolveInclude: (request) => (request === "flow.puml" ? { path: "/docs/flow.puml", source: SEQUENCE } : undefined),
  });
  assert.match(result.html, /data-plantuml-file="flow.puml"/u);
  assert.deepEqual(result.dependencies, ["/docs/flow.puml"]);
});

test("with useJar the JAR receives the text of the {uml} file", async () => {
  const inputs: string[] = [];
  setPlantUmlProcessSpawnerForTests({
    spawn: (() => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: Object.assign(new EventEmitter(), { end: (data: string) => { inputs.push(data); } }),
        kill: () => true,
        exitCode: null,
        signalCode: null,
      });
      process.nextTick(() => {
        child.stdout.emit("data", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
        child.emit("close", 0, null);
      });
      return child;
    }) as never,
  });
  try {
    const { workspaceRoot, docs } = workspace();
    const result = await renderPreviewDocument({
      document: previewDocument(path.join(docs, "page.md"), "```{uml} diagrams/flow.puml\n```\n"),
      workspaceRoot,
      requestId: 1,
      isWorkspaceTrusted: () => true,
      plantUmlEngine: "jar",
    });
    assert.equal((await result.resolvePlantUml()).diagrams[0]?.status, "rendered");
    assert.deepEqual(inputs.map((input) => input.trim()), [SEQUENCE.trim()]);
  } finally {
    resetPlantUmlProcessSpawnerForTests();
  }
});
