---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-193
uuid: 7e84f343-d2fd-4163-9990-4881edd1a8a7
title: "Page updates wait while an inline editor is open"
description: "While the page has an inline editor open, the extension SHALL hold back
  the renders, theme changes, PlantUML work, link refreshes, include changes and properties
  table updates that would replace the page content, and deliver only the newest render
  of those that waited once the editor closes."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-FMEDIT-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/editLock.ts
- src/page/features/contentPatch.ts
- src/page/features/hostHandlers.ts
tested_in_files:
- test/core/state/editLock.test.ts
- test/host/previewTiming.test.ts
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/page/runtimeFrontmatterFields.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-060
- SwRS-MDOKFSTUDIO-FMEDIT-061
---

## Page updates wait while an inline editor is open

### Normative behavior

While the page has an inline editor open, the extension SHALL hold back the renders, theme changes, PlantUML work, link refreshes, include changes and properties table updates that would replace the page content, and deliver only the newest render of those that waited once the editor closes.

### Scenario (nominal): Render during editing
- GIVEN an open editor and a document change
- WHEN a render finishes
- THEN it waits and the editor keeps its text and caret

### Scenario (nominal): The newest waiting render is delivered when the editor closes
- GIVEN two renders that finished while the editor was open
- WHEN the editor closes
- THEN only the newest reaches the page

### Scenario (boundary): Work queued twice and a host lock without page editor
| Input | Outcome |
| --- | --- |
| Work queued twice under the same key | The earlier one is discarded when the second is queued, and its stage is freed |
| The host holds an edit but the page reports no open editor, and a finished render arrives | The render reaches the page; only an explicit page report of an open editor holds finished renders |

### Scenario (nominal): Properties update waits for the field editor
- GIVEN a field editor open
- WHEN previewPropertiesTable arrives
- THEN the table is not replaced and the markup is kept
- WHEN the editor closes and the deferral ends
- THEN the kept table is applied

### Scenario (nominal): A content patch closes an open block editor without cancelling
- GIVEN an open block editor whose text was autosaved
- WHEN a content patch is applied
- THEN the editor is closed, no previewEditCancel is posted and the document keeps the autosaved text

### Scenario (refusal): A content patch closes an open field editor
- GIVEN a field editor with typed text and a waiting properties update
- WHEN a previewContentPatch arrives
- THEN the editor closes without a save and the waiting update is dropped

### Scenario (boundary): A content patch without an open editor
| Input | Outcome |
| --- | --- |
| A patch is applied and no block editor is open | Nothing else is closed |
| A patch arrives and no field editor is open | The patch is applied normally |

### Scenario (nominal): A document switch drops the work of the old document
- GIVEN an editor closed by the flush and a render queued for the old document
- WHEN the preview switches to another document
- THEN the open page editor is forgotten, the queued work is discarded and the new document renders at once

### Scenario (boundary): A switch while the host still applies an edit
- GIVEN a final save still being applied
- WHEN the switch happens
- THEN the host's own edit lock is kept

### Known issues
- Known issue: a content patch closes an open field editor and loses its typed text.

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-191: the edit lock that the host holds while it applies an edit
- SwRS-MDOKFSTUDIO-BLOCK-041: one edit at a time

### Verification notes
- Method: test/core/state/editLock.test.ts (render during editing, host lock only, two renders, work queued twice, document switch, host edit still running) with the unit tests `an editor the page opened defers page updates and finished renders until it closes (STAB-03)`, `the host lock alone defers page work but lets a finished render through`, `reloads are deferred while held and flushed once on release`, `release forgets the page editor (the page was replaced) and a replaced deferral is discarded` and `a document switch forgets the page editor and drops the old document's work (STAB-03)`.
- Method: test/host/previewTiming.test.ts (render during editing, two renders) with `renders wait while the page has an inline editor open, and the newest one arrives on its close`.
- Method: test/integration/previewEditing.test.ts (render during editing, integration check).
- Method: test/page/runtimeBlockSelection.test.ts (content patch over a block editor, indirectly, with `T39: a content patch and leaving edit mode clear the selection`; a patch reaches an open editor only after a forced render, a document switch or the editor's own final save).
- Method: test/page/runtimeFrontmatterFields.test.ts (properties update waits for the field editor, T30 previewPropertiesTable is deferred while a frontmatter editor is open, then applied on close).
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (a content patch closes an open field editor without a save and drops the waiting properties update).
- Criteria: shouldDeferReload and shouldDeferResult answer as the unit tests assert; defer replaces the entry of the same key and runs discard; forgetPage clears the editor id and the queue; applyContentPatch calls closeBlockEdit(false); closeFrontmatterEditor is called with the reason content patch. Only the render path is tested; the held-back theme change, PlantUML work, link refresh and include change are supported by the callers of deferWhileEditing (src/session/hostEvents.ts, viewState.ts, frontmatter.ts, plantUml.ts) and are untested. The case of no open block editor on a patch and the case of no open field editor on a patch are untested.
