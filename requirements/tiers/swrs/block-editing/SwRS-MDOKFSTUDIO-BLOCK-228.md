---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-228
uuid: 17d9f2c8-1351-4087-b71d-f7f5eb61eb1c
title: "Opening, saving and closing an editor keep the reading position"
description: "When a writer opens, saves or closes an editor, the extension SHALL
  keep the edited block, table or properties section at its screen position: the page
  scrolls by the palette height on opening and back on closing, and the final save
  carries the source line and the viewport top (pinLine and pinViewportTop) that the
  host puts back at the same viewport top on the next render."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-FMEDIT-001
- StRS-MDOKFSTUDIO-TABLE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/editorChrome.ts
- src/page/features/scrollCore.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/runtimeScroll.test.ts
- test/session/blockReq.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-057
---

## Opening, saving and closing an editor keep the reading position

### Normative behavior

When a writer opens, saves or closes an editor, the extension SHALL keep the edited block, table or properties section at its screen position: the page scrolls by the palette height on opening and back on closing, and the final save carries the source line and the viewport top (pinLine and pinViewportTop) that the host puts back at the same viewport top on the next render.

### Scenario (nominal): The final save of a block carries the pin
- GIVEN an editor on a paragraph at line 12 whose frame top is at 180 px after a palette shift of 40 px
- WHEN the final save is posted
- THEN it carries pinLine 12 and pinViewportTop 220, the top of the frame plus the shift, because the rendered paragraph is hidden; an insertion editor uses the line after its bar

### Scenario (nominal): Table and properties saves carry the pin
| Input | Outcome |
| --- | --- |
| A table visible in the pane, a cell edited and Enter pressed | The final save carries the source line and the viewport top of the table, and after the re-render the table top is within 3 px of its position at the moment of Enter |
| The saving status changes the edited element's geometry | The pin is captured before the status changes, preserving the position visible when Save was requested |
| A table whose rendered rectangle is empty and a final save | The position of the editor element stands in for the table's |
| A value save of a field of the properties section | The message carries pinLine 1 and the pinViewportTop of the properties section |
| A field save in the last row of a long table | pinLine is still 1 and the viewport top is that of the section, not of the row |
| An add or a remove action of the properties section | It carries the same fields |
| A properties section with an empty rectangle | No pin fields are sent |

### Scenario (boundary): Out of range
- GIVEN a viewport top beyond 100000 px or not finite
- WHEN the final save is posted
- THEN it carries no pin fields

### Scenario (nominal): The host stores the pin
- GIVEN a final save with pinLine 12 and pinViewportTop 180
- WHEN the host handles it
- THEN the pin is stored for five seconds and used by the first render of that version or later, which puts the line back at the same viewport top

### Scenario (boundary): A save without a pin
- GIVEN a final save without both pin fields
- WHEN the host handles it
- THEN no pin is stored

### Scenario (nominal): Opening an editor keeps the clicked text where it was
- GIVEN a paragraph centred in the view and a palette that adds height above the frame
- WHEN its editor opens and the source arrives
- THEN the page moves by the palette height only, without overshoot or oscillation, and the clicked text moves by at most 2 px

### Scenario (boundary): Page at the top
- GIVEN a page scrolled to its very top
- WHEN an editor opens
- THEN the page is not scrolled

### Scenario (nominal): Closing an editor scrolls the page back
- GIVEN an editor that opened with a palette shift of 40 px
- WHEN it closes
- THEN the page scrolls back by 40 px, within the scroll bounds of the page, and the anchor line is updated

### Scenario (boundary): Close without a shift
- GIVEN an editor that opened without a shift
- WHEN it closes
- THEN the page is not scrolled

### Verification notes
- Method: test/page/runtimeScroll.test.ts with `a final block save carries the edited element's pin; an autosave does not` changes the target geometry when the saving status appears and checks that the final save retains the pre-status pin.
- Method: test/integration/realInput/editorWidgets.ts with the markers in test/integration/realInput/markers.ts: real-input scenario scenarioSaveKeepsBlockInPlace (screenshot block-editing/r19) checks the block pin and the opening without a jump; the same scenario with the id table-editing/r07-save-keeps-table-in-place checks the table row (drift at most 3 px).
- Method: test/visual/scenarioDefinitions2.ts: visual scenarios block-editing/v13 (dark, 900 px) and block-editing/v14 (light, 460 px) check the block pin and the opening of an editor; docs/scroll-anchoring.md rule R7.
- Method: test/session/blockReq.requirements.test.ts (the host stores the pin, a save without a pin) with `a final save with a pin stores it for five seconds, a save without the two fields stores none`.
- Method: test/page/blockReq.requirements.test.ts (closing an editor scrolls the page back, close without a shift) with `closing an editor scrolls the page back by the shift applied on opening`.
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (properties field save carries the pin) with `a field save carries the source line and viewport top of the properties section`.
- Criteria: pinFields returns an empty object outside the bounds; storePendingPin ignores messages without both fields; keepTextInPlaceBelowPalette returns the shift and stores it in paletteShift; the target scroll on close is clamped between 0 and the maximum scroll; the hidden-element fallback of the table row is read from pinFields and has no table-specific test; the page at the top case has no test of its own.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-057](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-057.md): The properties section keeps its place across the save
<!-- okf:links:end -->
