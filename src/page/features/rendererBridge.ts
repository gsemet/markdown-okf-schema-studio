/**
 * Forwards page events to the diagram renderers, which are separate scripts of the page (Mermaid,
 * PlantUML, see `src/page/modules/mermaidPreview.ts` and `plantumlPreview.ts`) and listen for DOM events
 * on the document rather than on the page bus.
 */

import { PLANTUML_INCLUDES_CHANGED_EVENT } from "../modules/plantumlFileRequests";
import type { PageBus, PageEvents } from "../pageBus";

/** The DOM event the renderers draw the replaced content on. */
export const CONTENT_REPLACED_EVENT = "studio:content-replaced";

/** Dispatches {@link CONTENT_REPLACED_EVENT} and the PlantUML includes event on the document. */
export function installRendererBridge(document: Pick<Document, "dispatchEvent">, bus: PageBus<PageEvents>): void {
  const announce = (type: string): void => {
    if (typeof CustomEvent === "function") document.dispatchEvent(new CustomEvent(type));
  };
  bus.on("contentReplaced", () => announce(CONTENT_REPLACED_EVENT));
  bus.on("plantUmlIncludesChanged", () => announce(PLANTUML_INCLUDES_CHANGED_EVENT));
}
