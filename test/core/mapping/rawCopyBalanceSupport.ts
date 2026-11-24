/**
 * Test helper of the raw copy edge balancing: one selection copied with the setting off and on, from
 * a source written in the test, with the edges built by the page's own tree rules.
 */

import * as assert from "node:assert/strict";

import { copyRaw, renderPage, type Spot } from "./rawCopyFrames";

/** Copies the selection with the setting off and on and asserts both values. */
export async function assertCopy(source: string, from: Spot, to: Spot, off: string, on: string): Promise<void> {
  const page = await renderPage(source);
  assert.equal(copyRaw(page, from, to), off, "setting off");
  assert.equal(copyRaw(page, from, to, { balanceEdges: false }), off, "setting false");
  assert.equal(copyRaw(page, from, to, { balanceEdges: true }), on, "setting on");
}

/** The text spot at `offset` of the nth text holding `text`. */
export const at = (text: string, offset: number | "end" = 0, nth = 0): Spot => ({ text, offset, nth });
