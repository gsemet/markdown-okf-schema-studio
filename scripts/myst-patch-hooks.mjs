// Node module customization hook: applies scripts/myst-patches.mjs to the three MyST packages as
// they load, so Node-run code sees the patched source without any write to node_modules.
import { fileURLToPath } from "node:url";

import { patchMystSource } from "./myst-patches.mjs";

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!url.startsWith("file:") || result.format !== "module" || result.source == null) return result;
  const filePath = fileURLToPath(url);
  const patched = patchMystSource(filePath, result.source.toString());
  return patched === undefined ? result : { ...result, source: patched };
}
