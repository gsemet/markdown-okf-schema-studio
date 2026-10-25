import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import { createContentSecurityPolicy } from "../../src/core/security/csp";
import {
  injectContentSecurityPolicy,
  rewriteSphinxHtml,
  sanitizeCss,
} from "../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../src/core/security/resource-policy";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-025
// @tests_req SwRS-MDOKFSTUDIO-TRUST-036
// @tests_req SwRS-MDOKFSTUDIO-TRUST-042
test("rewrites local resources and removes active HTML content", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-html-test-"));
  temporaryDirectories.push(output);
  for (const file of ["theme.css", "theme.js", "image.png", "font.woff2", "movie.mp4", "chapter.html"]) {
    fs.writeFileSync(path.join(output, file), file);
  }
  const policy = new ResourcePolicy([{ label: "output", directory: output }]);
  const resolveResource = (request: string, baseDirectory: string) => {
    const resourcePath = policy.resolveResource(request, baseDirectory);
    return resourcePath ? { path: resourcePath, uri: `webview://${path.basename(resourcePath)}` } : undefined;
  };
  const result = rewriteSphinxHtml(
    "<!doctype html><html><head><link rel=\"stylesheet\" href=\"theme.css\"><script src=\"theme.js\"></script></head><body onload=\"run()\"><svg onload=\"run()\"><g><script>alert(1)</script><foreignObject>bad</foreignObject></g></svg><img src=\"image.png\" srcset=\"image.png 1x, data:image/png;base64,AAAA 2x\" onclick=\"run()\"><video poster=\"image.png\"><source src=\"movie.mp4\"></video><a href=\"chapter.html\">chapter</a><a href=\"javascript:alert(1)\">bad</a><iframe src=\"image.png\"></iframe></body></html>",
    {
      outputRoot: output,
      policy,
      nonce: "unit-nonce",
      resolveResource,
      resolveNavigation: (request, baseDirectory) => {
        const navigation = policy.resolveNavigation(request, baseDirectory);
        if (navigation.kind === "local") {
          return { path: navigation.path, uri: `webview://${path.basename(navigation.path)}` };
        }
        return navigation;
      },
    },
  );

  assert.match(result.html, /webview:\/\/theme\.css/);
  assert.match(result.html, /webview:\/\/image\.png/);
  assert.match(result.html, /webview:\/\/movie\.mp4/);
  assert.match(result.html, /nonce=\"unit-nonce\"/);
  assert.doesNotMatch(result.html, /onclick|onload|href="javascript:|foreignObject|<iframe/iu);
  assert.doesNotMatch(result.html, /href="webview:\/\/chapter\.html"/u);
  assert.match(result.html, /href="#"[^>]+data-sphinx-preview-navigation="chapter\.html"/u);
  assert.match(result.html, /data-sphinx-preview-navigation="javascript:alert\(1\)"/u);
  assert.match(result.html, /srcset=\"webview:\/\/image\.png 1x\"/);
  assert.ok(
    result.diagnostics.some((entry) =>
      entry.code === "blocked-inline-script" || entry.code === "blocked-svg-content",
    ),
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-011
test("reduced previews remove external scripts while retaining contained media", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-html-test-"));
  temporaryDirectories.push(output);
  fs.writeFileSync(path.join(output, "theme.js"), "alert(1)");
  fs.writeFileSync(path.join(output, "image.png"), "image");
  const policy = new ResourcePolicy([{ label: "output", directory: output }]);
  const result = rewriteSphinxHtml(
    '<html><body><script src="theme.js"></script><img src="image.png" alt="image"></body></html>',
    {
      outputRoot: output,
      policy,
      nonce: "unit-nonce",
      allowExternalScripts: false,
      resolveResource: (request, baseDirectory) => {
        const resourcePath = policy.resolveResource(request, baseDirectory);
        return resourcePath ? { path: resourcePath, uri: `webview://${path.basename(resourcePath)}` } : undefined;
      },
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );

  assert.doesNotMatch(result.html, /<script/u);
  assert.match(result.html, /webview:\/\/image\.png/u);
  assert.ok(result.diagnostics.some((entry) => entry.code === "blocked-script"));
});

test("maps rendered source lines to the active preview document", () => {
  const result = rewriteSphinxHtml(
    '<html><body><main><h1 data-line="1">Title</h1><p data-line="4" data-end-line="6">Body</p><p>Unmapped</p></main></body></html>',
    {
      outputRoot: "/workspace",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      sourceMapping: { sourceFile: "/workspace/active.md", documentId: "preview-1" },
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );

  assert.match(result.html, /<h1 data-line="1"[^>]*data-sphinx-source-file="\/workspace\/active\.md"[^>]*data-sphinx-source-line="1"[^>]*data-sphinx-preview-document="preview-1"[^>]*data-sphinx-preview-block="source-block-1"[^>]*tabindex="0"/u);
  assert.match(result.html, /<p data-line="4" data-end-line="6"[^>]*data-sphinx-source-end-line="6"[^>]*data-sphinx-preview-block="source-block-2"[^>]*tabindex="0">Body<\/p>/u);
  assert.match(result.html, /<p dir="auto">Unmapped<\/p>/u);
});

test("keeps the included-block marker next to the source mapping", () => {
  const result = rewriteSphinxHtml(
    '<html><body><main><p data-line="3" data-end-line="4" data-sphinx-preview-included="true">In</p></main></body></html>',
    {
      outputRoot: "/workspace",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      sourceMapping: { sourceFile: "/workspace/active.md", documentId: "preview-1" },
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );
  assert.match(result.html, /data-sphinx-preview-included="true"/u);
  assert.match(result.html, /data-sphinx-source-line="3"[^>]*data-sphinx-source-end-line="4"/u);
});

test("CR038: a column width in percent becomes a stylesheet rule; other widths are dropped", () => {
  const result = rewriteSphinxHtml(
    '<html><head></head><body><table><colgroup>'
    + '<col data-myst-table-style="width: 25%"><col data-myst-table-style="width: 75%">'
    + '<col data-myst-table-style="width: 400px"><col data-myst-table-style="width: calc(100vw)">'
    + '</colgroup><tr><td>a</td><td>b</td><td>c</td><td>d</td></tr></table></body></html>',
    {
      outputRoot: "/tmp",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );
  assert.match(result.html, /\.myst-inline-table-style-1\s*\{[^}]*width: 25%/u);
  assert.match(result.html, /\.myst-inline-table-style-2\s*\{[^}]*width: 75%/u);
  assert.doesNotMatch(result.html, /400px|calc|data-myst-table-style|style="/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-022
test("rewrites sanitized table styles into a nonce-bearing stylesheet", () => {
  const result = rewriteSphinxHtml(
    '<html><head></head><body><table><tr>'
    + '<th data-myst-table-style="background: -webkit-linear-gradient(20deg, #09009f, #e743d9); '
    + '-webkit-background-clip: text; -webkit-text-fill-color: transparent">Gradient</th>'
    + '<td data-myst-table-style="background-color: red; color: white; position: fixed; '
    + 'background-image: url(javascript:alert(1))">Difference</td>'
    + '</tr></table><p data-myst-table-style="color: red">Not a table cell</p>'
    + '<p style="color: red">Direct style</p></body></html>',
    {
      outputRoot: "/tmp",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );

  assert.match(result.html, /<style nonce="unit-nonce" data-sphinx-preview-table-styles="">/u);
  assert.match(result.html, /\.myst-inline-table-style-1\s*\{[^}]*-webkit-background-clip: text/u);
  assert.match(result.html, /\.myst-inline-table-style-2\s*\{[^}]*background-color: red; color: white/u);
  assert.doesNotMatch(result.html, /data-myst-table-style|style="|javascript:|position:\s*fixed/u);
});

test("blocks hostile CSS imports, schemes, and URLs while preserving local assets", () => {
  const css = [
    "@import url('https://example.test/remote.css');",
    '@import "https://example.test/no-semicolon.css" screen',
    "@font-face { src: url('font.woff2'); }",
    ".remote { background: url(data:image/png;base64,AAAA); }",
    ".script { background: url(javascript:alert(1)); }",
  ].join("\n");
  const sanitized = sanitizeCss(css, (request) => (request === "font.woff2" ? "font.woff2" : undefined));

  assert.match(sanitized, /@import url\("about:blank"\)|blocked @import/);
  assert.match(sanitized, /url\("font\.woff2"\)/);
  assert.doesNotMatch(sanitized, /https:\/\/example|data:image|javascript:/iu);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-012
test("generates a restrictive nonce-bearing CSP", () => {
  const csp = createContentSecurityPolicy("vscode-webview://unit", "nonce-value");

  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src vscode-webview:\/\/unit 'nonce-nonce-value'/);
  assert.match(csp, /img-src vscode-webview:\/\/unit data:/);
  assert.doesNotMatch(csp, /\*/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});

test("adds the CSP as a head meta without retaining a weaker policy", () => {
  const html = injectContentSecurityPolicy(
    "<html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src *\"></head><body>ok</body></html>",
    "default-src 'none'; img-src vscode-webview://unit",
  );

  assert.equal((html.match(/Content-Security-Policy/gu) ?? []).length, 1);
  assert.doesNotMatch(html, /default-src \*/u);
  assert.match(html, /img-src vscode-webview:\/\/unit/);
});

test("removes refresh metadata with surrounding whitespace", () => {
  const result = rewriteSphinxHtml(
    '<html><head><meta http-equiv=" refresh " content="0;url=https://evil.test"></head><body>ok</body></html>',
    {
      outputRoot: "/tmp",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );

  assert.doesNotMatch(result.html, /http-equiv/iu);
});

test("keeps deferred relative navigation inert and host-routable", () => {
  const result = rewriteSphinxHtml(
    '<html><body><h1 data-sphinx-source-file="/workspace/active.md" data-sphinx-source-line="4" data-sphinx-preview-block="heading">Title</h1><img src="image.png"><a href="chapter-two.md">Next</a></body></html>',
    {
      outputRoot: "/tmp",
      policy: new ResourcePolicy([]),
      nonce: "unit-nonce",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "deferred", value: "chapter-two.md" }),
    },
  );

  assert.match(result.html, /<main[^>]+aria-label="Markdown OKF-Schema Studio preview content"/u);
  assert.match(result.html, /data-sphinx-source-line="4"[^>]+tabindex="0"/u);
  assert.match(result.html, /<img[^>]+alt=""/u);
  assert.match(result.html, /href="#"[^>]+data-sphinx-preview-navigation="chapter-two\.md"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-031
test("resolves parent-relative figure images through the workspace root", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-figure-test-"));
  temporaryDirectories.push(workspace);
  const documentDirectory = path.join(workspace, "book", "chapters");
  const images = path.join(workspace, "book", "external-img");
  fs.mkdirSync(documentDirectory, { recursive: true });
  fs.mkdirSync(images, { recursive: true });
  const figure = path.join(images, "figure.svg");
  fs.writeFileSync(figure, "<svg/>");

  // Mirrors buildPreviewWebviewHtml's policy composition: the document directory is
  // the base for relative resolution, the workspace root bounds what may leave it.
  const policy = new ResourcePolicy([
    { label: "preview document directory", directory: documentDirectory },
    { label: "workspace root", directory: workspace },
  ]);
  const resolveResource = (request: string, baseDirectory: string) => {
    const resourcePath = policy.resolveResource(request, baseDirectory);
    return resourcePath ? { path: resourcePath, uri: `webview://${resourcePath}` } : undefined;
  };
  const html = `<figure><img src="../external-img/figure.svg" alt="figure"></figure>`;
  const rewritten = rewriteSphinxHtml(html, {
    outputRoot: documentDirectory,
    policy,
    nonce: "figure-test",
    resolveResource,
    resolveNavigation: () => ({ kind: "blocked" }),
  });

  assert.match(rewritten.html, /src="webview:\/\/[^"]*external-img\/figure\.svg"/u);
  assert.doesNotMatch(rewritten.html, /blocked-resource/u);
  assert.ok(!rewritten.diagnostics.some((diagnostic) => diagnostic.code === "blocked-resource"));
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-008
test("strips figure images that escape even the workspace root", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-figure-test-"));
  temporaryDirectories.push(workspace);
  const documentDirectory = path.join(workspace, "book", "chapters");
  fs.mkdirSync(documentDirectory, { recursive: true });

  const policy = new ResourcePolicy([
    { label: "preview document directory", directory: documentDirectory },
    { label: "workspace root", directory: workspace },
  ]);
  const resolveResource = (request: string, baseDirectory: string) => {
    const resourcePath = policy.resolveResource(request, baseDirectory);
    return resourcePath ? { path: resourcePath, uri: `webview://${resourcePath}` } : undefined;
  };
  const html = `<figure><img src="../../../etc/hostname" alt="escape"></figure>`;
  const rewritten = rewriteSphinxHtml(html, {
    outputRoot: documentDirectory,
    policy,
    nonce: "figure-test",
    resolveResource,
    resolveNavigation: () => ({ kind: "blocked" }),
  });

  assert.doesNotMatch(rewritten.html, /\ssrc=/u);
  assert.ok(rewritten.diagnostics.some((diagnostic) => diagnostic.code === "blocked-resource"));
});

test("data-okf-width keeps a plain length and nothing else", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-html-test-"));
  temporaryDirectories.push(output);
  const policy = new ResourcePolicy([{ label: "output", directory: output }]);
  const result = rewriteSphinxHtml(
    "<body><main><img data-okf-width=\"60%\"><img data-okf-width=\"12.5em\"><img data-okf-width=\"300\">"
    + "<img data-okf-width=\"60%;position:fixed\"><img data-okf-width=\"url(x)\"><img data-okf-width=\"\"></main></body>",
    {
      outputRoot: output,
      policy,
      nonce: "unit-nonce",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }) as never,
    },
  );
  assert.deepEqual([...result.html.matchAll(/data-okf-width="([^"]*)"/gu)].map((match) => match[1]),
    ["60%", "12.5em", "300"]);
  assert.doesNotMatch(result.html, /position:fixed|url\(x\)/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-034
test("span style keeps only hex and rgb colour and background-color as data attributes", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-html-test-"));
  temporaryDirectories.push(output);
  const policy = new ResourcePolicy([{ label: "output", directory: output }]);
  const run = (body: string) => rewriteSphinxHtml(`<body><main>${body}</main></body>`, {
    outputRoot: output,
    policy,
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }) as never,
  });
  const kept = run("<span style=\"color: #c00; background-color: rgba(1, 2, 3, 0.5)\">a</span>");
  assert.match(kept.html, /<span data-okf-color="#c00" data-okf-background="rgba\(1, 2, 3, 0\.5\)">a<\/span>/u);
  assert.doesNotMatch(kept.html, /style=/u);
  assert.equal(kept.diagnostics.length, 0);

  for (const style of [
    "color: red", "color: url(x)", "color: expression(1)", "color: var(--x)", "color: #c00 !important",
    "color: #c00 /* x */", "color: rgb(300,0,0)", "color: rgba(0,0,0,2)", "position: fixed",
    "background: #c00", "color: #c00; position: fixed",
  ]) {
    const result = run(`<span style="${style}">a</span>`);
    assert.doesNotMatch(result.html, /style=|url\(|expression|var\(|!important|\/\*|position/u, style);
    assert.ok(result.diagnostics.length > 0, `diagnostic for ${style}`);
    const colours = [...result.html.matchAll(/data-okf-(?:color|background)="([^"]*)"/gu)].map((match) => match[1]);
    assert.deepEqual(colours, style === "color: #c00; position: fixed" ? ["#c00"] : [], style);
  }

  const other = run("<p style=\"color: #c00\">a</p><b style=\"color: #c00\">b</b><b data-okf-color=\"#c00\">c</b>"
    + "<span data-okf-color=\"red\">d</span><span data-okf-background=\"#fff\">e</span>");
  assert.doesNotMatch(other.html, /style=|data-okf-color="(?:#c00|red)"/u);
  assert.match(other.html, /data-okf-background="#fff"/u);
  assert.ok(other.diagnostics.length >= 4);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-041
test("emits dir=auto on block elements and keeps only ltr, rtl and auto", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-html-test-"));
  temporaryDirectories.push(output);
  const policy = new ResourcePolicy([{ label: "output", directory: output }]);
  const result = rewriteSphinxHtml(
    "<html><body><main><h1>T</h1><p>a</p><p dir=\"rtl\">b</p><p dir=\"RTL \">c</p><p dir=\"evil\">d</p>"
    + "<ul><li>e</li></ul><blockquote>f</blockquote><table><tr><th>g</th><td>h</td></tr></table><div>i</div></main></body></html>",
    {
      outputRoot: output,
      policy,
      nonce: "n",
      resolveResource: () => undefined,
      resolveNavigation: () => ({ kind: "blocked" }),
    },
  );
  for (const tag of ["h1", "li", "blockquote", "th", "td"]) {
    assert.match(result.html, new RegExp(`<${tag}[^>]* dir="auto"`, "u"), tag);
  }
  assert.match(result.html, /<p dir="auto">a<\/p>/u);
  assert.match(result.html, /<p dir="rtl">b<\/p>/u);
  assert.match(result.html, /<p dir="rtl">c<\/p>/u);
  assert.match(result.html, /<p dir="auto">d<\/p>/u);
  assert.doesNotMatch(result.html, /evil/u);
  assert.doesNotMatch(result.html, /<div[^>]* dir=/u);
  assert.ok(result.diagnostics.some((entry) => entry.code === "blocked-dir"));
});
