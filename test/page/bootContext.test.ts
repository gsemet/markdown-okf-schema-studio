import * as assert from "node:assert/strict";
import { test } from "node:test";

import { RUNTIME_CONTEXT_ATTRIBUTE } from "../../src/core/protocol/bootContext";
import { readBootContext } from "../../src/page/bootContext";

const pageWith = (text: string | undefined) => ({
  querySelector: (selector: string) =>
    selector.includes(RUNTIME_CONTEXT_ATTRIBUTE) && text !== undefined ? ({ textContent: text } as Element) : null,
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-156
test("the boot context reads a JSON object and falls back to an empty one for anything else", () => {
  assert.deepEqual(readBootContext(pageWith('{"activeSourceFile":"/w/a.md","requestId":3}')), {
    activeSourceFile: "/w/a.md",
    requestId: 3,
  });
  for (const text of [undefined, "", "{not json", "null", "[1,2]", '"text"', "42", "true"]) {
    assert.deepEqual(readBootContext(pageWith(text)), {}, `boot context ${JSON.stringify(text)}`);
  }
});
