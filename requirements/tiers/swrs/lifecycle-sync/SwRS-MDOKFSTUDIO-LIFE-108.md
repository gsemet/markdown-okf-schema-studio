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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/pageInput.ts
- src/page/features/scrollCore.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/integration/scroll-sync-suite.ts
- test/integration/sourceMapping.test.ts
- test/page/runtimeScroll.test.ts
- test/session/lifeReq.requirements.test.ts
---

## Scrolling or clicking the preview reveals the source line

### Normative behavior

When the reader scrolls the preview to another source line or activates a rendered block outside edit mode, the extension SHALL reveal that source line in the visible text editor that shows the preview's file, as the settings allow, and leave every editor unmoved when no visible text editor shows that file or the report names another file.

### Scenario (nominal): Scrolling posts the new top line
- GIVEN anchor mode and scrollEditorWithPreview on and the reader scrolling from line 10 to line 14.6
- WHEN the scroll frame runs
- THEN the page posts previewScroll with line 14
- GIVEN a scroll that leaves the rounded line at 14
- WHEN the next frame runs
- THEN no second previewScroll is posted; with the anchor mode off the page posts only previewState

### Scenario (nominal): The host reveals the line at the top of the editor
- GIVEN a preview and a text editor of the same file, scrollPreviewWithEditor and scrollEditorWithPreview on
- WHEN the host receives previewScroll with line 14
- THEN the editor shows line 14 at its top and its caret does not move
- GIVEN scrollEditorWithPreview off
- WHEN the message arrives
- THEN the editor is not moved

### Scenario (nominal): Clicking a block reveals its source line
| Input | Outcome |
| --- | --- |
| a click on a paragraph that starts at source line 2, in reading mode, scrollEditorWithPreview on, the text editor scrolled elsewhere | the page posts previewReveal with activation click and the block's source line (line 50 in the unit test); the editor reveals line 2, centred when it was outside the viewport |
| a click on a link, a checkbox, a comment chip or an insertion control | no source line is revealed |
| a click while scrollEditorWithPreview is off | no source line is revealed |

### Scenario (nominal): Enter or Space on a focused block
| Input | Outcome |
| --- | --- |
| Enter on a focused paragraph in reading mode | the page posts previewReveal with activation keyboard and the host reveals the line |
| Space on a focused rendered block outside edit mode | the page posts previewReveal with activation keyboard for that block's source line |
| Enter with the focus in a button, an input, a link or the Description toggle | no reveal is posted |

### Scenario (refusal): No text editor shows the file
- GIVEN a preview with no visible text editor of its file
- WHEN the reader scrolls or clicks in the preview
- THEN no editor is created and the document is unchanged
- GIVEN a text editor of another file
- WHEN the reader scrolls the preview
- THEN that editor does not move

### Scenario (refusal): A report that names another source file
| Input | Outcome |
| --- | --- |
| previewReveal whose sourceFile is another path | the editor is not moved |
| previewScroll that carries a line and no source file | the line is revealed in the editor of the preview's file |
| previewScroll or previewReveal naming a stale or foreign render | refused before this rule runs, see SwRS-MDOKFSTUDIO-TRUST-065 |

### Scenario (boundary): The revealed line stays inside the document
| Input | Outcome |
| --- | --- |
| a document of 50 lines and a reveal of line 400 | line 50 is revealed |
| a reveal request below line 1 | line 1 is revealed |

### Scenario (boundary): Accepted shape of previewScroll and previewReveal
| Input | Outcome |
| --- | --- |
| line, endLine, sourceLine or selectionLine a safe integer of at least 1 | accepted |
| anchorLine a finite number of at least 1 and scrollTop a finite number of at least 0 | accepted |
| activation click, double-click or keyboard, and a sourceFile string | accepted; the validator does not check them, the host compares the sourceFile path with the active document (see SwRS-MDOKFSTUDIO-LIFE-097 for the double-click setting) |
| line 0, line 1.5, anchorLine below 1 or a negative scrollTop | malformed: dropped by the envelope check without a visible change, the editor is not moved (see SwRS-MDOKFSTUDIO-TRUST-052) |
| a well-formed previewScroll while scrollPreviewWithEditor is off | the reading state is recorded, the editor is not moved |

### Related requirements
- SwRS-MDOKFSTUDIO-LIFE-100: the reverse direction, from the text editor to the preview
- SwRS-MDOKFSTUDIO-LIFE-119: the anchor line that previewScroll reports
- SwRS-MDOKFSTUDIO-LIFE-125: the reading state that every previewScroll also reports
- SwRS-MDOKFSTUDIO-LIFE-097: the settings that decide how the panes follow each other

### Verification notes
- Method: test/integration/scroll-sync-suite.ts (scenarios 1 and 5: source follows preview, solo scenarios, scrolling must not edit the document)
- Method: test/page/runtimeScroll.test.ts (scenarios 1, 3 and 4: "disabling editor anchoring stops preview-to-editor scrolling"; "executes source and preview synchronization across layout changes" dispatches the click and asserts previewReveal with line 50 and activation click, and dispatches Enter and asserts previewReveal with activation keyboard; the exclusion list of buttons, inputs, links, chips and insertion controls is untested, checked by reading the keydown handler of bindClicks in src/page/features/pageInput.ts)
- Method: test/integration/sourceMapping.test.ts (scenarios 2 and 3: previewScroll line 1 reveals line 1 and lastRevealedSourceLine equals the message line, click activation reveals line 2; the caret is not moved because revealRange does not change the selection, deduced from the code)
- Method: test/session/lifeReq.requirements.test.ts (scenarios 6 and 7: "a reveal that names another source file moves nothing" and "a revealed line is clamped between the first and the last line of the document", by reading revealFromPage and revealEditorLine, Math.max(0, Math.min(lineCount - 1, line - 1)))
- Method: scenario 8 is checked by the envelope tests of SwRS-MDOKFSTUDIO-TRUST-052 and by reading hasValidStateFields in src/core/protocol/pageToHost.ts (untested for the two message types themselves)
- Criteria: previewScroll is posted only when the rounded line changed; lastRevealedSourceLine equals the message line; visibleTextEditors is unchanged and the document equals the file on disk when no editor shows the file; revealEditorLine runs only when the resolved paths are equal or no file is named; the zero-based line is between 0 and lineCount - 1.
