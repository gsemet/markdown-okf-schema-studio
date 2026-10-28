---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-039
uuid: 96db4241-aa8f-47a6-b8b0-db200572b14f
title: Typing renders the new text after a short pause, without writing files
description: When the text of a document changes, saved or not, the extension
  SHALL queue a render of the new text in every preview that shows that
  document, start it after a pause of 40 ms or of twice the last render time
  when that is longer (at most 1 s), let a running render finish first unless it
  has run more than 1 s and more than twice the wall-clock time of the last
  render when the newer render is due (then abort it), without writing to the
  shown file or to any build output folder of the workspace; a preview whose
  panel is hidden SHALL not render until the panel is shown, and previews of the
  same document, revision and render options SHALL share one render.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/buildQueue.ts
- src/core/render/renderPipeline.ts
- src/session/features/rendering.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
- src/session/sessionFactory.ts
- src/session/sharedRenders.ts
tested_in_files:
- test/core/state/editLock.test.ts
- test/host-memory/memoryHostSession.test.ts
- test/host/previewTiming.test.ts
- test/integration/dirtySnapshots.test.ts
- test/node-services/build/buildQueue.test.ts
- test/session/eventFanOut.test.ts
- test/session/previewManager.test.ts
- test/session/sharedRenders.test.ts
---

## Typing renders the new text after a short pause, without writing files

### Normative behavior

When the text of a document changes, saved or not, the extension SHALL queue a render of the new text in every preview that shows that document, start it after a pause of 40 ms or of twice the last render time when that is longer (at most 1 s), let a running render finish first unless it has run more than 1 s and more than twice the wall-clock time of the last render when the newer render is due (then abort it), without writing to the shown file or to any build output folder of the workspace. A preview whose panel is hidden SHALL not render until the panel is shown, and previews of the same document, revision and render options SHALL share one render.

### Scenario (nominal): Unsaved edit

- GIVEN a side preview of preview.md and an edit applied to the buffer without saving
- WHEN the change event fires
- THEN the preview renders the edited text and shows the new marker

### Scenario (refusal): Source gone

- GIVEN the previewed file no longer exists on disk when the change event fires
- WHEN the change is handled
- THEN the preview shows Preview source missing instead of rendering

### Scenario (boundary): Collecting edits for 40 ms

| Input | Outcome |
| --- | --- |
| five changes within 40 ms | when the 40 ms elapse one render starts and the page receives the last text once |
| a pending edit that the preview cancels before the delay ends | when the delay elapses the builder is never invoked |
| the last render took 300 ms | the next render starts 600 ms after the last change, not 40 ms |
| the last render took under 10 ms | the next render starts 40 ms after the last change |
| the last render took 3 s | the next render starts 1 s after the last change (the upper bound) |

### Scenario (boundary): Edits during a render

| Input | Outcome |
| --- | --- |
| a render of 500 ms running and two newer edits queued | when the running render ends its result is shown and the render of the newest edit starts at once; the older queued edit is superseded |
| a render whose buffer already changed | when the render ends its result is still shown, so the preview keeps moving while the writer types, and the newer render follows |
| the first render (no render time known yet) and a newer edit | the first render always finishes |
| the last render took 600 ms of wall-clock time, the running one has run 1.25 s when the newer edit's pause elapses | the running render is aborted (its worker thread stops, see SwRS-MDOKFSTUDIO-LIFE-004), the newest edit renders at once, a late result of the aborted render is dropped, and the time the aborted render ran becomes the estimate of the pause and of the overrun limit until a render completes |
| a small document: the MyST render takes 2 ms, the whole render 60 ms of wall-clock time, and a newer edit's 40 ms pause elapses during it | the running render finishes and the newer edit renders right after; no render is aborted before it has run 1 s |

### Scenario (boundary): Hidden panels and shared renders

| Input | Outcome |
| --- | --- |
| a preview whose panel is hidden and a change, a refresh or a document switch | no render starts; the preview is marked dirty |
| the dirty panel is shown | one render starts, and the mark is cleared |
| two previews of the same document at the same revision, workspace root, trust state, read-only state and PlantUML engine | one render serves both; each receives its own stage with its own request id |
| a file the render may have read changes, a setting changes, files are renamed or a refresh is requested | the next request renders again instead of joining a finished render |

### Scenario (nominal): Rendering writes nothing

- GIVEN a dirty buffer, or a render that throws, and a hash of the file and of the _build folder
- WHEN the preview renders the buffer, switches document, renders edits, or shows the failure
- THEN the file hash and the _build tree hash are unchanged

### Scenario (refusal): Save of a buffer the preview already shows

| Input | Outcome |
| --- | --- |
| a ready render of revision 7 and a save of the buffer at revision 7, the file watcher reports the saved file | no render starts (the activePathChanges probe counts the event, the requestId is unchanged) |
| the buffer is at revision 8 while the page shows revision 7, or the page shows an error, the watcher reports the file | a render starts |

### Scenario (boundary): The previewReady message

| Input | Outcome |
| --- | --- |
| a previewReady with the envelope (documentId, revision, requestId) and the optional state fields of a page-state message (line, endLine, sourceLine and selectionLine of at least 1, anchorLine of at least 1, scrollTop of at least 0, previewThemeMode, anchorToEditor, editMode, request) and blockEditOpen as a boolean | accepted as a message (see SwRS-MDOKFSTUDIO-TRUST-052); the host records the reported reading state and the render the page listens for |
| a previewReady that reports blockEditOpen false, or names another render than the one the host holds | the host releases an edit lock that waited for a page editor, so the lock cannot block every later edit |
| blockEditOpen on any type other than previewReady, or an invalid optional field | not a message, ignored (see SwRS-MDOKFSTUDIO-TRUST-052) |
| a previewReady that names an older render than the host holds | handled by the gate of its type (see SwRS-MDOKFSTUDIO-TRUST-065) |

### Verification notes

- Method: test/integration/dirtySnapshots.test.ts (unsaved edit: the initial dirty snapshot, the normal edited snapshot; edits during a render: the newest snapshot result; rendering writes nothing: asserts fileHash(fixturePath) and treeHash(_build) before and after the whole scenario).
- Method: test/host/previewTiming.test.ts "edits inside the 40 ms render debounce reach the page once, as the last text" (burst).
- Method: test/node-services/build/buildQueue.test.ts "debounces pending edits and cancels them without invoking the builder", "lets an in-flight build finish and starts the newest queued edit right after" and "still renders a build whose buffer already moved on, and cleans up on dispose" (cancelled, edits during a render). The queue's own default of 120 ms is not used by the product.
- Method: test/node-services/build/buildQueue.test.ts "adapts the debounce to twice the last build time, within its bounds" "aborts a build that overruns twice the last build time once a newer edit is due" and "never aborts a build of a small document whose wall time exceeds its reported render time" (mocked clock: the second build starts at 600 ms, not 40 ms; with the bound of the wait at 200 ms instead of 1 s, the overrunning build's signal aborts at 250 ms, not before; a 60 ms build whose render reports 2 ms is not aborted when a newer edit is due at 40 ms). The 1 s upper bound has no test of its own.
- Method: test/core/state/editLock.test.ts "a save of an unchanged open buffer needs no render (PERF-06)" and "a save of the already rendered buffer is skipped (PERF-06), any other state renders" cover the decision of the save rows; the wiring in refreshReferencedPath has no integration test.
- Method: test/core/protocol/pageStateMessages.test.ts (the previewReady message accepted and refused) and test/core/state/editLock.test.ts "a previewReady with another requestId releases the lock (STAB-02)" and "previewReady without a lock releases nothing".
- Method: the source gone scenario is untested.
- Method: test/session/previewManager.test.ts "two previews of one document and revision share one render, each with its own request id" and "a hidden panel does not render until it is shown, then renders once" (renders counted through the render override: 2 before the change for two previews and 2 for a hidden panel, 1 and 0 after); test/session/sharedRenders.test.ts (join, release with the last copy, new revision, invalidation).
- Criteria: the HTML of the ready render contains the typed marker; debounceMs is 40 in the session's queue (until a render time is known) and a burst yields one build; the final page holds only the newest marker and the request ids grow; both hashes equal their values before the test; isUnchangedSave is true only for the active document at the staged revision.
