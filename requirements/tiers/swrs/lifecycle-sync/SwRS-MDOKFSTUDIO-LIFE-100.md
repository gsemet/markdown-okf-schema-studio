---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-100
uuid: 5142b871-d93e-4280-a772-b08dd2486453
title: Scrolling the text editor scrolls the preview to the same line
description: When the text editor of a previewed document scrolls while the
  anchor mode is on, the extension SHALL record the editor's first visible line
  as the anchor of each preview of that document, owned by the editor, and
  scroll the preview so that this line sits at its reading line, without
  reporting that scroll back to the editor.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-003
- StRS-MDOKFSTUDIO-LIFE-005
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/scroll/anchorPolicy.ts
- src/page/features/scrollCore.ts
- src/session/features/scrollSync.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/scroll/anchorPolicy.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/scroll-sync-suite.ts
- test/integration/sourceMapping.test.ts
- test/page/runtimeBundle.test.ts
- test/page/runtimeContentPatch.test.ts
- test/page/runtimeScroll.test.ts
- test/session/lifeReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Scrolling the text editor scrolls the preview to the same line

### Normative behavior

When the text editor of a previewed document scrolls while the anchor mode is on, the extension SHALL record the editor's first visible line as the anchor of each preview of that document, owned by the editor, and scroll the preview so that this line sits at its reading line, without reporting that scroll back to the editor.

### Scenario (nominal): Host records the editor's first visible line
- GIVEN a side preview of the file and the anchor mode on
- WHEN the text editor scrolls to its line 40 and the visible range changes
- THEN the preview's anchor is line 40 with the editor as owner and the host posts sourceScroll to the page

### Scenario (nominal): Page scrolls to the editor line
- GIVEN a preview and a text editor of the same file, anchor mode on, the editor scrolled to line 120
- WHEN the page receives sourceScroll with line 120
- THEN the page takes line 120 as its anchor, owned by the editor, and the preview scrolls so that line 120 starts at its reading line below the sticky heading band

### Scenario (refusal): Scroll that is not followed
| Input | Outcome |
| --- | --- |
| the anchor mode off and the editor-selection mark off, and the editor scrolls | the anchor is not recorded and nothing is posted |
| sourceScroll whose line is below 1 | the anchor and the scroll position are unchanged |
| sourceScroll whose line is not a finite number | the anchor and the scroll position are unchanged |
| sourceScroll that names another render | refused by the host message acceptance rule, see SwRS-MDOKFSTUDIO-TRUST-059 |

### Scenario (nominal): The page's own scroll is not reported
- GIVEN a page that scrolled to line 120 for a sourceScroll
- WHEN the resulting scroll event arrives within 500 ms and within 2 px of the target
- THEN no previewScroll is posted, so the editor is not scrolled back
- WHEN the reader scrolls the preview afterwards
- THEN the page takes the anchor as owner preview and reports it

### Scenario (boundary): The host ignores the editor scroll that its own reveal caused
| Input | Outcome |
| --- | --- |
| the host revealed line 80 while the editor top was line 10, and the editor reports first visible lines 40 and 80 within 0.5 seconds | both are echoes and do not move the preview (they lie between the start and the target line) |
| a reveal that leaves the editor top outside the range, and the editor reports one event with the revealed line visible | that single event is accepted as an echo; further scrolling counts as the reader's |
| an editor report after the 0.5 second window | not an echo; it moves the preview |

### Scenario (nominal): The pane the reader moved owns the anchor
| Input | Outcome |
| --- | --- |
| the editor scrolled, then the reader scrolls the preview | the preview is the owner of the anchor and the owner changes without the preview jumping; the source wheel moves independently of the drag |
| the editor scrolled elsewhere after the preview reported line 30, then the reader scrolls the preview to line 30 again | the preview reports line 30 again |

### Scenario (boundary): Which preview knows whether a text editor shows its file
| Input | Outcome |
| --- | --- |
| a solo preview and the reader opens the file in a text editor (the visible editors change) | the page receives previewPairing with pairedTextEditor true (see SwRS-MDOKFSTUDIO-TOOLBAR-120 for the Anchor button) |
| the text editor is closed (the visible editors change) | the page receives pairedTextEditor false |
| a preview without a rendered stage when the visible editors change | it receives nothing |
| a pairing change posted while the page document was still loading, then the page reports ready | the host posts previewPairing with the current value (the colour theme answer to the ready report is SwRS-MDOKFSTUDIO-THEME-016) |
| a page that applied a content patch reports ready | it gets the same answer |
| a host whose capabilities say editorPairing is false looks for the editor of a preview | none is found, no preview is paired and the Anchor button stays disabled |
| VS Code looks for the editor of a preview | visible editors whose document id equals the preview's document are paired |

### Scenario (nominal): Reading, edit and block-editor modes, with and without a text editor
| Input | Outcome |
| --- | --- |
| a 4000 line document, the preview and a text editor side by side, anchor mode on; the reader scrolls either pane down and up in reading mode, edit mode or with a block editor open | the other pane follows to the same place |
| anchor mode off, or no text editor of the file; the reader scrolls either pane | the other pane stays still, the document is not edited and a block editor stays open |

### Related requirements
- SwRS-MDOKFSTUDIO-LIFE-108: the reverse direction, from the preview to the text editor
- SwRS-MDOKFSTUDIO-LIFE-119: the anchor both panes share
- SwRS-MDOKFSTUDIO-TOOLBAR-120: the Anchor button that switches the anchor mode
- SwRS-MDOKFSTUDIO-LIFE-097: the settings that decide how the panes follow each other

### Verification notes
- Method: test/integration/scroll-sync-suite.ts (12 scenarios, paired and solo, reading, editing and block, anchored and independent: scenarios 2, 4, 6 and 8; source remains still checks the absence of scroll feedback in scenario 4; paired-reading-anchored, paired-editing-anchored and paired-block-anchored check scenario 2; the assertion that scrolling must not edit the document checks scenario 8)
- Method: test/page/runtimeScroll.test.ts (scenarios 2, 3, 4 and 6: "executes source and preview synchronization across layout changes", "source scrolling rejects stale identities and invalid line numbers", "preview can revisit its last reported line after the source editor scrolls elsewhere")
- Method: test/integration/sourceMapping.test.ts (scenario 1: lastSourceScrollLine after syncActiveEditorForTests; the off case of scenario 3 is checked by reading syncEditorToPreview)
- Method: test/core/scroll/anchorPolicy.test.ts (scenario 5: "ignores editor echoes across re-renders, then yields to the user" and "accepts one centered-reveal echo, then treats further scrolling as the user's"; the guard is keyed by document, not by render)
- Method: test/host/lifeReq.requirements.test.ts (scenario 7, the change of visible editors: "the host tells each preview whether a text editor shows its file whenever the visible editors change")
- Method: test/page/runtimeContentPatch.test.ts and test/page/runtimeBundle.test.ts (scenario 7, page side of the ready report: "T33: the startup sequence of effects and messages is stable" and "the bundled runtime file gives the pinned trace of a page session"; the host answer is checked by reading postPageLiveState)
- Method: test/session/lifeReq.requirements.test.ts (scenario 7, host without text editors: "a host without text editors reports no pairing"; visibleEditorFor in src/session/features/scrollSync.ts and HostCapabilities.editorPairing)
- Criteria: The scroll top is within 3 px of the expected one and the editor's top line is unchanged; scroll.anchor equals { line, owner editor } only while scrollPreviewWithEditor is on; no previewScroll follows a sourceScroll; isEcho is true inside the window and false after it; no scroll message returns to its sender; notifyPairing runs for every session on onDidChangeVisibleTextEditors; pageLiveStateMessages returns the pairing and the theme message for a ready report; visibleEditorFor returns undefined when the capability is false.
