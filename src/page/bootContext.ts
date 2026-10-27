/**
 * Reads the boot context of the page (see `src/core/protocol/bootContext.ts`): the inert JSON element
 * the host puts before the runtime script.
 */

import { RUNTIME_CONTEXT_ATTRIBUTE, type PreviewRuntimeContext } from "../core/protocol/bootContext";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-156
/**
 * The boot context of this page; an empty object when the page carries none, or when the element
 * does not hold a JSON object (malformed text, `null`, an array or a primitive).
 */
export function readBootContext(document: Pick<Document, "querySelector">): PreviewRuntimeContext {
  const empty = {} as PreviewRuntimeContext;
  const text = document.querySelector(`script[${RUNTIME_CONTEXT_ATTRIBUTE}]`)?.textContent;
  if (!text) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return empty;
  }
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as PreviewRuntimeContext) : empty;
}
