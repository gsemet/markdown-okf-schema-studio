---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-032
uuid: a106a3b5-b9ce-40c0-a61c-febdcdcfa8e6
title: Refresh Preview renders the shown document again
description: When a reader runs Refresh Preview, by the command or by the
  Refresh button, the extension SHALL render the document of the newest live
  preview again from its buffer, unsaved text included, doing nothing when the
  active text editor shows another document.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
- StRS-MDOKFSTUDIO-LIFE-003
- StRS-MDOKFSTUDIO-LIFE-005
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
- src/page/features/pageInput.ts
- src/session/features/viewState.ts
- src/session/previewManager.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/host/previewTiming.test.ts
- test/integration/lifecycle.test.ts
- test/page/runtimeScroll.test.ts
- test/security/package-contract.test.ts
---

## Refresh Preview renders the shown document again

### Normative behavior

When a reader runs Refresh Preview, by the command or by the Refresh button, the extension SHALL render the document of the newest live preview again from its buffer, unsaved text included, doing nothing when the active text editor shows another document.

### Scenario (boundary): Command declaration

| Input | Outcome |
| --- | --- |
| the package manifest, the contributed commands are read | markdown-okf-schema-studio.refreshPreview has the title Refresh Preview, the category Markdown OKF-Schema Studio and the enablement resourceExtname == .md, and no icon |
| the active resource is not a .md file | the command is disabled (deduced from the when clause, not run) |

### Scenario (nominal): Dirty buffer

- GIVEN a preview of preview-other.md and a buffer edited by an API edit without a save
- WHEN the reader runs Refresh Preview
- THEN a new render with a higher requestId shows the edit marker

### Scenario (nominal): Over an open editor

- GIVEN an inline editor open in the page
- WHEN the command runs
- THEN the render replaces the page even then (see SwRS-MDOKFSTUDIO-BLOCK-041)

### Scenario (refusal): Other document

- GIVEN the newest preview shows preview.md and the active text editor shows preview-other.md
- WHEN the reader runs Refresh Preview
- THEN no render starts and no message appears

### Scenario (boundary): Which preview the command acts on

| Input | Outcome |
| --- | --- |
| no text editor is active, for example the preview itself has focus, and the command is run from code | the newest preview's own document is rendered again |
| a side preview and a later Open With tab of the same file | only the Open With tab, the newer session, renders again |
| the newest preview is closed | the newest remaining preview is the target |

### Scenario (nominal): Button pressed

- GIVEN a page scrolled to line 120 with two open sections, a link tooltip open and nothing being edited
- WHEN the reader presses Refresh
- THEN the page closes the tooltip and posts previewRefresh carrying sourceLine, scrollTop, anchorLine, openDisclosures and descriptionsCollapsed

### Scenario (refusal): Button pressed over an open editor

- GIVEN a block editor is open
- WHEN the reader presses the button
- THEN nothing is posted and the editor's status line asks to save or cancel (see SwRS-MDOKFSTUDIO-BLOCK-041)

### Scenario (boundary): The previewRefresh message

| Input | Outcome |
| --- | --- |
| a previewRefresh with the envelope (documentId, revision, requestId) and any of line, endLine, sourceLine and selectionLine (safe integers of at least 1), anchorLine (a finite number of at least 1), scrollTop (a finite number of at least 0), previewThemeMode, anchorToEditor, editMode (booleans) and request (a string); focusedBlockId, selectedText, openDisclosures, descriptionsCollapsed and activation are reported state that is not validated | accepted as a message (see SwRS-MDOKFSTUDIO-TRUST-052) |
| a previewRefresh with an invalid optional field, or one that belongs to another type (a pin, blockEditOpen, final, a checkbox column or a frontmatter field) | not a message, ignored (see SwRS-MDOKFSTUDIO-TRUST-052) |
| a page of the current render reporting state and a refresh | the state is recorded for the document and a new render replaces the page, even over an open editor |
| the message names an older render than the host holds | dropped without any render (see SwRS-MDOKFSTUDIO-TRUST-065) |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-041: an open editor blocks the Refresh button and its message.

### Verification notes

- Method: test/security/package-contract.test.ts "contributes only opt-in Markdown OKF-Schema Studio commands" (command declaration).
- Method: test/integration/lifecycle.test.ts (dirty buffer, the explicitly refreshed dirty render).
- Method: test/host/previewTiming.test.ts "Refresh Preview brings the render to the page even over an open inline editor" (over an open editor); the previewRefresh handler itself (current and stale render rows) is untested and checked by reading ViewStateController.register, where previewRefresh sets forceNextResult.
- Method: test/host/lifeReq.requirements.test.ts "Refresh Preview does nothing while the active text editor shows another document" and "Refresh Preview acts on the preview created last that is still open" (other document, which preview the command acts on); checked by reading refreshActive, activeSession and latest() in src/session/previewManager.ts (activeSession is set when a session is created, not when it switches documents).
- Method: test/page/runtimeScroll.test.ts "refresh preserves viewport state while reverse synchronization stays disabled" (button pressed: asserts the message type, scrollTop and a numeric sourceLine; anchorLine, the focused block, the selected text, the open sections, the Description state and the closing of the tooltip are untested); the button over an open editor is checked by the tests of SwRS-MDOKFSTUDIO-BLOCK-041.
- Method: test/core/protocol/pageStateMessages.test.ts (the previewRefresh message accepted and refused).
- Criteria: the command entry equals the expected object; requestId grows and the HTML holds the edit marker; refreshActive requests a render only when document.id equals session.documentUri and reads manager.active, which createSession sets and disposeSession resets to the newest live session; the posted message holds the scroll fields of the snapshot; forceNextResult is set and refreshPreviewDocument runs for a current message only.
