import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parse } from "parse5";

import { injectContentSecurityPolicy } from "../../src/core/security/html-sanitizer";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("the policy is spliced into the head and the rest of the page is left as written", () => {
  const html = injectContentSecurityPolicy(
    "<!DOCTYPE html><html><head><title>t</title></head><body><p hidden>a --> b</p></body></html>",
    "default-src 'none'; img-src a&b",
  );

  assert.equal(
    html,
    "<!DOCTYPE html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src a&amp;b\"><title>t</title></head><body><p hidden>a --> b</p></body></html>",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("a weaker policy meta in the head is dropped, in any case and quoting", () => {
  const html = injectContentSecurityPolicy(
    "<html><head><META HTTP-EQUIV='content-security-policy' content='default-src *'><meta charset=\"UTF-8\"></head><body><meta http-equiv=\"Content-Security-Policy\" content=\"x\">ok</body></html>",
    "default-src 'none'",
  );

  assert.doesNotMatch(html, /default-src \*/u);
  assert.match(html, /<body><meta http-equiv="Content-Security-Policy" content="x">ok<\/body>/u);
  assert.match(html, /<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'"><meta charset="UTF-8"><\/head>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("a document without a head element still gets the policy", () => {
  const html = injectContentSecurityPolicy("<p>ok</p>", "default-src 'none'");

  assert.match(html, /<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'">(?:<\/meta>)?<\/head>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("a head-like text in an attribute of the root element does not swallow the policy", () => {
  const html = injectContentSecurityPolicy(
    "<!DOCTYPE html><html aria-label=\"<head>\"><head><title>t</title></head><body><p>x</p></body></html>",
    "default-src 'none'",
  );

  interface Node {
    nodeName: string;
    attrs?: { name: string; value: string }[];
    childNodes?: Node[];
  }
  const find = (node: Node, name: string): Node | undefined =>
    node.nodeName === name ? node : node.childNodes?.map((child) => find(child, name)).find(Boolean);
  const head = find(parse(html) as unknown as Node, "head");
  const metas = (head?.childNodes ?? []).filter((node) => node.nodeName === "meta");

  assert.ok(metas.some((meta) => meta.attrs?.some((a) => a.name === "http-equiv" && a.value === "Content-Security-Policy")));
});
