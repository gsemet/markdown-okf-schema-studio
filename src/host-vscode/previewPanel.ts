/**
 * The {@link PreviewPanel} port on a VS Code webview panel: the page document, its resource roots
 * and assets, its title and place in the editor groups, and its events.
 */

import * as vscode from "vscode";

import type { AssetResolver } from "../host-api/assetResolver";
import type { HostEvent } from "../host-api/events";
import type { PreviewPanel } from "../host-api/previewPanel";

/** A preview panel of the VS Code host, with the webview panel it wraps. */
export interface VscodePreviewPanel extends PreviewPanel {
  /** The wrapped webview panel (activation and the test hooks only). */
  readonly panel: vscode.WebviewPanel;
}

/**
 * Wraps a webview panel. `assets` resolves the page's URLs (see `VscodeHost.assets`);
 * `extensionUri` is the extension's folder, whose `out/bundle` the page loads its runtime from.
 */
export function createVscodePreviewPanel(
  panel: vscode.WebviewPanel,
  assets: AssetResolver,
  extensionUri: vscode.Uri | undefined,
): VscodePreviewPanel {
  const bundleUri = extensionUri ? vscode.Uri.joinPath(extensionUri, "out", "bundle") : undefined;
  const bundleRoot = bundleUri?.fsPath;
  const onDidChangeLayout: HostEvent<void> = (listener) =>
    vscode.window.tabGroups.onDidChangeTabGroups(() => listener());
  return {
    panel,
    get html() {
      return panel.webview.html;
    },
    set html(html: string) {
      panel.webview.html = html;
    },
    get cspSource() {
      return panel.webview.cspSource;
    },
    assets,
    bundleRoot,
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-007
    setResourceRoots(roots) {
      panel.webview.options = {
        enableScripts: true,
        // The bundle keeps the URI it was built from, so the roots read back as they always did.
        localResourceRoots: roots.map((root) => root === bundleRoot && bundleUri ? bundleUri : vscode.Uri.file(root)),
      };
    },
    get title() {
      return panel.title;
    },
    set title(title: string) {
      panel.title = title;
    },
    get visible() {
      return panel.visible;
    },
    get active() {
      return panel.active;
    },
    get column() {
      return panel.viewColumn;
    },
    postMessage: (message) => panel.webview.postMessage(message),
    reveal: () => panel.reveal(panel.viewColumn ?? vscode.ViewColumn.Beside),
    dispose: () => panel.dispose(),
    onDidReceiveMessage: (listener) => panel.webview.onDidReceiveMessage(listener),
    onDidChangeViewState: (listener) => panel.onDidChangeViewState(() => listener()),
    onDidChangeLayout,
    onDidDispose: (listener) => panel.onDidDispose(() => listener()),
  };
}
