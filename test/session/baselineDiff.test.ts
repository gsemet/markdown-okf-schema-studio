/** The text at HEAD rendered for the side-by-side diff (CR 147): the real render and sanitizer. */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { renderBaselineContent } from "../../src/session/features/baselineDiff";
import { fakeAssetResolver } from "../shared/fakeAssets";

const stage: any = {
  activeDocumentPath: "/ws/doc.md",
  activeDocumentIdentity: "file:///ws/doc.md",
  activeDocumentRevision: 4,
  requestId: 9,
};

function stubs() {
  const manager: any = {
    host: { workspace: { trusted: true }, previewRenderer: undefined },
    plantUml: { engineFor: () => "builtin" },
    rendering: {
      runtimeContext: (headStage: any) => ({
        documentId: headStage.activeDocumentIdentity,
        revision: headStage.activeDocumentRevision,
        requestId: headStage.requestId,
        activeSourceFile: headStage.activeDocumentPath,
      }),
    },
  };
  const preview: any = {
    workspaceRoot: "/ws",
    restrictedReads: false,
    plantUmlConfiguration: {},
    configuration: {},
    panel: { assets: fakeAssetResolver({ cspSource: "vscode-resource:", url: (filePath) => `vscode-resource:${filePath}` }) },
  };
  return { manager, preview };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: the HEAD text is rendered as the content of the page, its blocks numbered by the lines of that text", async () => {
  const { manager, preview } = stubs();
  const html = await renderBaselineContent(manager, preview, stage, "# Title\n\nOld paragraph.\n\n- one\n- two\n");
  assert.ok(html !== undefined);
  assert.doesNotMatch(html, /<html|<main|<body/u, "only the inner HTML of the content container");
  assert.match(html, /<h1[^>]*data-line="1"[^>]*>/u);
  assert.match(html, /<p[^>]*data-line="3"[^>]*>Old paragraph\.<\/p>/u);
  assert.match(html, /data-sphinx-source-line="3"/u);
  assert.doesNotMatch(html, /nonce\s*=|<script/iu);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
test("CR147: raw scripts of the HEAD text never reach the page", async () => {
  const { manager, preview } = stubs();
  const html = await renderBaselineContent(manager, preview, stage, "Text\n\n<script>alert(1)</script>\n\nAfter\n");
  assert.ok(html === undefined || !/<script/iu.test(html));
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("CR251: in Restricted Mode the HEAD text shows an image of the workspace folder outside the document folder", async () => {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "baseline-readonly-")));
  try {
    const guide = path.join(sandbox, "ws", "docs", "guide");
    fs.mkdirSync(guide, { recursive: true });
    fs.mkdirSync(path.join(sandbox, "ws", "images"));
    fs.writeFileSync(path.join(sandbox, "ws", "images", "x.png"), "png");
    const { manager, preview } = stubs();
    manager.host.workspace.trusted = false;
    preview.restrictedReads = true;
    preview.workspaceRoot = guide;
    preview.workspaceFolder = { path: path.join(sandbox, "ws") };
    const readOnlyStage = { ...stage, activeDocumentPath: path.join(guide, "doc.md") };
    const html = await renderBaselineContent(manager, preview, readOnlyStage, "![x](../../images/x.png)\n");
    assert.ok(html !== undefined);
    assert.ok(html.includes(`src="vscode-resource:${path.join(sandbox, "ws", "images", "x.png")}"`), html);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
