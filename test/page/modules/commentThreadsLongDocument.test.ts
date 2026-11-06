import * as assert from "node:assert/strict";
import { test } from "node:test";

import { reanchorThreads } from "../../../src/core/comments/anchoring";
import type { CommentThread } from "../../../src/core/comments/commentModel";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import { installCommentThreads } from "../../../src/page/modules/commentThreads";
import { parseHtml, type HtmlNode } from "../../core/render/dom";
import { inlineDocument, workspaceRoot } from "../../core/render/mystFeaturesSupport";
import { FakeDocument, FakeElement, FakeText, provideGlobalElement } from "./fakeDom";

/**
 * CR 266: comments of a long document (the repository README) were in the comments file but not
 * highlighted. The cause is not the length: a source paragraph wrapped over several lines keeps
 * the line break in its rendered text node, and the quote (the selected text, whitespace
 * collapsed) has a space there, so the page found the quote in no text node. The README wraps
 * every paragraph; a short test document does not.
 */

const SECTION = (n: number): string[] => [
  `## Section ${n}`,
  "",
  `Paragraph ${n}a is wrapped at about eighty columns like the repository README, so the rendered`,
  `text of block ${n}a keeps a line break in the middle of the sentence and goes on to a third`,
  `line number ${n}.`,
  "",
  `- Item ${n}b: a list item that is long enough to be wrapped over two lines in the source of`,
  `  the document, with the second line indented by two spaces.`,
  `- Item ${n}c fits on one line.`,
  "",
  "| Column | Image |",
  "| --- | --- |",
  `| Cell ${n}d wraps? no | ![Icon ${n}](images/icon-${n}.png) |`,
  "",
  `Text ${n}e with **bold**, a [link](https://example.com/${n}) and \`code\` followed by a long tail`,
  `that wraps onto the next line of the source.`,
  "",
];

const HEADER = [
  "<div align=\"center\">",
  "",
  "<picture>",
  "<img src=\"images/logo.png\" alt=\"Logo\" width=\"96\">",
  "</picture>",
  "",
  "# Long README",
  "",
  "</div>",
  "",
  "[![CI](https://example.com/badge.svg)](https://example.com/ci) [![License](https://example.com/l.svg)](LICENSE)",
  "",
];

function readme(sections: number): string {
  const lines = [...HEADER];
  for (let n = 1; n <= sections; n += 1) lines.push(...SECTION(n));
  return `${lines.join("\n")}\n`;
}

async function renderHtml(text: string): Promise<string> {
  const result = await renderPreviewDocument({
    document: inlineDocument(text), workspaceRoot, requestId: 1, isWorkspaceTrusted: () => true,
  });
  return rewriteSphinxHtml(result.html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    sourceMapping: { sourceFile: "inline.md", documentId: "doc" },
    resolveResource: (request) => ({ path: request, uri: `vscode-resource:${request}` }),
    resolveNavigation: (request) => ({ kind: "external", value: request }),
  }).html;
}

/** The rendered content as the fake DOM of the page tests (element, attributes, text nodes). */
function toFake(document: FakeDocument, node: HtmlNode, parent: FakeElement): void {
  const children = "childNodes" in node ? node.childNodes : [];
  for (const child of children) {
    if (child.nodeName === "#text" && "value" in child) {
      parent.appendChild(new FakeText(child.value));
    } else if ("tagName" in child && "attrs" in child) {
      const element = document.createElement(child.tagName);
      for (const attribute of child.attrs) element.setAttribute(attribute.name, attribute.value);
      parent.appendChild(element);
      toFake(document, child, element);
    }
  }
}

async function pageOf(text: string): Promise<FakeDocument> {
  const document = new FakeDocument();
  provideGlobalElement(FakeElement);
  const body = parseHtml(await renderHtml(text));
  toFake(document, body, document.content);
  return document;
}

const collapse = (value: string): string => value.replace(/\s+/gu, " ");
const innerBlock = (element: FakeElement): FakeElement | null => element.closest("[data-line]");

interface Target {
  block: FakeElement;
  /** Whole text of the node, as rendered. */
  node: string;
  /** Collapsed text of the other text nodes of the block before and after this one. */
  before: string;
  after: string;
}

/** Text nodes that belong to a mapped block of their own, in paragraphs, list items and cells. */
function targets(document: FakeDocument): Target[] {
  const found: Target[] = [];
  for (const block of document.content.querySelectorAll("[data-line]")) {
    if (!["P", "LI", "TD"].includes(block.tagName.toUpperCase())) continue;
    if (block.closest("pre") || block.closest("[data-okf-properties]")) continue;
    const own: string[] = [];
    const walk = (parent: FakeElement): void => {
      for (const child of parent.childNodes) {
        if (child instanceof FakeText) own.push(child.nodeValue);
        else if (child instanceof FakeElement && !child.hasAttribute("data-line") && !["CODE", "PRE", "SVG"].includes(child.tagName.toUpperCase())) walk(child);
      }
    };
    walk(block);
    own.forEach((value, index) => {
      if (collapse(value).trim().length >= 20) {
        found.push({
          block,
          node: value,
          before: collapse(own.slice(0, index).join("")),
          after: collapse(own.slice(index + 1).join("")),
        });
      }
    });
  }
  return found;
}

function threadFor(id: string, target: Target, quote: string): CommentThread {
  const line = Number(target.block.getAttribute("data-line"));
  const end = Number(target.block.getAttribute("data-end-line") ?? line);
  return {
    id,
    anchor: { line, endLine: end, quote, prefix: target.before.slice(-32), suffix: target.after.slice(0, 32) },
    resolved: false,
    createdAt: "2026-11-06T10:00:00Z",
    comments: [{ id: `c_${id}`, author: "Ada", createdAt: "2026-11-06T10:00:00Z", body: "Why?" }],
  };
}

/** What the compose box stores for a selection: the selected text with whitespace collapsed. */
const wholeNode = (target: Target): string => collapse(target.node).trim();
/** A selection that starts before the first line break of the node and ends after it. */
function acrossBreak(target: Target): string | undefined {
  const at = target.node.indexOf("\n");
  if (at < 0) return undefined;
  const left = collapse(target.node.slice(0, at)).trim().split(" ").slice(-3).join(" ");
  const right = collapse(target.node.slice(at + 1)).trim().split(" ").slice(0, 3).join(" ");
  return `${left} ${right}`;
}

/** The host re-anchors the threads against the document text, then the page places them. */
function place(document: FakeDocument, text: string, threads: CommentThread[]): { marks: number; badges: number; orphans: number } {
  const outcome = reanchorThreads(text, threads);
  const comments = installCommentThreads(document as never, { innerWidth: 800, innerHeight: 600 } as never);
  comments.setThreads(outcome.threads.map((thread) => ({ ...thread, orphaned: outcome.orphaned.has(thread.id) })));
  return {
    marks: document.querySelectorAll("[data-okf-comment-thread]").length,
    badges: document.querySelectorAll("[data-okf-comment-badge]").length,
    orphans: document.querySelectorAll("[data-okf-comment-orphan]").length,
  };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-216
test("CR266: every comment of a long README-like document is highlighted on its text", async () => {
  const text = readme(40);
  assert.ok(text.split("\n").length > 600, "a long document");
  const document = await pageOf(text);
  const found = targets(document);
  assert.ok(found.length > 150, `many commentable text nodes (${found.length})`);
  const threads = found.map((target, index) => threadFor(`t${index}`, target, wholeNode(target)));
  const result = place(document, text, threads);
  assert.deepEqual(result, { marks: threads.length, badges: 0, orphans: 0 });
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-216
test("CR266: a quote that spans a soft line break of the source is highlighted, short document too", async () => {
  const text = readme(1);
  const document = await pageOf(text);
  const textBefore = document.content.textContent;
  const found = targets(document).filter((target) => acrossBreak(target) !== undefined);
  assert.ok(found.length >= 2, "wrapped paragraphs and list items exist");
  const threads = found.map((target, index) => threadFor(`b${index}`, target, acrossBreak(target) as string));
  const result = place(document, text, threads);
  assert.deepEqual(result, { marks: threads.length, badges: 0, orphans: 0 });
  const marked = document.querySelectorAll("[data-okf-comment-thread]");
  // The highlight keeps the text of the page as it was.
  assert.ok(marked.every((mark) => /\s/u.test(mark.textContent)));
  assert.equal(collapse(document.content.textContent), collapse(textBefore));
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-216
test("CR266: the highlight of a quote over a line break keeps the text of the page", () => {
  const document = new FakeDocument();
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, { innerWidth: 800, innerHeight: 600 } as never);
  const one = document.add("p", { "data-line": "1", "data-end-line": "2" }, document.content, "alpha beta\ngamma delta");
  comments.setThreads([{
    id: "t1",
    anchor: { line: 1, endLine: 2, quote: "beta gamma", prefix: "", suffix: "" },
    resolved: false, createdAt: "", comments: [],
  }]);
  const marks = document.querySelectorAll("[data-okf-comment-thread]");
  assert.equal(marks.length, 1);
  assert.equal(marks[0].textContent, "beta\ngamma");
  assert.equal(one.textContent, "alpha beta\ngamma delta");
  assert.equal(innerBlock(marks[0]), one);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-216
test("CR266: a quote with a word the wrapped text does not hold stays a badge", () => {
  const document = new FakeDocument();
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, { innerWidth: 800, innerHeight: 600 } as never);
  const block = document.add("p", { "data-line": "1", "data-end-line": "2" }, document.content, "alpha beta\ngamma delta");
  comments.setThreads([{
    id: "t1",
    anchor: { line: 1, endLine: 2, quote: "beta  delta", prefix: "", suffix: "" },
    resolved: false, createdAt: "", comments: [],
  }]);
  assert.equal(document.querySelectorAll("[data-okf-comment-thread]").length, 0);
  assert.equal(document.querySelectorAll("[data-okf-comment-badge]").length, 1);
  assert.equal(block.textContent, "alpha beta\ngamma delta");
});
