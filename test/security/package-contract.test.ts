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

/** The icon contract: the manifest names images/logo.png, and that file is a 256 by 256 PNG. */
function assertIconContract(manifest: { icon: string }, icon: Buffer): void {
  assert.equal(manifest.icon, "images/logo.png");
  assert.deepEqual(icon.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(icon.readUInt32BE(16), 256);
  assert.equal(icon.readUInt32BE(20), 256);
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-074#S1
// @tests_req SwRS-MDOKFSTUDIO-TRUST-074#S2
test("extension icon is a 256 pixel PNG and the Sphinx favicon matches the shared logo", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as { icon: string };
  assertIconContract(manifest, fs.readFileSync(path.join(extensionRoot, manifest.icon)));
  assert.equal(
    fs.readFileSync(path.join(extensionRoot, "sphinx/_static/favicon.svg"), "utf8"),
    fs.readFileSync(path.join(extensionRoot, "images/logo.svg"), "utf8"),
  );
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-074#S3
test("the icon contract fails for another icon file and for a file that is not a 256 pixel PNG", () => {
  const icon = fs.readFileSync(path.join(extensionRoot, "images/logo.png"));
  const manifest = { icon: "images/logo.png" };
  assert.doesNotThrow(() => assertIconContract(manifest, icon));
  assert.throws(() => assertIconContract({ icon: "images/other.png" }, icon), assert.AssertionError);
  const narrow = Buffer.from(icon);
  narrow.writeUInt32BE(128, 16);
  const short = Buffer.from(icon);
  short.writeUInt32BE(128, 20);
  const notPng = fs.readFileSync(path.join(extensionRoot, "images/logo.svg"));
  for (const broken of [narrow, short, notPng]) {
    assert.throws(() => assertIconContract(manifest, broken), assert.AssertionError);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024#S8
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
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S2
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-003#S9
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-032#S1
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-032#S5
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
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-001#S1
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-001#S2
  assert.doesNotMatch(serialized, /markdown\./u);
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-018#S5
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
      when: "resourceExtname == .md && (activeEditor == workbench.editors.files.textFileEditor || activeEditor == workbench.editors.textDiffEditor)",
      group: "navigation",
    },
    // CR-445: Open as Text, in the overflow of the title bar of a Studio tab (no `navigation` group).
    {
      command: "markdown-okf-schema-studio.openAsText",
      when: "activeCustomEditorId == 'markdown-okf-schema-studio.editor'",
      group: "1_markdown@1",
    },
    // CR-483: Open in Studio at This Line, in the overflow of the title bar of a Markdown text editor.
    // The third entry is added; the intent of the two above is unchanged.
    {
      command: "markdown-okf-schema-studio.openInStudioAtLine",
      when: "resourceExtname == .md && activeEditor == workbench.editors.files.textFileEditor",
      group: "1_markdown@2",
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
  // @tests_req SwRS-MDOKFSTUDIO-LIFE-156#S1
  // The Settings UI shows the categories in this order, most used first; every setting sits in the
  // category of its key prefix.
  const categories = packageJson.contributes.configuration;
  assert.ok(Array.isArray(categories), "the settings are contributed as ordered categories");
  assert.deepEqual(
    categories.map((category) => [category.title, category.order]),
    [["Preview", 1], ["Editing", 2], ["Frontmatter", 3], ["Comments", 4], ["PlantUML", 5]],
  );
  const prefixOf = (title: string): string => `markdownOkfSchemaStudio.${title.toLowerCase()}.`;
  for (const category of categories) {
    const prefix = prefixOf(category.title);
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
      "markdownOkfSchemaStudio.preview.listItemsInToc",
      "markdownOkfSchemaStudio.preview.markEditorSelection",
      "markdownOkfSchemaStudio.preview.maxContentWidth",
      "markdownOkfSchemaStudio.preview.rawCopy.balanceEdges",
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
  // @tests_req SwRS-MDOKFSTUDIO-REVIEW-065#S5
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
  // @tests_req SwRS-MDOKFSTUDIO-CODE-040#S1
  // @tests_req SwRS-MDOKFSTUDIO-CODE-040#S4
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
  assert.deepEqual(paletteMode.enum, ["strict", "gfm", "myst", "full"]);
  assert.equal(paletteMode.enumDescriptions.length, paletteMode.enum.length);
  for (const description of paletteMode.enumDescriptions) {
    assert.ok(description.trim().length > 0);
  }
  assert.match(paletteMode.markdownDescription, /\*\*strict\*\*.*\*\*gfm\*\*.*\*\*myst\*\*.*\*\*full\*\*/u);
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

// @tests_req SwRS-MDOKFSTUDIO-DIAG-124#S1
test("CR 149: the chart runtime ships pinned in its own bundle and evaluates expressions with the interpreter", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  for (const name of ["vega", "vega-lite", "vega-interpreter"]) {
    assert.match(packageJson.dependencies[name] ?? "", /^\d+\.\d+\.\d+$/u, `${name} is an exact pin`);
  }
  const esbuild = fs.readFileSync(path.join(extensionRoot, "esbuild.mjs"), "utf8");
  assert.match(esbuild, /src\/page\/modules\/vegaPreview\.ts/u);
  assert.match(esbuild, /out\/bundle\/vegaPreview\.js/u);
  // Changed for CR-503: the parse and the view live in vegaView.ts, the config and the loader stay in vegaChart.ts.
  const chart = ["vegaChart.ts", "vegaView.ts"].map((name) => fs.readFileSync(path.join(extensionRoot, "src/page/modules", name), "utf8")).join("\n");
  assert.match(chart, /ast: true/u, "the spec is parsed to an expression AST");
  assert.match(chart, /expr: expressionInterpreter/u, "the view evaluates it with vega-interpreter");
  assert.doesNotMatch(chart, /\beval\(|new Function/u);
  const preview = fs.readFileSync(path.join(extensionRoot, "src/page/modules/vegaPreview.ts"), "utf8");
  assert.doesNotMatch(preview, /\bfetch\(|XMLHttpRequest|import\(/u, "the chart runtime loads nothing by itself");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-003#S1
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
  assert.deepEqual(packageJson.contributes.commands.slice(2, 6).map((entry) => entry.command), ids);
  assert.ok(packageJson.contributes.commands.slice(2, 6).every((entry) => entry.category === "Markdown OKF-Schema Studio"));
  assert.deepEqual(packageJson.contributes.menus.commandPalette.slice(2, 6), ids.map((command) => ({ command, when: "false" })),
    "the commands are for key bindings, not for the palette");
  const when = "markdownOkfSchemaStudio.previewEditing";
  assert.deepEqual(packageJson.contributes.keybindings.slice(1, 6), [
    { command: ids[0], key: "ctrl+z", mac: "cmd+z", when },
    { command: ids[1], key: "ctrl+y", mac: "cmd+shift+z", when },
    { command: ids[1], key: "ctrl+shift+z", when },
    { command: ids[2], key: "ctrl+a", mac: "cmd+a", when },
    { command: ids[3], key: "ctrl+shift+k", mac: "cmd+shift+k", when },
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003#S6
test("CR 143: Fold All and Unfold All are command palette entries offered to the preview only", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: {
      commands: Array<{ command: string; title: string; category?: string }>;
      menus: { commandPalette: Array<{ command: string; when: string }> };
    };
  };
  const prefix = "markdown-okf-schema-studio.";
  const commands = packageJson.contributes.commands.filter((entry) => /fold/iu.test(entry.command));
  assert.deepEqual(commands.map((entry) => [entry.command, entry.title, entry.category]), [
    [prefix + "foldAll", "Fold All Sections in Preview", "Markdown OKF-Schema Studio"],
    [prefix + "unfoldAll", "Unfold All Sections in Preview", "Markdown OKF-Schema Studio"],
  ]);
  const when = "activeWebviewPanelId == 'markdown-okf-schema-studio.preview' || activeCustomEditorId == 'markdown-okf-schema-studio.editor'";
  assert.deepEqual(packageJson.contributes.menus.commandPalette.filter((entry) => /fold/iu.test(entry.command)), [
    { command: prefix + "foldAll", when },
    { command: prefix + "unfoldAll", when },
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009#S3
test("CR 144: Cmd/Ctrl+F runs the find command on the focused preview only", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: {
      commands: Array<{ command: string; title: string }>;
      keybindings: Array<{ command: string; key: string; mac?: string; when: string }>;
    };
  };
  const id = "markdown-okf-schema-studio.find";
  assert.ok(packageJson.contributes.commands.some((entry) => entry.command === id && entry.title === "Find in Preview"));
  const bindings = packageJson.contributes.keybindings.filter((entry) => entry.command === id);
  assert.equal(bindings.length, 1);
  assert.equal(bindings[0].key, "ctrl+f");
  assert.equal(bindings[0].mac, "cmd+f");
  assert.match(bindings[0].when, /activeWebviewPanelId == 'markdown-okf-schema-studio\.preview'/u);
  assert.match(bindings[0].when, /!editorTextFocus/u, "the text editor keeps its own find");
});

/** The contract of .vscodeignore: the leftovers are excluded; out/bundle and the docs folder are not. */
function assertIgnoreContract(ignore: readonly string[]): void {
  for (const pattern of ["**/*.map", ".claude/**", "pyproject.toml", "docs/*.md"]) {
    assert.ok(ignore.includes(pattern), `.vscodeignore must exclude ${pattern}`);
  }
  assert.ok(!ignore.some((line) => /^docs\/(\*\*)?$/u.test(line)), "docs/user pages linked from the README must ship");
  assert.ok(!ignore.some((line) => /^out(\/bundle)?(\/(\*\*)?)?$/u.test(line)), "out/bundle must ship");
}

const ignoreLines = (): string[] => fs.readFileSync(path.join(extensionRoot, ".vscodeignore"), "utf8")
  .split(/\r?\n/u).map((line) => line.trim());

// @tests_req SwRS-MDOKFSTUDIO-TRUST-092#S3
test("CR 135: the VSIX leaves out source maps, internal docs, agent files and the Python project file", () => {
  assertIgnoreContract(ignoreLines());
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-092#S4
test("the .vscodeignore contract fails when out is excluded or source maps are kept", () => {
  const ignore = ignoreLines();
  assert.throws(() => assertIgnoreContract([...ignore, "out/**"]), /out\/bundle must ship/u);
  assert.throws(() => assertIgnoreContract(ignore.filter((line) => line !== "**/*.map")),
    /must exclude \*\*\/\*\.map/u);
});

test("the Marketplace listing declares its categories and keywords", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    categories: string[];
    keywords: string[];
  };
  assert.deepEqual(manifest.categories, ["Programming Languages", "Formatters"]);
  assert.deepEqual(manifest.keywords, ["markdown", "OKF", "MyST"]);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-173#S1
test("CR 312: Cmd/Ctrl+S runs the save command on the side preview and the custom editor, and the command is not in the palette", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: {
      commands: Array<{ command: string; title: string; category?: string }>;
      menus: { commandPalette: Array<{ command: string; when: string }> };
      keybindings: Array<{ command: string; key: string; mac?: string; when: string }>;
    };
  };
  const id = "markdown-okf-schema-studio.saveDocument";
  const commands = packageJson.contributes.commands.filter((entry) => entry.command === id);
  assert.deepEqual(commands.map((entry) => [entry.title, entry.category]), [
    ["Save the Previewed Document", "Markdown OKF-Schema Studio"],
  ]);
  assert.deepEqual(packageJson.contributes.menus.commandPalette.filter((entry) => entry.command === id), [
    { command: id, when: "false" },
  ], "the command is for the key binding, not for the palette");
  assert.deepEqual(packageJson.contributes.keybindings.filter((entry) => entry.command === id), [
    { command: id, key: "ctrl+s", mac: "cmd+s", when: "activeWebviewPanelId == 'markdown-okf-schema-studio.preview' || activeCustomEditorId == 'markdown-okf-schema-studio.editor'" },
  ], "no input or editor focus clause: the key saves from every text box of the page");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-176#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-176#S2
// @tests_req SwRS-MDOKFSTUDIO-LIFE-177#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-177#S2
test("CR-445: Open as Text is in the palette and the editor title overflow of a Studio tab, and the introductions reset is in the palette", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: {
      commands: Array<{ command: string; title: string; category?: string }>;
      menus: Record<string, Array<{ command: string; when?: string; group?: string }>>;
    };
  };
  const studioTab = "activeCustomEditorId == 'markdown-okf-schema-studio.editor'";
  const asText = "markdown-okf-schema-studio.openAsText";
  const again = "markdown-okf-schema-studio.showFeatureIntroductionsAgain";
  assert.deepEqual(packageJson.contributes.commands.filter((entry) => entry.command === asText || entry.command === again)
    .map((entry) => [entry.command, entry.title, entry.category]), [
    [asText, "Open as Text", "Markdown OKF-Schema Studio"],
    [again, "Show Feature Introductions Again", "Markdown OKF-Schema Studio"],
  ]);
  assert.deepEqual(packageJson.contributes.menus.commandPalette.filter((entry) => entry.command === asText), [
    { command: asText, when: studioTab },
  ]);
  assert.deepEqual(packageJson.contributes.menus.commandPalette.filter((entry) => entry.command === again), [{ command: again }]);
  const title = packageJson.contributes.menus["editor/title"]!.filter((entry) => entry.command === asText);
  assert.equal(title.length, 1);
  assert.equal(title[0]!.when, studioTab);
  assert.notEqual(title[0]!.group, "navigation", "an overflow entry, not a toolbar button");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-198#S1
test("CR-483: Open in Studio at This Line is a palette and title command for Markdown text editors, with no keybinding and no opening setting", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")) as {
    contributes: {
      commands: Array<{ command: string; title: string; category?: string }>;
      menus: Record<string, Array<{ command: string; when?: string }>>;
      keybindings: Array<{ command: string }>;
      configuration: Array<{ properties: Record<string, unknown> }>;
    };
  };
  const id = "markdown-okf-schema-studio.openInStudioAtLine";
  const declared = packageJson.contributes.commands.filter((entry) => entry.command === id);
  assert.deepEqual(declared.map((entry) => entry.title), ["Open in Studio at This Line"]);
  assert.equal(declared[0]!.category, "Markdown OKF-Schema Studio");
  const palette = packageJson.contributes.menus.commandPalette!.filter((entry) => entry.command === id);
  assert.deepEqual(palette.map((entry) => entry.when), ["resourceExtname == .md && !activeCustomEditorId"]);
  assert.equal(packageJson.contributes.menus["editor/title"]!.filter((entry) => entry.command === id).length, 1);
  assert.deepEqual(packageJson.contributes.keybindings.filter((entry) => entry.command === id), [], "no default keybinding");
  assert.deepEqual(packageJson.contributes.configuration.flatMap((category) => Object.keys(category.properties)).filter((key) => key.startsWith("markdownOkfSchemaStudio.open.")), [],
    "no setting for how a file opens");
});
