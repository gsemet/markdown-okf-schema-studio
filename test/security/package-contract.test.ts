import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

const extensionRoot = path.resolve(__dirname, "../../..");

test("extension icon is a 256 pixel PNG and the Sphinx favicon matches the shared logo", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as { icon: string };
  assert.equal(manifest.icon, "images/logo.png");
  const icon = fs.readFileSync(path.join(extensionRoot, manifest.icon));
  assert.deepEqual(icon.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(icon.readUInt32BE(16), 256);
  assert.equal(icon.readUInt32BE(20), 256);
  assert.equal(
    fs.readFileSync(path.join(extensionRoot, "sphinx/_static/favicon.svg"), "utf8"),
    fs.readFileSync(path.join(extensionRoot, "images/logo.svg"), "utf8"),
  );
});

test("contributes only opt-in Markdown OKF-Schema Studio commands", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    name: string;
    displayName: string;
    scripts: Record<string, string>;
    contributes: {
      commands: Array<{ command: string; title: string; category?: string; icon?: string }>;
      customEditors: Array<{ viewType: string; displayName: string; selector: Array<{ filenamePattern: string }>; priority: string }>;
      menus: Record<string, unknown>;
      configuration: { title: string; properties: Record<string, unknown> };
      [key: string]: unknown;
    };
  };
  const serialized = JSON.stringify(packageJson.contributes);

  assert.equal(packageJson.name, "markdown-okf-schema-studio");
  assert.equal(packageJson.displayName, "Markdown OKF-Schema Studio");
  assert.match(packageJson.scripts["test:integration"], /npm run bundle/u);
  assert.deepEqual(packageJson.contributes.commands, [
    {
      command: "markdown-okf-schema-studio.openPreview",
      title: "Open Preview to Side",
      category: "Markdown OKF-Schema Studio",
      icon: "$(book)",
      enablement: "resourceExtname == .md",
    },
    {
      command: "markdown-okf-schema-studio.refreshPreview",
      title: "Refresh Preview",
      category: "Markdown OKF-Schema Studio",
      enablement: "resourceExtname == .md",
    },
  ]);
  assert.doesNotMatch(serialized, /markdown\./u);
  assert.deepEqual(packageJson.contributes.customEditors, [{
    viewType: "markdown-okf-schema-studio.editor",
    displayName: "Markdown OKF-Schema Studio",
    selector: [{ filenamePattern: "*.md" }],
    priority: "option",
  }]);
  assert.deepEqual(packageJson.contributes.menus.commandPalette, [
    {
      command: "markdown-okf-schema-studio.openPreview",
      when: "resourceExtname == .md",
    },
    {
      command: "markdown-okf-schema-studio.refreshPreview",
      when: "resourceExtname == .md",
    },
  ]);
  assert.deepEqual(packageJson.contributes.menus["editor/title"], [
    {
      command: "markdown-okf-schema-studio.openPreview",
      when: "resourceExtname == .md && activeEditor == workbench.editors.files.textFileEditor",
      group: "navigation",
    },
  ]);
  assert.deepEqual(packageJson.contributes.menus["explorer/context"], [
    {
      command: "markdown-okf-schema-studio.openPreview",
      when: "resourceExtname == .md",
      group: "navigation",
    },
  ]);
  assert.deepEqual(packageJson.contributes.keybindings, [
    {
      command: "markdown-okf-schema-studio.openPreview",
      key: "ctrl+k shift+v",
      mac: "cmd+k shift+v",
      when: "editorTextFocus && resourceExtname == .md",
    },
  ]);
  assert.equal(packageJson.contributes.configuration.title, "Markdown OKF-Schema Studio");
  assert.deepEqual(
    Object.keys(packageJson.contributes.configuration.properties).sort(),
    [
      "markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks",
      "markdownOkfSchemaStudio.frontmatter.bundleRoot",
      "markdownOkfSchemaStudio.frontmatter.projectRoot",
      "markdownOkfSchemaStudio.frontmatter.propertiesTable",
      "markdownOkfSchemaStudio.frontmatter.strictAdditionalProperties",
      "markdownOkfSchemaStudio.plantuml.jarPath",
      "markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor",
      "markdownOkfSchemaStudio.preview.incrementalUpdates",
      "markdownOkfSchemaStudio.preview.markEditorSelection",
      "markdownOkfSchemaStudio.preview.maxContentWidth",
      "markdownOkfSchemaStudio.preview.scrollEditorWithPreview",
      "markdownOkfSchemaStudio.preview.scrollPreviewWithEditor",
      "markdownOkfSchemaStudio.preview.stickyHeadingDepth",
    ],
  );
  assert.equal(
    packageJson.contributes.configuration.properties["markdown.preview.scrollPreviewWithEditor"],
    undefined,
  );
  assert.equal(packageJson.contributes.languages, undefined);
  assert.equal(packageJson.contributes.grammars, undefined);
  assert.equal(packageJson.contributes.editors, undefined);
});

test("pins Node 24 and keeps the lockfile on the official npm registry", () => {
  assert.equal(fs.readFileSync(path.join(extensionRoot, ".nvmrc"), "utf8").trim(), "24");
  const lockfile = fs.readFileSync(path.join(extensionRoot, "package-lock.json"), "utf8");
  const packages = JSON.parse(lockfile).packages as Record<string, { resolved?: string }>;
  const resolved = Object.values(packages).flatMap((entry) => entry.resolved ? [entry.resolved] : []);
  assert.ok(resolved.length > 0);
  for (const source of resolved) {
    const url = new URL(source);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "registry.npmjs.org");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
  }
  assert.doesNotMatch(lockfile, /_authToken|password\s*:/iu);
});

test("every contributed setting is explained with a markdownDescription and a unique order", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: { configuration: { properties: Record<string, Record<string, unknown>> } };
  };
  const properties = packageJson.contributes.configuration.properties;
  const orders: number[] = [];
  for (const [key, property] of Object.entries(properties)) {
    const text = property.markdownDescription;
    assert.equal(typeof text, "string", `${key} needs a markdownDescription`);
    assert.ok((text as string).trim().length > 0, `${key} markdownDescription is empty`);
    assert.ok((text as string).length <= 700, `${key} markdownDescription exceeds 700 characters`);
    assert.ok(Number.isInteger(property.order), `${key} needs an integer order`);
    assert.equal(property.description, undefined, `${key} must not keep a plain description`);
    orders.push(property.order as number);
  }
  assert.equal(new Set(orders).size, orders.length, "orders must be unique");

  const jarText = properties["markdownOkfSchemaStudio.plantuml.jarPath"].markdownDescription as string;
  assert.ok(!jarText.includes("Absolute"), "jarPath text must not claim the path is absolute");
  assert.ok(jarText.includes("PATH"), "jarPath text must mention PATH");
  const doubleClick = properties["markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor"]
    .markdownDescription as string;
  assert.ok(doubleClick.includes("scrollEditorWithPreview"));
});
