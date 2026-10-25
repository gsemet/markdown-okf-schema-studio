---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-143
uuid: 9cb13f5d-12dc-4a59-ab5c-02389bffdb4a
title: Closing a preview or folder leaves nothing behind
description: When a preview panel is closed, a document is closed, a workspace
  folder is removed or the extension is deactivated, the extension SHALL cancel
  the render queue and dispose the pending render stages, file watchers,
  subscriptions and Problems entries of the preview concerned, so that no late
  result reaches the panel, keeping every shared resource that another live
  preview still uses.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
- src/session/features/diagnostics.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/host/previewTiming.test.ts
- test/integration/lifecycle.test.ts
- test/integration/workspaceDisposal.test.ts
---

## Closing a preview or folder leaves nothing behind

### Normative behavior

When a preview panel is closed, a document is closed, a workspace folder is removed or the extension is deactivated, the extension SHALL cancel the render queue and dispose the pending render stages, file watchers, subscriptions and Problems entries of the preview concerned, so that no late result reaches the panel, keeping every shared resource that another live preview still uses.

### Scenario (nominal): Closed while rendering

- GIVEN a preview debouncing, building or awaiting a patch acknowledgement
- WHEN the panel is closed
- THEN the preview stays silent: no message, no status and no stage is kept

### Scenario (nominal): Closed idle

- GIVEN an idle preview
- WHEN the panel is closed
- THEN the session is removed from the live set and getActivePreviewForTests returns undefined

### Scenario (nominal): Watchers removed

- GIVEN a preview that watches the files below its root
- WHEN the panel is closed
- THEN the watcher and its change, create and delete subscriptions are disposed

### Scenario (nominal): Problems entries cleared

- GIVEN Problems entries for a.md published by its only preview
- WHEN the preview is closed, switches document or a.md is closed
- THEN the entries of a.md are deleted

### Scenario (nominal): Folder removed

- GIVEN a preview of a file in the second folder of a multi-root workspace
- WHEN the folder is removed from the workspace
- THEN the preview and its panel are disposed and the folder's files still exist

### Scenario (nominal): Deactivation

- GIVEN two open previews
- WHEN the extension host stops the extension
- THEN the preview sessions, watchers and the Problems collection are disposed, the panels stay and the serializer restores them at the next start

### Scenario (boundary): What stays after a close

| Case | Outcome |
| --- | --- |
| A second preview of another root, and the first is closed | The second keeps its watcher |
| A second live preview of a.md, and the first is closed or the document is closed | The Problems entries of a.md stay |
| A preview of a file that is in no workspace folder, and a folder is removed | The preview stays open |
| A session that was already disposed, and it is disposed again without its panel | Nothing happens: the disposal is idempotent |

### Verification notes

- Method: test/host/previewTiming.test.ts "a preview disposed while its render is debouncing, building or awaiting a patch acknowledgement stays silent" (closed while rendering).
- Method: test/integration/lifecycle.test.ts (closed idle: the active preview is undefined after disposal).
- Method: test/host/lifeReq.requirements.test.ts "closing a preview removes its file watcher and subscriptions, not those of another preview" (watchers removed, second preview keeps its watcher), "closing a preview clears the Problems entries that no preview shows" (Problems entries cleared and kept), "deactivating the extension disposes the sessions and leaves the panels to VS Code" (deactivation, disposed twice).
- Method: test/integration/workspaceDisposal.test.ts (folder removed; multi-root only, it asserts at least two folders). The standalone file row is untested.
- Criteria: no post follows disposal and the live set no longer holds the session; dependencyWatcher.dispose() runs once for the session; sink.delete is called only when no live session has the document; getActivePreviewForTests is undefined and the source directory exists after a folder removal; disposeAll(false) leaves the panels undisposed.
