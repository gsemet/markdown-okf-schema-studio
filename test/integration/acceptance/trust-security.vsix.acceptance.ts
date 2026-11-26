/**
 * Checks of the installed package: the extension under test is the built VSIX, unpacked. Only the
 * public `vscode` API and the unpacked files are used: nothing here loads the repository's extension
 * bundle. These checks walk no use-case path in full, so they carry no acceptance marker.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import type { WindowKind } from "../../shared/acceptanceCampaign";
import { step } from "../stepWatchdog";

export const windowKind: WindowKind = "vsix";

const EXTENSION_ID = "GaetanSemet.markdown-okf-schema-studio";
const OPEN_PREVIEW = "markdown-okf-schema-studio.openPreview";
const REFRESH_PREVIEW = "markdown-okf-schema-studio.refreshPreview";
const PREVIEW_PANEL = "markdown-okf-schema-studio.preview";
const FIXTURES = path.resolve(__dirname, "../../../../test/integration/fixtures/acceptance/trust-security");

interface ManifestTexts {
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;
  readonly capabilities: { readonly untrustedWorkspaces: { readonly description: string } };
  readonly contributes: {
    readonly commands: readonly { readonly command: string; readonly title: string; readonly category?: string }[];
    readonly configuration: readonly {
      readonly title: string;
      readonly properties: Readonly<Record<string, {
        readonly description?: string;
        readonly markdownDescription?: string;
        readonly enumDescriptions?: readonly string[];
        readonly markdownEnumDescriptions?: readonly string[];
      }>>;
    }[];
    readonly customEditors: readonly { readonly displayName: string }[];
  };
}

/** The extension of this window: the unpacked VSIX, never the repository. */
function installedStudio(): vscode.Extension<unknown> {
  const unpacked = process.env.STUDIO_ACCEPTANCE_EXTENSION;
  assert.ok(unpacked, "STUDIO_ACCEPTANCE_EXTENSION is not set: the launcher gave no unpacked VSIX");
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `the window has no extension ${EXTENSION_ID}`);
  assert.equal(fs.realpathSync(extension.extensionPath), fs.realpathSync(unpacked),
    "the window runs another folder than the unpacked VSIX");
  return extension;
}

/** The texts of the manifest that VS Code shows to a reader. */
function visibleTexts(manifest: ManifestTexts): string[] {
  const { commands, configuration, customEditors } = manifest.contributes;
  const settings = configuration.flatMap((category) => [
    category.title,
    ...Object.values(category.properties).flatMap((property) => [
      property.description,
      property.markdownDescription,
      ...property.enumDescriptions ?? [],
      ...property.markdownEnumDescriptions ?? [],
    ]),
  ]);
  return [
    manifest.displayName,
    manifest.description,
    manifest.capabilities.untrustedWorkspaces.description,
    ...commands.flatMap((command) => [command.title, command.category]),
    ...settings,
    ...customEditors.map((editor) => editor.displayName),
  ].filter((text): text is string => typeof text === "string");
}

function tabs(): { label: string; viewType: string | undefined }[] {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs.map((tab) => ({
    label: tab.label,
    viewType: tab.input instanceof vscode.TabInputWebview ? tab.input.viewType : undefined,
  })));
}

/** The preview tab of `name`, once VS Code reports it. VS Code prefixes the view type of a panel. */
async function waitForPreviewTab(name: string): Promise<string> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const found = tabs().find((tab) => tab.viewType?.endsWith(PREVIEW_PANEL) && tab.label.includes(name));
    if (found) return found.label;
    if (Date.now() >= deadline) {
      throw new Error(`No preview tab of ${name} opened. Tabs: ${JSON.stringify(tabs())}`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * The tab of the preview the installed Studio opens and the texts of its manifest (name,
 * description, Restricted Mode note, commands, settings) speak of the preview, never of the build
 * tool. No use-case path is accepted by this: the manifest's texts and the tab label are read, the
 * texts of the preview page itself are not observed.
 */
async function showsTextsThatSpeakOfThePreview(): Promise<void> {
  const manifest = installedStudio().packageJSON as ManifestTexts;
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, "the window opens no workspace folder");
  const file = path.join(workspace.uri.fsPath, "installed.md");
  fs.copyFileSync(path.join(FIXTURES, "installed.md"), file);
  try {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(file)));
    await vscode.commands.executeCommand(OPEN_PREVIEW);
    const label = await waitForPreviewTab("installed.md");

    const texts = visibleTexts(manifest);
    for (const text of [label, ...texts]) assert.doesNotMatch(text, /sphinx/iu, `a visible text names the build tool: ${text}`);
    const title = (command: string): string =>
      manifest.contributes.commands.find((candidate) => candidate.command === command)?.title ?? "";
    assert.match(title(OPEN_PREVIEW), /preview/iu);
    assert.match(title(REFRESH_PREVIEW), /preview/iu);
    assert.match(manifest.description, /preview/iu);
    assert.ok(manifest.contributes.configuration.some((category) => category.title === "Preview"),
      `no setting category speaks of the preview: ${manifest.contributes.configuration.map((item) => item.title).join(", ")}`);
  } finally {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(file, { force: true });
  }
}

/**
 * The installed extension declares its own icon, and the file it names in the package is a 256 pixel
 * PNG. No use-case path is accepted by this: the Extensions view is never opened.
 */
async function showsItsOwnIcon(): Promise<void> {
  const extension = installedStudio();
  const { icon } = extension.packageJSON as ManifestTexts;
  assert.equal(icon, "images/logo.png", "the installed extension declares another icon");
  const png = fs.readFileSync(path.join(extension.extensionPath, icon));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "the icon is not a PNG");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [256, 256], "the icon is not 256 by 256 pixels");
}

export async function run(): Promise<void> {
  await step("installed-visible-texts", showsTextsThatSpeakOfThePreview);
  await step("installed-icon", showsItsOwnIcon);
}
