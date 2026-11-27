---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-108
uuid: 2099ed76-477c-4b3a-95d6-ab16a9451ea0
title: Scrolling or clicking the preview reveals the source line
description: When the reader scrolls the preview to another source line or
  activates a rendered block outside edit mode, the extension SHALL reveal that
  source line in the visible text editor that shows the preview's file, as the
  settings allow, and leave every editor unmoved when no visible text editor
  shows that file or the report names another file.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
scenarios:
- id: S1
  title: Scrolling posts the new top line
- id: S2
  title: The host reveals the line at the top of the editor
- id: S3
  title: Clicking a block reveals its source line
- id: S4
  title: Enter or Space on a focused block
- id: S5
  title: A text diff shows the file
- id: S6
  title: No text editor shows the file
- id: S7
  title: A report that names another source file
- id: S8
  title: The revealed line stays inside the document
- id: S9
  title: Accepted shape of previewScroll and previewReveal
- id: S10
  title: Defaults, the setting off and the double click
- id: S11
  title: Scroll reports carry the selected text, read once
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/pageInput.ts
- src/page/features/scrollCore.ts
- src/page/modules/shownContent.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/host/diffPreview.requirements.test.ts
- test/integration/sourceMapping.test.ts
- test/page/frameReadsInChromium.test.ts
- test/page/pageSettings.test.ts
- test/page/runtimeScroll.test.ts
- test/page/scrollSelection.test.ts
- test/session/lifeReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LIFE-097
---

## Scrolling or clicking the preview reveals the source line

### Normative behavior

When the reader scrolls the preview to another source line or activates a rendered block outside edit mode, the extension SHALL reveal that source line in the visible text editor that shows the preview's file (in a text diff, its side of the file scheme only), as the settings allow, and leave every editor unmoved when no visible text editor shows that file or the report names another file.

### Scenario S1 (nominal): Scrolling posts the new top line
- GIVEN anchor mode and scrollEditorWithPreview on and the reader scrolling from line 10 to line 14.6
- WHEN the scroll frame runs
- THEN the page posts previewScroll with line 14
- GIVEN a scroll that leaves the rounded line at 14
- WHEN the next frame runs
- THEN no second previewScroll is posted; with the anchor mode off the page posts only previewState

### Scenario S2 (nominal): The host reveals the line at the top of the editor
- GIVEN a preview and a text editor of the same file, scrollPreviewWithEditor and scrollEditorWithPreview on
- WHEN the host receives previewScroll with line 14
- THEN the editor shows line 14 at its top and its caret does not move
- GIVEN scrollEditorWithPreview off
- WHEN the message arrives
- THEN the editor is not moved

### Scenario S3 (nominal): Clicking a block reveals its source line
| Input | Outcome |
| --- | --- |
| a click on a paragraph that starts at source line 2, in reading mode, scrollEditorWithPreview on, the text editor scrolled elsewhere | the page posts previewReveal with activation click and the block's source line (line 50 in the unit test); the editor reveals line 2, centred when it was outside the viewport |
| a click on a link, a checkbox, a comment chip or an insertion control | no source line is revealed |
| a click while scrollEditorWithPreview is off | no source line is revealed |

### Scenario S4 (nominal): Enter or Space on a focused block
| Input | Outcome |
| --- | --- |
| Enter on a focused paragraph in reading mode | the page posts previewReveal with activation keyboard and the host reveals the line |
| Space on a focused rendered block outside edit mode | the page posts previewReveal with activation keyboard for that block's source line |
| Enter with the focus in a button, an input, a link or the Description toggle | no reveal is posted |

### Scenario S5 (boundary): A text diff shows the file

| Input | Outcome |
| --- | --- |
| a diff whose original side is a git or virtual document at the path of the file and whose modified side is the file | the line is revealed in the modified side only |
| a diff with no side of the file scheme | no editor moves |

### Scenario S6 (refusal): No text editor shows the file
- GIVEN a preview with no visible text editor of its file
- WHEN the reader scrolls or clicks in the preview
- THEN no editor is created and the document is unchanged
- GIVEN a text editor of another file
- WHEN the reader scrolls the preview
- THEN that editor does not move

### Scenario S7 (refusal): A report that names another source file
| Input | Outcome |
| --- | --- |
| previewReveal whose sourceFile is another path | the editor is not moved |
| previewScroll that carries a line and no source file | the line is revealed in the editor of the preview's file |
| previewScroll or previewReveal naming a stale or foreign render | refused before this rule runs, see SwRS-MDOKFSTUDIO-TRUST-065 |

### Scenario S8 (boundary): The revealed line stays inside the document
| Input | Outcome |
| --- | --- |
| a document of 50 lines and a reveal of line 400 | line 50 is revealed |
| a reveal request below line 1 | line 1 is revealed |

### Scenario S9 (boundary): Accepted shape of previewScroll and previewReveal
| Input | Outcome |
| --- | --- |
| line, endLine, sourceLine or selectionLine a safe integer of at least 1 | accepted |
| anchorLine a finite number of at least 1 and scrollTop a finite number of at least 0 | accepted |
| activation click or keyboard, and a sourceFile string | accepted; the validator does not check them, the host compares the sourceFile path with the active document |
| line 0, line 1.5, anchorLine below 1 or a negative scrollTop | malformed: dropped by the envelope check without a visible change, the editor is not moved (see SwRS-MDOKFSTUDIO-TRUST-052) |
| a well-formed previewScroll while scrollPreviewWithEditor is off | the reading state is recorded, the editor is not moved |

### Scenario S10 (boundary): Defaults, the setting off and the double click

| Input | Outcome |
| --- | --- |
| No stored value for markdownOkfSchemaStudio.preview.scrollEditorWithPreview, preview settings read | The setting is true (on by default) |
| scrollEditorWithPreview set to false and the reader scrolls or clicks in the preview | The editor does not move |
| The reader double-clicks rendered content outside edit mode | The page posts nothing beyond the reveals of its two clicks; there is no double-click setting (a doubleClickToSwitchToEditor value left in the user settings is not a setting of the extension and has no effect) |

### Scenario S11 (boundary): Scroll reports carry the selected text, read once

| Situation | Outcome |
| --- | --- |
| several scrolls over an unchanged selection | every report carries the selected text, and the page turns the selection into text once |
| the selection changes, or its ends move | the next report carries the new text |
| the content under an unmoved selection changes, or a switch of the page hides or shows part of it (a collapsed properties table) | the next report carries the text as it then is |
| no selected text | the report carries none |

### Related requirements
- SwRS-MDOKFSTUDIO-LIFE-100: the reverse direction, from the text editor to the preview
- SwRS-MDOKFSTUDIO-LIFE-119: the anchor line that previewScroll reports
- SwRS-MDOKFSTUDIO-LIFE-125: the reading state that every previewScroll also reports
- SwRS-MDOKFSTUDIO-LIFE-071: a change of the scroll settings replaces the page document

### Verification notes
- Method: test/integration/scroll-sync-suite.ts (scenarios 1 and 5: source follows preview, solo scenarios, scrolling must not edit the document)
- Method: test/host/diffPreview.requirements.test.ts (A text diff shows the file: a previewReveal reveals the file side and never the git side that shares its path).
- Method: test/page/runtimeScroll.test.ts (scenarios 1, 3 and 4: "disabling editor anchoring stops preview-to-editor scrolling"; "executes source and preview synchronization across layout changes" dispatches the click and asserts previewReveal with line 50 and activation click, and dispatches Enter and asserts previewReveal with activation keyboard; the exclusion list of buttons, inputs, links, chips and insertion controls is untested, checked by reading the keydown handler of bindClicks in src/page/features/pageInput.ts)
- Method: test/integration/sourceMapping.test.ts (scenarios 2 and 3: previewScroll line 1 reveals line 1 and lastRevealedSourceLine equals the message line, click activation reveals line 2; the caret is not moved because revealRange does not change the selection, deduced from the code)
- Method: test/session/lifeReq.requirements.test.ts (scenarios 6 and 7: "a reveal that names another source file moves nothing" and "a revealed line is clamped between the first and the last line of the document", by reading revealFromPage and revealEditorLine, Math.max(0, Math.min(lineCount - 1, line - 1)))
- Method: scenario 8 is checked by the envelope tests of SwRS-MDOKFSTUDIO-TRUST-052 and by reading hasValidStateFields in src/core/protocol/pageToHost.ts (the shape of the two message types is checked in test/core/protocol/pageToHost.test.ts)
- Method: test/page/pageSettings.test.ts (Defaults): "page settings default to following both ways, without selection marks or double-click reveal"; test/page/runtimeScroll.test.ts (the double click): "executes source and preview synchronization across layout changes" (a dblclick posts nothing more). The click path with scrollEditorWithPreview off has no test (untested); checked by reading revealFromPage and revealEditorLine.
- Method: test/page/scrollSelection.test.ts (scenario 11: one text for several reports, a changed selection, no text) and, in Chromium in the `visual` CI job, test/page/frameReadsInChromium.test.ts (scenario 11: content hidden by an attribute, a style or a class, typed text and a collapsed properties table under an unmoved selection).
- Criteria: readPreviewConfiguration returns true for no value of scrollEditorWithPreview; revealEditorLine returns before any reveal when scrollEditorWithPreview is false; the page registers no double-click listener; previewScroll is posted only when the rounded line changed; lastRevealedSourceLine equals the message line; visibleTextEditors is unchanged and the document equals the file on disk when no editor shows the file; revealEditorLine runs only when the resolved paths are equal or no file is named; the zero-based line is between 0 and lineCount - 1.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-010](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-010.md): The panes scroll together and the reading position survives updates
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LIFE-097](SwRS-MDOKFSTUDIO-LIFE-097.md): Two settings decide how the panes follow each other
<!-- okf:links:end -->
