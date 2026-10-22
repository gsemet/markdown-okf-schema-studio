import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../src/preview/previewStyles";
import { showMermaidError } from "../../src/webview/mermaidError";
import { FakeDocument, FakeElement } from "./fakeDom";

function diagramWithSource(doc: FakeDocument): FakeElement {
  const diagram = doc.add("div", { class: "myst-mermaid-diagram" });
  diagram.textContent = "flowchart TD\n  A[Start --> B";
  return diagram;
}

test("K3: an invalid diagram rendered several times shows exactly one error with one details", () => {
  const doc = new FakeDocument();
  const diagram = diagramWithSource(doc);
  for (const message of ["Parse error on line 2", "Parse error on line 2", "Parse error on line 3"]) {
    showMermaidError(diagram as unknown as HTMLElement, message);
  }
  assert.equal(diagram.querySelectorAll(".myst-mermaid-error").length, 1);
  assert.equal(diagram.querySelectorAll("details").length, 1);
  assert.match(diagram.querySelector(".myst-mermaid-error")!.textContent, /Unable to render Mermaid diagram/u);
  assert.match(diagram.querySelector("details")!.textContent, /Parse error on line 3/u);
  assert.doesNotMatch(diagram.querySelector("details")!.textContent, /line 2/u);
});

test("K3: the error comes first and the diagram source stays below it", () => {
  const doc = new FakeDocument();
  const diagram = diagramWithSource(doc);
  showMermaidError(diagram as unknown as HTMLElement, "bad");
  showMermaidError(diagram as unknown as HTMLElement, "bad");
  assert.ok((diagram.firstChild as FakeElement).matches(".myst-mermaid-error"));
  assert.match(diagram.textContent, /flowchart TD/u);
});

test("K3: the parser message is plain text, never HTML, and the details start closed", () => {
  const doc = new FakeDocument();
  const diagram = diagramWithSource(doc);
  showMermaidError(diagram as unknown as HTMLElement, "<img src=x onerror=alert(1)>");
  assert.equal(diagram.querySelectorAll("img").length, 0);
  assert.equal(diagram.querySelector("details")!.hasAttribute("open"), false);
  assert.ok(diagram.querySelector("details")!.textContent.includes("<img src=x"));
});

test("K3: the details are styled in the stylesheet", () => {
  assert.match(PREVIEW_THEME_CSS, /\.myst-mermaid-error-details\b[^{]*\{/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-mermaid-error-details pre\s*\{[^}]*(overflow-x: auto|white-space: pre-wrap)/u);
});
