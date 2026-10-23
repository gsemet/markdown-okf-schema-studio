/**
 * The `AssetResolver` port: how a page of the preview reaches files. A host serves the page from
 * its own scheme (VS Code: `vscode-webview://` URIs and a webview CSP source; a standalone app: an
 * asset protocol or a loopback server), so the page builder asks this port for every URL.
 */

/** URLs of the files one preview page may load. */
export interface AssetResolver {
  /** The source expression the page's Content-Security-Policy allows for these URLs. */
  readonly cspSource: string;
  /** The URL of a workspace file (a file system path) as the page loads it. */
  resourceUri(path: string): string;
  /**
   * The URL of a file of the extension's bundle (`out/bundle/<segments>`); undefined when the host
   * serves no bundle (the page then gets inline styles and scripts instead).
   */
  bundleUri(...segments: string[]): string | undefined;
}
