import * as assert from "node:assert/strict";
import { test } from "node:test";

import { CONTENT_REPLACED_EVENT, installRendererBridge } from "../../src/page/features/rendererBridge";
import { createPageBus, type PageEvents } from "../../src/page/pageBus";
import { PLANTUML_INCLUDES_CHANGED_EVENT } from "../../src/page/modules/plantumlFileRequests";

// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
// @tests_req SwRS-MDOKFSTUDIO-DIAG-039
test("page events reach the diagram renderers as the DOM events they listen for", () => {
  const bus = createPageBus<PageEvents>();
  const dispatched: string[] = [];
  installRendererBridge({ dispatchEvent: (event: Event) => { dispatched.push(event.type); return true; } }, bus);
  bus.emit("contentReplaced", undefined);
  bus.emit("plantUmlIncludesChanged", undefined);
  assert.deepEqual(dispatched, [CONTENT_REPLACED_EVENT, PLANTUML_INCLUDES_CHANGED_EVENT]);
  assert.equal(CONTENT_REPLACED_EVENT, "studio:content-replaced");
});
