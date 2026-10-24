/**
 * Reads the boot context of the page (see `src/protocol/bootContext.ts`): the inert JSON element
 * the host puts before the runtime script.
 */

import { RUNTIME_CONTEXT_ATTRIBUTE, type PreviewRuntimeContext } from "../protocol/bootContext";

/** The boot context of this page; an empty object when the page carries none. */
export function readBootContext(document: Pick<Document, "querySelector">): PreviewRuntimeContext {
  return JSON.parse(document.querySelector(`script[${RUNTIME_CONTEXT_ATTRIBUTE}]`)?.textContent || "{}") as PreviewRuntimeContext;
}
