import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

const extensionRoot = path.resolve(__dirname, "../../..");

/** One category of the Settings UI (`contributes.configuration` in its array form). */
interface ConfigurationCategory {
  title: string;
  order: number;
  properties: Record<string, Record<string, unknown>>;
}

/** Every contributed setting, whatever its category. */
function contributedSettings(categories: ConfigurationCategory[]): Record<string, Record<string, unknown>> {
  return Object.assign({}, ...categories.map((category) => category.properties)) as Record<string, Record<string, unknown>>;
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-074
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

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024
// @tests_req SwRS-MDOKFSTUDIO-LIFE-003
// @tests_req SwRS-MDOKFSTUDIO-LIFE-018
// @tests_req SwRS-MDOKFSTUDIO-LIFE-032
// @tests_req SwRS-MDOKFSTUDIO-LIFE-001
// @tests_req SwRS-MDOKFSTUDIO-LIFE-156
test("contributes only opt-in Markdown OKF-Schema Studio commands", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    name: string;
    displayName: string;
    scripts: Record<string, string>;
    contributes: {
      commands: Array<{ command: string; title: string; category?: string; icon?: string }>;
      customEditors: Array<{ viewType: string; displayName: string; selector: Array<{ filenamePattern: string }>; priority: string }>;
      menus: Record<string, unknown>;
      configuration: ConfigurationCategory[];
      [key: string]: unknown;
    };
  };
  const serialized = JSON.stringify(packageJson.contributes);

  assert.equal(packageJson.name, "markdown-okf-schema-studio");
  assert.equal(packageJson.displayName, "Markdown OKF-Schema Studio");
  assert.match(packageJson.scripts["test:integration"], /npm run bundle/u);
  // CR 119 appended the four edit-mode commands (asserted below); the first two are unchanged.
  assert.deepEqual(packageJson.contributes.commands.slice(0, 2), [
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
  assert.deepEqual((packageJson.contributes.menus.commandPalette as unknown[]).slice(0, 2), [
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
  assert.deepEqual((packageJson.contributes.keybindings as unknown[]).slice(0, 1), [
    {
      command: "markdown-okf-schema-studio.openPreview",
      key: "ctrl+k shift+v",
      mac: "cmd+k shift+v",
      when: "editorTextFocus && resourceExtname == .md",
    },
  ]);
  // The Settings UI shows the categories in this order, most used first; every setting sits in the
  // category of its key prefix.
  const categories = packageJson.contributes.configuration;
  assert.ok(Array.isArray(categories), "the settings are contributed as ordered categories");
  assert.deepEqual(
    categories.map((category) => [category.title, category.order]),
    [["Preview", 1], ["Editing", 2], ["Frontmatter", 3], ["Comments", 4], ["PlantUML", 5]],
  );
  for (const category of categories) {
    const prefix = `markdownOkfSchemaStudio.${category.title.toLowerCase()}.`;
    for (const key of Object.keys(category.properties)) {
      assert.ok(key.startsWith(prefix), `${key} belongs to the ${category.title} category`);
    }
  }
  const properties = contributedSettings(categories);
  assert.deepEqual(
    Object.keys(properties).sort(),
    [
      "markdownOkfSchemaStudio.comments.authorName",
      "markdownOkfSchemaStudio.editing.defaultPaletteMode",
      "markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks",
      "markdownOkfSchemaStudio.frontmatter.bundleRoot",
      "markdownOkfSchemaStudio.frontmatter.projectRoot",
      "markdownOkfSchemaStudio.frontmatter.propertiesTable",
      "markdownOkfSchemaStudio.frontmatter.strictAdditionalProperties",
      "markdownOkfSchemaStudio.plantuml.jarPath",
      "markdownOkfSchemaStudio.plantuml.useJar",
      "markdownOkfSchemaStudio.preview.codeBlocks.darkBackground",
      "markdownOkfSchemaStudio.preview.codeBlocks.lineNumbers",
      "markdownOkfSchemaStudio.preview.incrementalUpdates",
      "markdownOkfSchemaStudio.preview.markEditorSelection",
      "markdownOkfSchemaStudio.preview.maxContentWidth",
      "markdownOkfSchemaStudio.preview.scrollEditorWithPreview",
      "markdownOkfSchemaStudio.preview.scrollPreviewWithEditor",
      "markdownOkfSchemaStudio.preview.showComments",
      "markdownOkfSchemaStudio.preview.showIncomingChanges",
      "markdownOkfSchemaStudio.preview.stickyHeadingDepth",
    ],
  );
  const showComments = properties[
    "markdownOkfSchemaStudio.preview.showComments"
  ] as { type: string; default: boolean; order: number; markdownDescription: string };
  assert.equal(showComments.type, "boolean");
  assert.equal(showComments.default, true);
  assert.equal(showComments.order, 21);
  assert.match(showComments.markdownDescription, /\*\*On\*\*.*\*\*Off\*\*/u);
  const authorName = properties[
    "markdownOkfSchemaStudio.comments.authorName"
  ] as { type: string; default: string; order: number; markdownDescription: string; description?: string; scope?: string };
  assert.equal(authorName.type, "string");
  // @tests_req SwRS-MDOKFSTUDIO-REVIEW-065
  assert.equal(authorName.scope, "resource", "a workspace or folder can override the author name");
  assert.equal(authorName.default, "");
  assert.equal(authorName.order, 50);
  assert.match(authorName.markdownDescription, /Git/u);
  assert.match(authorName.markdownDescription, /empty/iu);
  assert.match(authorName.markdownDescription, /user name/iu);
  const showIncomingChanges = properties[
    "markdownOkfSchemaStudio.preview.showIncomingChanges"
  ] as { type: string; default: boolean; order: number; markdownDescription: string };
  assert.equal(showIncomingChanges.type, "boolean");
  assert.equal(showIncomingChanges.default, true);
  assert.equal(showIncomingChanges.order, 22);
  assert.match(showIncomingChanges.markdownDescription, /\*\*On\*\*.*\*\*Off\*\*/u);
  // @tests_req SwRS-MDOKFSTUDIO-CODE-039
  // @tests_req SwRS-MDOKFSTUDIO-CODE-040
  for (const [name, order] of [["darkBackground", 23], ["lineNumbers", 24]] as const) {
    const codeSetting = properties[
      `markdownOkfSchemaStudio.preview.codeBlocks.${name}`
    ] as { type: string; default: boolean; scope?: string; order: number; markdownDescription: string };
    assert.equal(codeSetting.type, "boolean", name);
    assert.equal(codeSetting.default, true, `${name} is on by default`);
    assert.equal(codeSetting.scope, "resource", name);
    assert.equal(codeSetting.order, order, name);
    assert.match(codeSetting.markdownDescription, /\*\*On\*\*.*\*\*Off\*\*/u, name);
  }
  const paletteMode = properties[
    "markdownOkfSchemaStudio.editing.defaultPaletteMode"
  ] as {
    type: string;
    default: string;
    order: number;
    enum: string[];
    enumDescriptions: string[];
    markdownDescription: string;
  };
  assert.equal(paletteMode.type, "string");
  assert.equal(paletteMode.default, "gfm");
  assert.equal(paletteMode.order, 40);
  assert.deepEqual(paletteMode.enum, ["strict", "gfm", "myst"]);
  assert.equal(paletteMode.enumDescriptions.length, paletteMode.enum.length);
  for (const description of paletteMode.enumDescriptions) {
    assert.ok(description.trim().length > 0);
  }
  assert.match(paletteMode.markdownDescription, /\*\*strict\*\*.*\*\*gfm\*\*.*\*\*myst\*\*/u);
  assert.match(paletteMode.markdownDescription, /\*\*gfm\*\* \(the default\)/u);
  assert.equal(
    properties["markdown.preview.scrollPreviewWithEditor"],
    undefined,
  );
  assert.equal(packageJson.contributes.languages, undefined);
  assert.equal(packageJson.contributes.grammars, undefined);
  assert.equal(packageJson.contributes.editors, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-075
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
    contributes: { configuration: ConfigurationCategory[] };
  };
  const properties = contributedSettings(packageJson.contributes.configuration);
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
  assert.equal(properties["markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor"], undefined,
    "the removed double-click reveal setting is not contributed");
});

test("the built-in PlantUML engine ships pinned and the JAR is an explicit opt-in setting", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    dependencies: Record<string, string>;
    scripts: Record<string, string>;
    contributes: { configuration: ConfigurationCategory[] };
  };
  const properties = contributedSettings(packageJson.contributes.configuration);
  // An exact pin: versions before 1.2026.6 are GPL, and the engine internals still move between releases.
  assert.match(packageJson.dependencies["@plantuml/core"] ?? "", /^\d+\.\d+\.\d+$/u);
  const useJar = properties["markdownOkfSchemaStudio.plantuml.useJar"] as {
    type: string; default: boolean; order: number; markdownDescription: string; scope?: string;
  };
  assert.equal(useJar.type, "boolean");
  assert.equal(useJar.default, false);
  assert.match(useJar.markdownDescription, /\*\*On\*\*.*\*\*Off\*\*/su);
  assert.match(useJar.markdownDescription, /built-in/u);
  assert.match(useJar.markdownDescription, /jarPath/u);
  assert.match(useJar.markdownDescription, /Restricted Mode|untrusted/u);
  const jarText = properties["markdownOkfSchemaStudio.plantuml.jarPath"].markdownDescription as string;
  assert.match(jarText, /useJar/u, "jarPath must say it is only used with useJar");
  const esbuild = fs.readFileSync(path.join(extensionRoot, "esbuild.mjs"), "utf8");
  assert.match(esbuild, /src\/page\/modules\/plantumlPreview\.ts/u);
  assert.match(esbuild, /out\/bundle\/plantumlPreview\.js/u);
  const ignore = fs.readFileSync(path.join(extensionRoot, ".vscodeignore"), "utf8").split(/\r?\n/u);
  assert.ok(!ignore.some((line) => /^out\/bundle|^out\/\*\*/u.test(line.trim())), "the webview bundles must ship in the VSIX");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003
test("CR 119: undo, redo, select all and delete line are VS Code key bindings on the preview edit context", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: {
      commands: Array<{ command: string; title: string; category?: string }>;
      menus: { commandPalette: Array<{ command: string; when: string }> };
      keybindings: Array<{ command: string; key: string; mac?: string; when: string }>;
    };
  };
  const prefix = "markdown-okf-schema-studio.";
  const ids = ["editUndo", "editRedo", "editSelectAll", "editDeleteLine"].map((name) => prefix + name);
  assert.deepEqual(packageJson.contributes.commands.slice(2).map((entry) => entry.command), ids);
  assert.ok(packageJson.contributes.commands.slice(2).every((entry) => entry.category === "Markdown OKF-Schema Studio"));
  assert.deepEqual(packageJson.contributes.menus.commandPalette.slice(2), ids.map((command) => ({ command, when: "false" })),
    "the commands are for key bindings, not for the palette");
  const when = "markdownOkfSchemaStudio.previewEditing";
  assert.deepEqual(packageJson.contributes.keybindings.slice(1), [
    { command: ids[0], key: "ctrl+z", mac: "cmd+z", when },
    { command: ids[1], key: "ctrl+y", mac: "cmd+shift+z", when },
    { command: ids[1], key: "ctrl+shift+z", when },
    { command: ids[2], key: "ctrl+a", mac: "cmd+a", when },
    { command: ids[3], key: "ctrl+shift+k", mac: "cmd+shift+k", when },
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-074
test("CR 135: the VSIX leaves out source maps, internal docs, agent files and the Python project file", () => {
  const ignore = fs.readFileSync(path.join(extensionRoot, ".vscodeignore"), "utf8")
    .split(/\r?\n/u).map((line) => line.trim());
  for (const pattern of ["**/*.map", ".claude/**", "pyproject.toml", "docs/*.md"]) {
    assert.ok(ignore.includes(pattern), `.vscodeignore must exclude ${pattern}`);
  }
  assert.ok(!ignore.some((line) => /^docs\/(\*\*)?$/u.test(line)), "docs/user pages linked from the README must ship");
});
