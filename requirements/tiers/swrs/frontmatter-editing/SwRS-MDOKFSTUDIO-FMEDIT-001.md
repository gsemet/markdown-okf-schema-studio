---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-001
uuid: fcdc4b22-d5c6-4889-9d41-2f67b6817b41
title: "A click on a field in edit mode opens its editor in place"
description: "When a writer clicks, or presses Enter or Space on, a name or value
  cell of the properties table in edit mode, the extension SHALL open a field editor
  inside that cell."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/frontmatterEditor.ts
- src/page/features/frontmatterValueEditor.ts
- src/page/features/pageInput.ts
tested_in_files:
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
- test/page/runtimeFrontmatterFields.test.ts
- test/visual/capture_page_checks.py
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-013
- SwRS-MDOKFSTUDIO-FMEDIT-065
- SwRS-MDOKFSTUDIO-FMEDIT-066
- SwRS-MDOKFSTUDIO-FMEDIT-087
---

## A click on a field in edit mode opens its editor in place

### Normative behavior

When a writer clicks, or presses Enter or Space on, a name or value cell of the properties table in edit mode, the extension SHALL open a field editor inside that cell.

### Scenario (nominal): A click or a key opens the editor

- GIVEN edit mode on and a properties table whose title field is a text field
- WHEN the writer clicks the value cell, or focuses it and presses Enter or Space
- THEN an editor labelled "Frontmatter title" opens inside that cell

### Scenario (refusal): Reading mode and read-only previews open no editor

- GIVEN edit mode off (reading mode)
- WHEN the writer clicks a name or value cell of the table
- THEN no editor opens and the table is unchanged; in a read-only preview the cells carry no edit attribute at all (see SwRS-MDOKFSTUDIO-TRUST-001); in edit mode the cells have tabindex 0, outside it they have none

### Scenario (nominal): A plain click on a link value edits the field

- GIVEN edit mode on and a field value that shows a link
- WHEN the writer clicks the link without a modifier
- THEN the field editor opens and no navigation happens

### Scenario (boundary): Link clicks that still follow the link

| Input | Outcome |
| --- | --- |
| Plain click on the link in edit mode | The field editor opens, no navigation |
| Click with Cmd or Ctrl in edit mode | The link is followed |
| Click on the link in reading mode | The link is followed |

### Scenario (refusal): Field and key editors have no palette or slash menu

- GIVEN a text field editor open
- WHEN the writer types / or makes a text selection in it
- THEN no slash menu opens and no edition palette appears; only the block editors bind the palette and the slash menu

### Scenario (nominal): A 460 px preview opens and cancels an editor without page overflow

- GIVEN edit mode on at 460 px with a tall properties table
- WHEN the writer clicks the value cell of the status field, types a new value and presses Escape
- THEN a field editor opens in that cell, then closes on Escape and the cell shows the original value, and the page has no horizontal scroll at any moment

### Scenario (boundary): A tall properties table at 460 px scrolls to both ends

- GIVEN edit mode on at 460 px with a tall properties table
- WHEN the writer scrolls the preview to the bottom and back to the top, then the source editor syncs to line 1 while the preview is scrolled down
- THEN both ends of the table are reached, the page has no horizontal scroll, and the preview returns to the top with line 1 visible

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-041: an open field editor blocks the other edits, opens and refreshes.
- SwRS-MDOKFSTUDIO-FMEDIT-019: saving and cancelling the editor this tile opens.

### Verification notes

- Method: test/page/runtimeFrontmatterEditor.test.ts (click, Enter and Space open the editor; reading mode opens none; tabindex 0 in edit mode only).
- Method: test/page/runtimeFrontmatterFields.test.ts (plain click on an okf link in edit mode opens the editor; Cmd or Ctrl click and reading mode follow the link).
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (typing in a field or key editor opens neither the slash menu nor the edition palette).
- Method: visual scenario frontmatter-editing/v06-okf-schema-narrow-scroll-stress-edit-dark-460 in test/visual/scenarioDefinitions2.ts and test/visual/capture_page_checks.py (editor opens and Escape closes at 460 px without horizontal scroll; scroll positions at the bottom, at the top and after the source sync to line 1).
- Criteria: The editor exists in edit mode only; real browser at 460 px width for the two visual scenarios.
