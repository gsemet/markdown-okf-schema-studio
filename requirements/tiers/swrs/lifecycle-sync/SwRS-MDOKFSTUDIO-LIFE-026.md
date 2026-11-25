---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-026
uuid: a3e7c206-c4f8-49a4-af34-1dd18792bf2e
title: The side preview follows the active Markdown editor
description: When another saved Markdown file becomes the active editor, or a
  text diff whose real file is another saved Markdown file becomes the active
  tab, the extension SHALL switch only the newest side preview that follows the
  editor to that file, show Preview pending with the message Following the
  active Markdown editor. until its render ends, apply only the last requested
  document when the editor changes during the switch, and leave the preview
  unchanged for any other editor change.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-003
depends_on: []
scenarios:
- id: S1
  title: Second file
- id: S2
  title: Editor changes that leave the preview as it was
- id: S3
  title: A text diff becomes active
- id: S4
  title: Editors the side preview does not follow
- id: S5
  title: Only the newest following preview switches
- id: S6
  title: Quick switching between documents
- id: S7
  title: Another workspace folder or trust state
- id: S8
  title: Same folder and trust state, or no folder
- id: S9
  title: A hidden preview that becomes visible
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
- src/session/features/scrollSync.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/preview/flushWait.test.ts
- test/host/diffPreview.requirements.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/diffPreview.test.ts
- test/integration/lifecycle.test.ts
default_owner_email: gaetan@xeberon.net
---

## The side preview follows the active Markdown editor

### Normative behavior

When another saved Markdown file becomes the active editor, or a text diff whose real file is another saved Markdown file becomes the active tab, the extension SHALL switch only the newest side preview that follows the editor to that file, show Preview pending with the message Following the active Markdown editor. until its render ends, apply only the last requested document when the editor changes during the switch, and leave the preview unchanged for any other editor change.

### Scenario S1 (nominal): Second file

- GIVEN a side preview of preview.md
- WHEN the reader makes preview-other.md the active editor
- THEN the preview shows Following the active Markdown editor., then the render of preview-other.md, and never the output of preview.md as the current one (integration tests test/integration/lifecycle.test.ts, second lifecycle render, and test/integration/sourceMapping.test.ts)

### Scenario S2 (boundary): Editor changes that leave the preview as it was

| Input | Outcome |
| --- | --- |
| the active editor changes to the document the preview already shows | nothing changes: no new render and the same requestId |
| the reader focuses package.json with a side preview of preview-other.md | the preview keeps its document, status and requestId, with no reload (integration test test/integration/lifecycle.test.ts, 750 ms bounded sleep) |
| the reader returns to the Markdown editor | no new render is needed: the requestId is unchanged |

### Scenario S3 (nominal): A text diff becomes active

- GIVEN a side preview of a.md that follows the editor
- WHEN a text diff of b.md becomes the active tab (a git diff, a two-file compare or the replace preview), whichever side holds the cursor
- THEN the preview switches to the real file of the diff, b.md, as for a text editor
- AND a move of the cursor between the sides of the same diff, a diff with no side of the file scheme (a stand-in) and a diff whose real file is the shown document switch nothing

### Scenario S4 (boundary): Editors the side preview does not follow

| Input | Outcome |
| --- | --- |
| a side preview of a.md and the multi-file diff editor (the changes view of several files) becomes the active tab | the preview keeps its document: that editor is not followed |
| a side preview of a.md and the merge editor (3-way merge) becomes the active tab | the preview keeps its document: that editor is not followed |

The reason is the VS Code API: it gives these two editors no tab input class (only the text, text diff, custom, notebook and similar classes exist), so the host cannot tell them from another editor and reads them as an editor change that leaves the preview unchanged. Open the file in a text editor or in the single-file text diff to preview it (documented in docs/known-limitations.md and docs/user/open-studio.md).

### Scenario S5 (boundary): Only the newest following preview switches

| Input | Outcome |
| --- | --- |
| a side preview that follows and an Open With tab on another file, another Markdown file becomes active | only the side preview switches |
| a restored older panel made a fixed preview and a newer following panel, another Markdown file becomes active | only the newer panel switches |

### Scenario S6 (boundary): Quick switching between documents

| Input | Outcome |
| --- | --- |
| a side preview of A and a flush of the page's editors still running, the reader activates B then A before the flush ends | the preview ends on A and does not switch to B |
| an editor of A is open in the page and the reader returned to A before the switch ran, the flush ends | the page's editor is watched again instead of the document being switched |

### Scenario S7 (nominal): Another workspace folder or trust state

- GIVEN a multi-root workspace and a side preview of a file in folder one
- WHEN a file of folder two becomes active
- THEN the session of folder one is disposed, a new session is created on the same panel with followsActiveEditor and lockedColumn kept, and it starts from the Preview pending page

### Scenario S8 (boundary): Same folder and trust state, or no folder

| Input | Outcome |
| --- | --- |
| a side preview with restricted reads of a file in no workspace folder, another file of another directory also in no folder becomes active | a new session is created too, because the resource folder is the document's own directory |
| the same document folder and trust state | the session is kept |

### Scenario S9 (boundary): A hidden preview that becomes visible

| Input | Outcome |
| --- | --- |
| a preview hidden while the editor scrolled to line 400, the reader selects the preview tab | the preview scrolls to line 400 (the editor's first visible line) |
| the preview was visible and only gained or lost focus | no catch-up is sent and the preview keeps its position |

### Known issues

- Known limit: the multi-file diff editor and the merge editor are not followed (see "Editors the side preview does not follow"); no code detects them, so the row is by reading the API, not run.
- Known issue: a session replaced because the next document needs another resource root or trust state starts with an empty remembered-state map, so the reading state of earlier documents is not brought back after such a switch.

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-003: Open Preview to Side, which creates the side preview that follows.
- SwRS-MDOKFSTUDIO-BLOCK-205: open editors are saved before the preview switches.
- SwRS-MDOKFSTUDIO-LIFE-125: the reading state the replaced session loses.

### Verification notes

- Method: test/integration/lifecycle.test.ts (Second file: the second lifecycle render; Editor changes that leave the preview as it was: focuses package.json, sleeps 750 ms and asserts the same requestId, then returns to the Markdown file and asserts no new render; the same-document row is by reading the code).
- Method: test/host/diffPreview.requirements.test.ts and test/integration/diffPreview.test.ts (A text diff becomes active: a git diff with the cursor in its git side, the replace preview, a focus move, a stand-in).
- Method: test/integration/sourceMapping.test.ts (Second file: the old stage must not reveal during a switch). The message text Following the active Markdown editor. is checked in test/host/lifeReq.requirements.test.ts ("switching the active file retitles the side preview ...").
- Method: test/host/lifeReq.requirements.test.ts, unit tests "only the newest following preview switches with the active editor" (Only the newest following preview switches: reads onActiveEditorChanged, manager.latest(followsActiveEditor)), "a document outside the workspace folder gets a new session on the same panel" (Another workspace folder or trust state and Same folder and trust state, or no folder: reads switchDocument in src/session/previewManager.ts) and "a hidden preview that becomes visible catches up with the editor" (A hidden preview that becomes visible: reads createSession becameVisible and ScrollSyncController.restorePreviewState).
- Method: test/core/preview/flushWait.test.ts, "CR 025: LatestRequest applies only the latest request, so A to B to A ends on A" (Quick switching between documents, first row); the came-back branch (watchPageEditor) has no test at a reasonable cost: it needs a page editor that closes and returns under the real host.
- Criteria: documentUri equals the new document and the old document's HTML is gone; documentUri, status and requestId are equal before and after an unrelated change; exactly one session changes documentUri; settle() returns the latest value only for the last queued run; a new session replaces the old one only when resourceRoot or restrictedReads differs; restorePreviewState runs only on the hidden-to-visible transition and only with scrollPreviewWithEditor on.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-003](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-003.md): The side preview follows the active file and refreshes on demand
<!-- okf:links:end -->
