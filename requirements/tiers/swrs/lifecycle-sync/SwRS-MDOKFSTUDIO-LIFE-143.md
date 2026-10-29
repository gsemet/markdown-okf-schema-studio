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
  preview still uses. A preview whose workspace folder is removed keeps its
  panel and shows its file read-only.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
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
- src/session/sharedWatchers.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/host/previewTiming.test.ts
- test/integration/lifecycle.test.ts
- test/integration/workspaceDisposal.test.ts
- test/session/eventFanOut.test.ts
default_owner_email: gaetan@xeberon.net
---

## Closing a preview or folder leaves nothing behind

### Normative behavior

When a preview panel is closed, a document is closed, a workspace folder is removed or the extension is deactivated, the extension SHALL cancel the render queue and dispose the pending render stages, file watchers, subscriptions and Problems entries of the preview concerned, so that no late result reaches the panel, keeping every shared resource that another live preview still uses. A preview whose workspace folder is removed keeps its panel and shows its file read-only.

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
- THEN the preview's hold on the watcher and its change, create and delete subscriptions are released, and the watcher itself is disposed with the last preview of that root (previews of one root share one watcher)

### Scenario (nominal): Problems entries cleared

- GIVEN Problems entries for a.md published by its only preview
- WHEN the preview is closed, switches document or a.md is closed
- THEN the entries of a.md are deleted

### Scenario (nominal): Folder removed

- GIVEN a writable preview of a file in a workspace folder (in the Agents window, the folder of the active agent session, which a session switch removes)
- WHEN the folder is removed from the workspace
- THEN the preview's session, with its render queue, watchers and Problems entries, is disposed; the same panel stays open and shows the file in a new read-only session (resource root = the directory of the file, no session roots) that keeps the reading state; the folder's files still exist
- AND when a folder that holds the file is added later, the preview becomes writable again on the same panel (see SwRS-MDOKFSTUDIO-TRUST-001)

### Scenario (nominal): Deactivation

- GIVEN two open previews
- WHEN the extension host stops the extension
- THEN the preview sessions, watchers and the Problems collection are disposed, the panels stay and the serializer restores them at the next start

### Scenario (boundary): What stays after a close

| Case | Outcome |
| --- | --- |
| A second preview of the same or another root, and the first is closed | The second keeps its watcher |
| A second live preview of a.md, and the first is closed or the document is closed | The Problems entries of a.md stay |
| A preview of a file that is in no workspace folder, and a folder is removed | The preview stays open, unchanged |
| A preview of a file in a removed folder that another workspace folder still holds | The preview moves to a session of that folder, on the same panel |
| A preview of a removed folder that has no document to show | The preview and its panel are disposed |
| A session that was already disposed, and it is disposed again without its panel | Nothing happens: the disposal is idempotent |

### Verification notes

- Method: test/host/previewTiming.test.ts "a preview disposed while its render is debouncing, building or awaiting a patch acknowledgement stays silent" (closed while rendering).
- Method: test/integration/lifecycle.test.ts (closed idle: the active preview is undefined after disposal).
- Method: test/host/lifeReq.requirements.test.ts "previews of one root share one file watcher, which closing the last preview removes with its subscriptions" (watchers removed, second preview keeps the shared watcher), test/session/eventFanOut.test.ts (one dependency watcher for several previews of a root, released with the last; linked-target watches shared and released with the last preview), "closing a preview clears the Problems entries that no preview shows" (Problems entries cleared and kept), "deactivating the extension disposes the sessions and leaves the panels to VS Code" (deactivation, disposed twice).
- Method: test/host/lifeReq.requirements.test.ts "removing the folder of a preview keeps its panel read-only until the folder is added back" (folder removed: same panel, old session and its folder watcher disposed, read-only session rooted at the file's directory with the reading state, writable again when the folder is added back), and test/integration/workspaceDisposal.test.ts in a real VS Code (multi-root only, it asserts at least two folders: the tab stays, the active preview becomes read-only on the same panel). The standalone file row, the row of a file another folder still holds and the row of a preview with no document are deduced from the code (demoteSessionsOf in src/session/previewManager.ts), not tested.
- Criteria: no post follows disposal and the live set no longer holds the session; the shared dependency watcher is disposed once, when the last preview of its root releases it; sink.delete is called only when no live session has the document; after a folder removal the panel is not disposed, the active preview is read-only on that panel and the source directory exists; disposeAll(false) leaves the panels undisposed.
