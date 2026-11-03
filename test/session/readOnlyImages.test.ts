/**
 * Restricted Mode (a read-only preview) shows images next to the document, with spaces in the file
 * name or in a subfolder, but still reads no include and no dot-directory (CR 238).
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import { createPreviewResourcePolicy } from "../../src/core/security/resource-policy";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";

const SECRET = "PRIVATE-KEY-MATERIAL";
const NAME = "Screenshot 2022-09-09 at 10.49.17.png";
const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
let sandbox = "";
let home = "";

beforeEach(() => {
  sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "readonly-images-")));
  home = path.join(sandbox, "home");
  fs.mkdirSync(path.join(home, "docs", "images dir"), { recursive: true });
  fs.mkdirSync(path.join(home, "docs", ".hidden"), { recursive: true });
  fs.mkdirSync(path.join(home, "other"), { recursive: true });
  fs.mkdirSync(path.join(home, ".ssh"), { recursive: true });
  for (const file of [
    path.join(home, "docs", NAME),
    path.join(home, "docs", "images dir", NAME),
    path.join(home, "docs", ".hidden", "a.png"),
    path.join(home, "docs", "pic.svg"),
    path.join(home, "other", "b.png"),
    path.join(home, "home.png"),
    path.join(home, ".ssh", "c.png"),
  ]) {
    fs.writeFileSync(file, "png");
  }
  fs.writeFileSync(path.join(home, "docs", "part.md"), `${SECRET}\n`);
  process.env.HOME = home;
  process.env.USERPROFILE = home;
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  fs.rmSync(sandbox, { recursive: true, force: true });
});

/** The page html of a read-only preview of `text` in `documentDirectory`; images also reach `root`. */
async function page(text: string, documentDirectory: string, root = documentDirectory): Promise<string> {
  const result = await renderPreviewDocument({
    document: {
      uri: { scheme: "file", fsPath: path.join(documentDirectory, "doc.md") },
      languageId: "markdown",
      version: 1,
      getText: () => text,
    },
    workspaceRoot: documentDirectory,
    readOnly: true,
    requestId: 1,
    isWorkspaceTrusted: () => false,
    allowUntrusted: true,
    plantUmlEngine: "builtin",
  });
  const assets = fakeAssetResolver({ cspSource: "vscode-webview://csp", url: (file) => `webview://${file}` });
  const built = buildPreviewWebviewHtml(
    result.html, result.stage.outputDirectory, assets, undefined, root,
    undefined, undefined, false, false, [], "builtin", true,
  );
  result.stage.dispose();
  return built.html;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a read-only preview shows an image with spaces in its name, next to the document or in a subfolder", async () => {
  const docs = path.join(home, "docs");
  const html = await page(
    `![a](${NAME.replaceAll(" ", "%20")})\n\n![b](<images dir/${NAME}>)\n\n![c](images%20dir/${NAME.replaceAll(" ", "%20")})\n\n![d](pic.svg)\n`,
    docs,
  );
  assert.equal(html.match(/<img /gu)?.length, 4, html);
  assert.ok(html.includes(`src="webview://${path.join(docs, NAME)}"`));
  assert.ok(html.includes(`src="webview://${path.join(docs, "images dir", NAME)}"`));
  assert.doesNotMatch(html, /blocked-resource/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a read-only preview of a document in the home folder shows the images of its own folder only", async () => {
  const html = await page("![a](home.png)\n\n![b](other/b.png)\n\n![c](.ssh/c.png)\n", home);
  assert.ok(html.includes(path.join(home, "home.png")));
  assert.ok(html.includes(path.join(home, "other", "b.png")), "a subfolder of the document folder");
  assert.equal(html.includes("c.png"), false, "a dot-directory stays refused");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a read-only preview refuses an image outside the document folder when the workspace root is the home folder", async () => {
  const docs = path.join(home, "docs");
  const html = await page("![a](../other/b.png)\n\n![b](../home.png)\n\n![c](.hidden/a.png)\n", docs, home);
  assert.equal(html.includes("b.png"), false);
  assert.equal(html.includes("home.png"), false);
  assert.equal(html.includes("a.png"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a read-only preview reaches the images of the workspace root, not its includes or other files", async () => {
  const guide = path.join(sandbox, "ws", "docs", "guide");
  fs.mkdirSync(guide, { recursive: true });
  fs.mkdirSync(path.join(sandbox, "ws", "images"), { recursive: true });
  fs.writeFileSync(path.join(sandbox, "ws", "images", NAME), "png");
  fs.writeFileSync(path.join(sandbox, "ws", "images", "data.csv"), "a,b");
  fs.writeFileSync(path.join(sandbox, "ws", "images", "part.md"), `${SECRET}\n`);
  const text = [
    `![a](../../images/${NAME.replaceAll(" ", "%20")})`,
    "```{include} ../../images/part.md\n```",
  ].join("\n\n");
  const html = await page(
    text,
    guide,
    path.join(sandbox, "ws"),
  );
  assert.ok(html.includes(path.join(sandbox, "ws", "images", NAME)), "the image of the workspace root");
  assert.equal(html.includes(SECRET), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("the policy of a read-only preview serves an image of the workspace root and nothing else there", () => {
  const ws = path.join(sandbox, "ws");
  const guide = path.join(ws, "docs", "guide");
  fs.mkdirSync(guide, { recursive: true });
  fs.mkdirSync(path.join(ws, "images"), { recursive: true });
  fs.writeFileSync(path.join(ws, "images", "x.png"), "png");
  fs.writeFileSync(path.join(ws, "images", "data.csv"), "a,b");
  fs.writeFileSync(path.join(ws, "images", "part.md"), "text");
  const policy = createPreviewResourcePolicy(guide, ws, true);
  const image = { image: true };
  assert.deepEqual(policy.resolveResourceDetailed("../../images/x.png", guide, image), { path: path.join(ws, "images", "x.png") });
  for (const request of ["../../images/data.csv", "../../images/part.md"]) {
    assert.deepEqual(policy.resolveResourceDetailed(request, guide, image), { refusal: "resource-outside-root" }, request);
  }
  assert.deepEqual(policy.resolveResourceDetailed("../../images/x.png", guide), { refusal: "resource-outside-root" }, "without the image option");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a link named .png that leads to another kind of file is not served from the workspace root", (context) => {
  const ws = path.join(sandbox, "ws");
  const guide = path.join(ws, "docs");
  fs.mkdirSync(guide, { recursive: true });
  fs.mkdirSync(path.join(ws, "images"), { recursive: true });
  fs.writeFileSync(path.join(ws, "images", "notes.txt"), "secret");
  fs.writeFileSync(path.join(ws, "images", "real.png"), "png");
  try {
    fs.symlinkSync(path.join(ws, "images", "notes.txt"), path.join(ws, "images", "fake.png"));
    fs.symlinkSync(path.join(ws, "images", "real.png"), path.join(ws, "images", "alias.png"));
  } catch {
    context.skip("symbolic links are unavailable");
    return;
  }
  const policy = createPreviewResourcePolicy(guide, ws, true);
  const image = { image: true };
  assert.deepEqual(policy.resolveResourceDetailed("../images/fake.png", guide, image), { refusal: "resource-outside-root" });
  assert.deepEqual(policy.resolveResourceDetailed("../images/alias.png", guide, image), { path: path.join(ws, "images", "real.png") });
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a read-only preview still refuses an include in the home folder", async () => {
  fs.writeFileSync(path.join(home, "part.md"), `${SECRET}\n`);
  const inHome = await page("```{include} part.md\n```\n", home);
  assert.equal(inHome.includes(SECRET), false);
});
