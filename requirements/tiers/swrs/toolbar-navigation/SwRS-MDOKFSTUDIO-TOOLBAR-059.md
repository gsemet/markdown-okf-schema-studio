---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-059
uuid: 0765edc5-d3ae-4fc7-8b47-2d313e432e3c
title: "Followed links and anchor jumps are recorded per panel and replayed at their
  line"
description: "When the reader follows a link to another Markdown document in a preview
  that follows the active editor, or an anchor of the shown document that resolves
  to a source line, the extension SHALL record the place in the history of that panel,
  and when Back or Next leads to a recorded place, open its document with the stored
  line selected or scroll the preview to the stored line."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/history.ts
- src/session/features/links.ts
tested_in_files:
- test/core/state/navigationHistory.test.ts
- test/integration/previewHistory.test.ts
- test/page/runtimeScroll.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Followed links and anchor jumps are recorded per panel and replayed at their line

### Normative behavior

When the reader follows a link to another Markdown document in a preview that follows the active editor, or an anchor of the shown document that resolves to a source line, the extension SHALL record the place in the history of that panel, and when Back or Next leads to a recorded place, open its document with the stored line selected or scroll the preview to the stored line.

### Scenario (nominal): Link to another Markdown document
- GIVEN a preview of first.md at line 3 and a link to second.md#target
- WHEN the link is followed
- THEN the history holds the place being left, first.md at line 3, and then second.md at the first line of its selection (the line of the heading), the current index is the target and Back becomes possible

### Scenario (boundary): Unknown line
- GIVEN a preview that never reported a line
- WHEN a link is followed
- THEN the place left is recorded at line 1

### Scenario (nominal): In-page anchor jump
- GIVEN anchors #target (a heading) and #note-label (a MyST label)
- WHEN each is followed
- THEN each adds one history entry at its source line (5 and 9 in the fixture)

### Scenario (refusal): Moves that are not recorded
| Input | Outcome |
| --- | --- |
| An anchor whose id has no source line, such as a generated id | The preview still scrolls but no history entry is added (an entry is added only when markdownFragmentRange finds a line) |
| A link to notes.txt or another local file whose extension is not .md | The file opens in the editor and the history is unchanged |
| A link to NOTES.MD | It is recorded, because the extension is compared in lower case |
| A link to second.md followed in a locked preview (one that does not follow the active editor) | second.md opens and the history is unchanged |
| An in-page anchor followed in the same locked preview | The jump is recorded |

### Scenario (nominal): Back or Next to another document
- GIVEN the history first.md line 3 then second.md
- WHEN Back is pressed
- THEN first.md opens with line 3 selected and the preview follows it; Next opens the second document with its line restored

### Scenario (boundary): Line past the end
- GIVEN a stored line larger than the document
- WHEN Back is pressed
- THEN the last line is selected (selection line = min(max(stored line, 1), line count) minus 1)

### Scenario (nominal): Back or Next within the same document
- GIVEN the history holds two places of second.md and an older scroll anchor of the preview
- WHEN Back is pressed
- THEN no document is opened, the preview receives a sourceScroll to the stored line, and the preview's scroll anchor becomes the stored line, owned by the editor, so a stale anchor cannot overwrite it

### Scenario (boundary): Anchor mode off
- GIVEN a panel whose Anchor mode is off and a history of two places of the same document
- WHEN Back is pressed
- THEN the history moves, the buttons update and the preview scrolls to the stored line, because the sourceScroll of a history move carries reveal true, which the page honours when it does not follow the editor

### Scenario (nominal): One history per panel
- GIVEN two preview panels
- WHEN links are followed in the first
- THEN the second panel's Back and Next stay disabled; a document switch that recreates the session of a panel keeps the same history object, which lives as long as the panel

### Related requirements
- SwRS-MDOKFSTUDIO-TOOLBAR-054: Back and Next, their state and their warnings.
- SwRS-MDOKFSTUDIO-TOOLBAR-065: the list that holds the places, its size and its duplicates.

### Verification notes
- Method: test/integration/previewHistory.test.ts (Link to another Markdown document: link to second.md#target, entries and posted state; In-page anchor jump: #target and #note-label; Back or Next to another document: Back to line 3, Next to the second document with its line restored; Back or Next within the same document: lastSourceScrollLine 1 and the history entry of the same document). The clamp of Line past the end, the no-source-line anchor and the stale anchor replacement (by code only) are not tested there.
- Method: test/page/runtimeScroll.test.ts (Anchor mode off: a sourceScroll with reveal true scrolls the page, one without it is ignored).
- Method: test/core/state/navigationHistory.test.ts (Unknown line: depart without a known line).
- Method: test/session/toolbarReq.requirements.test.ts (Moves that are not recorded: a locked preview records anchor jumps only, a link to a file that is not Markdown opens without a history entry; One history per panel: each preview panel has its own history that outlives a session).
- Criteria: entries = [place left, target] and the current index is the target; preview.scroll.lastSourceScrollLine and the anchor equal the stored line; recordNavigation is not called for a file link when followsActiveEditor is false and requires path.extname(...).toLowerCase() === .md; historyOf returns one NavigationHistory per panel.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
<!-- okf:links:end -->
