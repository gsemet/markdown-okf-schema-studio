import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isSafeSvgPresentationValue, sanitizeSvg, SVG_THEME_VARIABLES, type SvgNode } from "../../src/core/security/svgSanitizer";

function html(node: SvgNode): string {
  if (node.type === "text") return node.value;
  const attributes = Object.entries(node.properties).map(([name, value]) => ` ${name}="${value}"`).join("");
  return `<${node.tagName}${attributes}>${node.children.map(html).join("")}</${node.tagName}>`;
}

function sanitize(source: string, prefix = "p1-") {
  const result = sanitizeSvg(source, prefix);
  assert.ok(result, "a picture is returned");
  return { html: html(result.element), removed: result.removed };
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("keeps a plain picture with its viewBox, size and drawing elements", () => {
  const { html: out, removed } = sanitize(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="320"><rect x="1" y="2" width="30" height="10" rx="3" fill="var(--surface)" stroke="var(--border)"/><text x="5" y="9" text-anchor="middle">Hi</text></svg>',
  );
  assert.match(out, /^<svg viewBox="0 0 100 50" width="320">/u);
  assert.match(out, /<rect x="1" y="2" width="30" height="10" rx="3" fill="var\(--surface\)" stroke="var\(--border\)"><\/rect>/u);
  assert.match(out, /<text x="5" y="9" text-anchor="middle">Hi<\/text>/u);
  assert.deepEqual(removed, []);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("removes script elements with their content", () => {
  const { html: out, removed } = sanitize('<svg><script>alert(1)</script><g><script src="x.js"></script><circle r="2"/></g></svg>');
  assert.doesNotMatch(out, /script|alert/u);
  assert.match(out, /<circle r="2">/u);
  assert.ok(removed.includes("<script>"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("removes event handler attributes", () => {
  const { html: out, removed } = sanitize('<svg onload="alert(1)"><rect onclick="alert(2)" onmouseover="x()" width="5"/></svg>');
  assert.doesNotMatch(out, /on(?:load|click|mouseover)|alert/u);
  assert.match(out, /<rect width="5">/u);
  assert.ok(removed.includes("onload") && removed.includes("onclick"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("removes foreignObject with the HTML inside it", () => {
  const { html: out } = sanitize('<svg><foreignObject width="10" height="10"><div onclick="x()">hello <b>bold</b></div></foreignObject><rect width="1"/></svg>');
  assert.doesNotMatch(out, /foreignObject|hello|<div|<b>/iu);
  assert.match(out, /<rect width="1">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("removes a link to an external page, keeping its content out of the picture", () => {
  const { html: out, removed } = sanitize('<svg><a href="https://example.com/x"><text x="1">go</text></a><a xlink:href="javascript:alert(1)"><rect width="3"/></a></svg>');
  assert.doesNotMatch(out, /<a[ >]|href|example\.com|javascript/iu);
  assert.ok(removed.includes("<a>"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("removes the style element and a style attribute that is not a presentation property", () => {
  const { html: out } = sanitize(
    '<svg><style>@import url(https://evil.test/x.css); rect { fill: red }</style><rect width="2" style="position: fixed; fill: var(--accent); background: url(https://evil.test/a.png)"/></svg>',
  );
  assert.doesNotMatch(out, /<style|@import|evil\.test|position|background|style=/iu);
  assert.match(out, /<rect width="2" fill="var\(--accent\)">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("drops a use that points outside the picture and keeps one that points at an id of it", () => {
  const { html: out } = sanitize(
    '<svg><defs><g id="dot"><circle r="1"/></g></defs><use href="https://example.com/s.svg#a"/><use xlink:href="//evil.test/s.svg#a"/><use href="data:image/svg+xml,x"/><use href="#dot" x="4"/></svg>',
    "k-",
  );
  assert.doesNotMatch(out, /example\.com|evil\.test|data:/u);
  assert.equal(out.match(/<use /gu)?.length, 1, "a use with no target in the picture is removed");
  assert.match(out, /<use href="#k-dot" x="4">/u);
  assert.match(out, /<g id="k-dot">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("removes javascript, data and external URLs from attribute values", () => {
  const { html: out, removed } = sanitize(
    '<svg><rect width="1" fill="url(javascript:alert(1))"/><rect width="2" fill="url(https://evil.test/p.svg#a)"/><rect width="3" stroke="url(data:image/svg+xml,x)"/><path d="M0 0" fill="javascript:alert(1)"/></svg>',
  );
  assert.doesNotMatch(out, /javascript|evil\.test|data:|url\(h/iu);
  assert.ok(removed.includes("fill") && removed.includes("stroke"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("renames each id and the references to it, so two pictures never share one", () => {
  const source = '<svg><defs><linearGradient id="g"><stop offset="0" stop-color="var(--blue)"/></linearGradient><clipPath id="c"><rect width="9"/></clipPath></defs><rect width="5" fill="url(#g)" clip-path="url(#c)"/><use href="#g"/></svg>';
  const first = sanitize(source, "okf-svg-1-").html;
  const second = sanitize(source, "okf-svg-2-").html;
  assert.match(first, /id="okf-svg-1-g"/u);
  assert.match(first, /fill="url\(#okf-svg-1-g\)"/u);
  assert.match(first, /clip-path="url\(#okf-svg-1-c\)"/u);
  assert.match(first, /<use href="#okf-svg-1-g">/u);
  assert.doesNotMatch(first, /okf-svg-2/u);
  assert.match(second, /id="okf-svg-2-g"/u);
  assert.doesNotMatch(second, /okf-svg-1/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-126
test("an unknown variable without a fallback takes the text colour; a known one and a fallback stay", () => {
  const { html: out } = sanitize(
    '<svg><rect width="1" fill="var(--nope)"/><rect width="2" fill="var(--nope, #123456)"/><rect width="3" fill="var(--surface)"/><rect width="4" fill="var( --text )"/></svg>',
  );
  assert.match(out, /<rect width="1" fill="var\(--text\)">/u);
  assert.match(out, /<rect width="2" fill="var\(--nope, #123456\)">/u);
  assert.match(out, /<rect width="3" fill="var\(--surface\)">/u);
  assert.match(out, /<rect width="4" fill="var\( --text \)">/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-126
test("the vocabulary holds the names of the owner's answer and each follows a --studio token", () => {
  for (const name of ["surface", "background", "bg", "border", "text", "foreground", "fg", "muted", "accent", "primary", "red", "green", "blue", "orange"]) {
    assert.match(SVG_THEME_VARIABLES[name] ?? "", /^var\(--studio-/u, name);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("title and desc keep only text; an element inside them is dropped", () => {
  const { html: out } = sanitize('<svg><title>Plan <script>x()</script></title><desc><b>bold</b> words</desc></svg>');
  assert.match(out, /<desc>bold words<\/desc>/u);
  assert.doesNotMatch(out, /<script|<b>/u);
  assert.match(out, /<title>Plan x\(\)<\/title>/u, "the text of the title survives as text, never as markup");
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("returns nothing when the source holds no svg element", () => {
  assert.equal(sanitizeSvg("<div>not a picture</div>", "p-"), undefined);
  assert.equal(sanitizeSvg("", "p-"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("drops a reference whose id is not an id of the same picture", () => {
  const first = sanitize('<svg><defs><linearGradient id="a"/></defs><rect width="1" fill="url(#a)"/></svg>', "okf-svg-1-").html;
  assert.match(first, /fill="url\(#okf-svg-1-a\)"/u);
  const { html: out, removed } = sanitize(
    '<svg><defs><g id="own"><circle r="1"/></g></defs><use href="#okf-svg-1-a"/><use href="#sphinx-myst-preview-content"/><use xlink:href="#own"/><rect width="2" fill="url(#okf-svg-1-a)"/><rect width="3" stroke="url(#own)"/></svg>',
    "okf-svg-2-",
  );
  assert.doesNotMatch(out, /okf-svg-1|sphinx-myst/u);
  assert.equal(out.match(/<use /gu)?.length, 1);
  assert.match(out, /<use href="#okf-svg-2-own">/u);
  assert.match(out, /<rect width="3" stroke="url\(#okf-svg-2-own\)">/u);
  assert.match(out, /<rect width="2">/u);
  assert.ok(removed.includes("fill"));
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("a value is an allow-list: no other function than colours, var, url(#id) and transforms, and no scheme", () => {
  const { html: out, removed } = sanitize(
    "<svg><rect width=\"1\" fill=\"image-set('https://e.test/x.png' 1x)\"/><rect width=\"2\" style=\"font-family: src(https://e.test/f)\"/>"
    + '<rect width="3" fill="expression(alert(1))"/><rect width="4" fill="url(\'x.png\')"/><rect width="5" stroke="https://e.test/a"/>'
    + '<rect width="6" fill="rgb(1 2 3)" transform="translate(1 2) rotate(5)"/><text font-family="&quot;Helvetica Neue&quot;, sans-serif">t</text></svg>',
  );
  assert.doesNotMatch(out, /image-set|src\(|e\.test|expression|x\.png/u);
  assert.match(out, /<rect width="6" fill="rgb\(1 2 3\)" transform="translate\(1 2\) rotate\(5\)">/u);
  assert.match(out, /<text font-family=""Helvetica Neue", sans-serif">t<\/text>/u, "a quoted font name stays");
  assert.ok(removed.includes("fill") && removed.includes("stroke") && removed.includes("style: font-family"));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-036
test("the value check of the final sanitizer accepts a presentation value and refuses a remote one", () => {
  assert.equal(isSafeSvgPresentationValue("url(#a)"), true);
  assert.equal(isSafeSvgPresentationValue("var(--text, rgb(1,2,3))"), true);
  assert.equal(isSafeSvgPresentationValue("url(https://e.test/a.svg#a)"), false);
  assert.equal(isSafeSvgPresentationValue("url(//e.test/a)"), false);
  assert.equal(isSafeSvgPresentationValue("image-set(x 1x)"), false);
  assert.equal(isSafeSvgPresentationValue("javascript:alert(1)"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("keeps an author's accessible name as text and renames the ids it points at", () => {
  const result = sanitizeSvg('<svg aria-label="Revenue (EUR), see https://e.test" aria-labelledby="t other"><title id="t">T</title></svg>', "p1-");
  assert.ok(result);
  assert.equal(result.element.properties["aria-label"], "Revenue (EUR), see https://e.test");
  assert.equal(result.element.properties["aria-labelledby"], "p1-t");
});
