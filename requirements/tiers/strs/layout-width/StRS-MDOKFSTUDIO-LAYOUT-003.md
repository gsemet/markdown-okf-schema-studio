---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-003
uuid: 9806c49c-5f3c-41ac-a8af-165b5cae728f
title: A reader chooses how wide the text column is
description: When a writer or team sets the maximum width of the text column or
  a reader presses the Width button, the Studio SHALL limit and centre the
  column of every preview to that width, cycle between Margin, Auto and Full
  width modes, remember the mode for the workspace, and follow later changes of
  the setting.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer or team, I choose how wide the text column is, from a
  narrow measure to the whole pane, and every open preview follows; as a reader,
  I switch between a narrow reading column, a column that lets wide content out,
  and the full pane with one button, the choice is still there when I come back,
  I see wide tables, pictures and diagrams in full in Auto when the pane has
  room, and I can rely on Margin to keep everything in a readable column and on
  Full width to use the whole pane.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-021
- SwRS-MDOKFSTUDIO-LAYOUT-002
- SwRS-MDOKFSTUDIO-LAYOUT-003
- SwRS-MDOKFSTUDIO-LAYOUT-004
- SwRS-MDOKFSTUDIO-LAYOUT-005
- SwRS-MDOKFSTUDIO-LAYOUT-006
- SwRS-MDOKFSTUDIO-LAYOUT-020
- SwRS-MDOKFSTUDIO-LAYOUT-021
- SwRS-MDOKFSTUDIO-LAYOUT-022
- SwRS-MDOKFSTUDIO-LAYOUT-023
- SwRS-MDOKFSTUDIO-LAYOUT-024
- SwRS-MDOKFSTUDIO-LAYOUT-025
- SwRS-MDOKFSTUDIO-LAYOUT-026
- SwRS-MDOKFSTUDIO-LAYOUT-027
- SwRS-MDOKFSTUDIO-LAYOUT-028
- SwRS-MDOKFSTUDIO-LAYOUT-029
- SwRS-MDOKFSTUDIO-LAYOUT-030
- SwRS-MDOKFSTUDIO-LAYOUT-031
- SwRS-MDOKFSTUDIO-LAYOUT-036
- SwRS-MDOKFSTUDIO-LAYOUT-038
- SwRS-MDOKFSTUDIO-LAYOUT-039
- SwRS-MDOKFSTUDIO-LAYOUT-040
- SwRS-MDOKFSTUDIO-LAYOUT-041
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
---

## A reader chooses how wide the text column is

### Normative behavior

When a writer or team sets the maximum width of the text column or a reader presses the Width button, the Studio SHALL limit and centre the column of every preview to that width, cycle between Margin, Auto and Full width modes, remember the mode for the workspace, and follow later changes of the setting.

### Preserved stakeholder intent

As a writer or team, I choose how wide the text column is, from a narrow measure to the whole pane, and every open preview follows; as a reader, I switch between a narrow reading column, a column that lets wide content out, and the full pane with one button, the choice is still there when I come back, I see wide tables, pictures and diagrams in full in Auto when the pane has room, and I can rely on Margin to keep everything in a readable column and on Full width to use the whole pane.

### Rationale and constraints

- Accepted values of the width setting are 0 to 2400 pixels (default 960, step 50 in the settings UI): 1 to 2400 limits and centres the column, 0 lifts the limit, a larger value is cut to 2400, a negative or non-numeric value falls back to 960 and a decimal is rounded.
- At 100% zoom a pane wider than the cap shows a column exactly the cap wide and centred (960 px by default in a 1600 px pane, 1400 px in a 2000 px pane); the zoom scaling of the column belongs to the theme-zoom scope.
- The rule is written into each rendered page, and a change of the setting updates open previews from their last good render without reloading the editor.
- The Width button sits in the third toolbar row (the options row, after Theme); the placement itself is checked by the toolbar-navigation scope.
- The order is Margin, Auto, Full width, then Margin again; the icon, label and tooltip read "Width: Margin", "Width: Auto" and "Width: Full width".
- The choice is kept per workspace: at start the saved page state wins over the stored workspace preference, which wins over Margin; an invalid value is ignored and Margin applies.
- In Auto, a table, figure, image, code block or Mermaid diagram wider than the column uses the available width, centred and clear of the pane edges; elements not wider are left alone, and a gain of 1 px or less is ignored.
- The element takes the width it needs up to the available area (the pane minus the open table-of-contents column minus a 16 px gutter on each side) and is centred on that area; with the table-of-contents column open its 256 px are excluded from the area, the centre and the cap.
- A wide table is measured without the cap and rounded up to the next pixel so that no cell wraps.
- An element under edit keeps the column width while its editor is open, and a figure sized in %, em or rem stays relative to the column; an image uses the author's pixel width before its intrinsic size.
- The wide elements are measured again after a content patch, a window or content resize, image load, toolbar collapse, table-of-contents toggle and when an element enters or leaves edit.
- Margin keeps tables, code blocks and figures inside the text column; they scroll or wrap instead of leaving it.
- Full width removes the column limit and gives the page and wide blocks the same 16 px side margins as a table that breaks out in Auto; text, tables, code blocks and figures are centred with at least 15 px gutters.
- In every mode a table or figure narrower than the column is centred at its own width, a narrow figure and its caption are centred under the picture, a paragraph holding only an image is marked as a figure, and code blocks stay left with their width.
- Known issue: the README says that with the setting at 0 the three width modes look the same, which is not exact because Full width keeps a 16 px gutter while the other modes keep up to 78 px.
- Known issue: the update of an open preview after a setting change has no automated test.
- Known issue: the code and README put the button on row 3, while the file header of the width mode module and an older bullet of the Unreleased change-log entry say row 2.
- Known issue: the paths for %/em/rem figures, declared pixel widths, the Mermaid wrapper and the 1 px tolerance are not directly tested, and no visual scenario combines the open table-of-contents column with Auto.
- Known issue: some visual scenario titles (`v05`, `v06` "full") do not match what they assert.
