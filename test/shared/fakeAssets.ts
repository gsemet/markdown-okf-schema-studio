/**
 * An {@link AssetResolver} for tests that build real preview pages outside VS Code: every file,
 * workspace file or bundle file, gets the URL `url(path)`.
 */
import * as path from "node:path";

import type { AssetResolver } from "../../src/host-api/assetResolver";

export function fakeAssetResolver(options: {
  cspSource: string;
  /** The URL of a file system path. */
  url: (filePath: string) => string;
  /** The extension root whose `out/bundle` serves the bundle; without it the page gets no bundle URLs. */
  extensionRoot?: string;
}): AssetResolver {
  const { extensionRoot } = options;
  return {
    cspSource: options.cspSource,
    resourceUri: options.url,
    bundleUri: (...segments) => extensionRoot === undefined
      ? undefined
      : options.url(path.join(extensionRoot, "out", "bundle", ...segments)),
  };
}
