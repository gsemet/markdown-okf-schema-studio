/**
 * The preview manager (`src/session/previewManager.ts`): its feature controllers register exactly
 * one handler for every page message type the protocol has a gate for.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { PAGE_MESSAGE_GATES } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";

test("every page message type has one handler of a feature controller", () => {
  const host = { files: {} } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const router = (manager as unknown as { router: { on(type: string, handler: () => void): void } }).router;
  const types = Object.keys(PAGE_MESSAGE_GATES);
  assert.equal(types.length, 41);
  for (const type of types) {
    // The router refuses a second handler: one is registered already.
    assert.throws(() => router.on(type, () => undefined), /already registered/u, type);
  }
});
