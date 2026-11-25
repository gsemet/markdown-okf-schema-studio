---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-011
uuid: dcddba2d-ae63-4769-bb9e-2642cdeae799
title: A control under the floating toolbar is moved or narrowed out of its way
description: When the floating toolbar covers the first control of the page (the
  open first-block editor, the Start writing button or the controls of a leading
  properties table), the extension SHALL publish the smallest clearance and
  inset that move it down or narrow it out of the toolbar's way, and a clearance
  of 0 and an inset of 0 when the toolbar sits beside the text column or ends
  above the 40 px gap, so that the first element keeps exactly 40 px.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
scenarios:
- id: S1
  title: Toolbar beside the column
- id: S2
  title: Toolbar ending above the gap
- id: S3
  title: First-block editor narrowed
- id: S4
  title: First-block editor pushed down
- id: S5
  title: Start writing button and properties table controls
- id: S6
  title: Palette bottom edge of the first-block editor
- id: S7
  title: The clearance follows layout changes
- id: S8
  title: Toolbar bottom edge for the sticky palette
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/firstClearance.ts
- src/page/runtime.ts
tested_in_files:
- test/page/diagReq.layout.requirements.test.ts
- test/page/modules/firstClearance.test.ts
- test/visual/capture_first_gap_checks.py
- test/visual/scenarioAssertions.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-012
- SwRS-MDOKFSTUDIO-LAYOUT-014
- SwRS-MDOKFSTUDIO-LAYOUT-015
- SwRS-MDOKFSTUDIO-LAYOUT-016
- SwRS-MDOKFSTUDIO-LAYOUT-018
- SwRS-MDOKFSTUDIO-LAYOUT-037
- SwRS-MDOKFSTUDIO-LAYOUT-042
---

## A control under the floating toolbar is moved or narrowed out of its way

### Normative behavior

When the floating toolbar covers the first control of the page (the open first-block editor, the Start writing button or the controls of a leading properties table), the extension SHALL publish the smallest clearance and inset that move it down or narrow it out of the toolbar's way, and a clearance of 0 and an inset of 0 when the toolbar sits beside the text column or ends above the 40 px gap, so that the first element keeps exactly 40 px. The extension SHALL measure the clearance again after layout changes (a window resize, a change of size or content of the column, the toolbar or a leading properties table, a root attribute, a web font load, the window load, the toolbar collapsed or expanded, a change of the width mode) and publish the toolbar bottom edge plus 8 px as --sphinx-preview-toolbar-bottom while the toolbar shares horizontal space with the text column (0 otherwise).

### Scenario S1 (nominal): Toolbar beside the column
- GIVEN a column from 100 to 700 px and a toolbar that starts at 800 px, with an open first-block editor
- WHEN the clearance is measured
- THEN the published first clearance and first inset are both 0 px

### Scenario S2 (nominal): Toolbar ending above the gap
- GIVEN a 460 px column and a toolbar that overlaps it horizontally but ends at 20 px, above the 40 px gap
- WHEN the clearance is measured
- THEN the clearance and the inset are 0 px

### Scenario S3 (nominal): First-block editor narrowed
- GIVEN a column from 0 to 900 px with a content box from 16 to 884 px, a toolbar from 600 to 850 px and an open first-block editor
- WHEN the clearance is measured
- THEN the inset is 292 px (884 minus 600 plus 8), the clearance is 0 and the inset is published as --sphinx-preview-first-inset
- AND a hidden Start writing button because the editor replaced it, in the same wide pane, counts as an open first-block editor: clearance 0 and inset 292 px

### Scenario S4 (nominal): First-block editor pushed down
- GIVEN a 460 px column, a toolbar from 200 to 450 px reaching down to 84 px and an open first-block editor, so that narrowing it would leave the frame under 320 px
- WHEN the clearance is measured
- THEN the clearance is 52 px (toolbar bottom 84 plus 8 margin minus 40 gap), the inset is 0 and the frame top is just below the toolbar
- AND a plain paragraph as the first element in the same pane keeps its 40 px margin, because the clearance applies only to the first-block editor, the Start writing button and a leading properties table

### Scenario S5 (nominal): Start writing button and properties table controls
| Input | Outcome |
| --- | --- |
| 460 px column, toolbar from 200 to 450 px reaching down to 84 px, Start writing button from 16 to 316 px | Clearance 52 px |
| 900 px column, toolbar from 600 px, Start writing button from 16 to 121 px | Clearance 0 px |
| 900 px column, toolbar from 600 to 850 px, right-aligned Description toggle of a leading properties table at 800 to 824 px | Inset 292 px, clearance 0 |
| 460 px column, toolbar from 200 px over the right-aligned toggle, so that less than 320 px would remain | The table is not shortened (inset 0 px) and is pushed down instead (clearance above 0) |
| 460 px column, left-aligned badge of a leading properties table at 250 to 310 px with a top of 45 px under a toolbar reaching 84 px | Clearance 47 px (toolbar bottom 84 plus 8 margin minus the badge top 45) |
| 900 px column whose controls are all clear of the toolbar | Clearance and inset 0, the table keeps its 40 px gap |

### Scenario S6 (boundary): Palette bottom edge of the first-block editor
| Input | Outcome |
| --- | --- |
| Column 0 to 900 px, toolbar 600 to 850 px reaching down to 84 px, open first-block editor (frame gives up 292 px) | --sphinx-preview-first-bar-bottom is 0px and the palette stays in the 40 px place, while --sphinx-preview-toolbar-bottom is 92px |
| 460 px column, toolbar 200 to 450 px reaching down to 84 px, open first-block editor (inset 0) | --sphinx-preview-first-bar-bottom is 92px, so the palette sticks below the toolbar |

### Scenario S7 (nominal): The clearance follows layout changes
- GIVEN a leading properties table whose Description toggle moves under the toolbar after the last measurement
- WHEN the window load event fires
- THEN the inset is measured again and published (192 px in the tested layout)

- GIVEN the properties section is replaced by a new one
- WHEN the next update runs
- THEN the new section is observed for size changes

- GIVEN a 360 px pane in edit mode with the toolbar collapsed to its first row and a paragraph, then a table, as first element
- WHEN the page is rendered
- THEN the paragraph and the table start exactly 40 px (within 4 px) below the top; and with a settled page, a click on the collapse chevron makes the toolbar-collapse callback measure the first-element clearance again

- GIVEN a page whose first element sits 40 px below the top, and a width mode change that makes the column narrower
- WHEN the Width button is clicked
- THEN the first-element clearance is measured again, so the first element keeps its 40 px gap below the toolbar at the new width; a width mode change that leaves the column width and the toolbar position unchanged still measures again (the change callback calls the update unconditionally) and the published values stay the same

### Scenario S8 (boundary): Toolbar bottom edge for the sticky palette
| Input | Outcome |
| --- | --- |
| 460 px column and a toolbar from 200 to 450 px ending at 84 px | --sphinx-preview-toolbar-bottom is 92px |
| 600 px column from 100 px and a toolbar from 800 px | The toolbar bottom is 0px |

### Known issues
- Known issue: The 480 px limit between wide and narrow is a rule of the visual tests only: the code decides by overlap with the toolbar and a 320 px minimum frame width, so a 481 px pane with a long toolbar could push content down as well.
- Known issue: A non-interactive first element, such as a paragraph or a table, is never pushed down: only the first-block editor, the Start writing button and a leading properties table take the clearance. A first paragraph or heading wraps its text around the toolbar instead, and a first table or other box keeps its 40 px place (SwRS-MDOKFSTUDIO-LAYOUT-043).
- Known issue: Older documents (archive 004 T8, CHANGELOG 0.2.1) describe a 56 px first-block margin and a 24 px Start writing margin; the uniform 40 px with an inset replaces them. Visual scenarios v07 to v09 keep the older assertion of at least 20 px.
- Known issue: The variable --sphinx-preview-first-bar-bottom is 0 whenever the inset is above 0, including a leading properties table that gave up the toolbar width; only the first-block editor palette reads it, falling back to --sphinx-preview-toolbar-bottom when it is unset.

### Verification notes
- Method: test/page/modules/firstClearance.test.ts (all scenarios): nothing is pushed when the toolbar is beside the column; a toolbar that ends above the 40px gap needs no clearance and no inset; P3 an open first-block editor keeps its 40px gap and gives up the width the toolbar covers; P3 a hidden Start writing button counts as an open first-block editor; P3 first-block editor in a pane too narrow to be narrowed is pushed below the toolbar (content top measured in document coordinates, which also checks the palette bottom edge); P3 the Start writing button is pushed only when the button itself is under the toolbar; P3 a Description toggle under the toolbar makes the table give up the toolbar's width; P3 a left-aligned badge under the toolbar in a narrow pane is pushed below it; P3 a properties table with no control under the toolbar keeps its 40px gap. The narrow-table fallback is verified by inspection of firstClearance.ts (untested).
- Method: test/page/modules/firstClearance.test.ts (the layout-change re-measure): a late load or font settlement measures again; the leading properties table is observed itself, also after it is replaced; P4 the toolbar's bottom edge is published for the sticky palette only where it overlaps the column; a change inside a burst of skipped updates is measured by one trailing update. Burst limit: more than 200 updates within one second are skipped and the last change is measured in one trailing timer, so exactly one timer is pending after a burst (a protection added after a continuous-integration regression; after a change the layout is also measured on every animation frame until it has been unchanged for 60 frames, limit 300 frames, which no test checks).
- Method: test/visual/capture_comment_checks.py and test/visual/scenarioAssertions.ts (collapsing the toolbar): visual scenarios v55 and v56 (collapsed toolbar at 360 px); the callback wiring in the page runtime is checked by inspection (the callback list is complete). test/page/diagReq.layout.requirements.test.ts: `a width mode change measures the first-element clearance again, even when nothing moved`.
- Method: test/visual/capture_comment_checks.py (first-block editor and Start writing button): first-element gap checks at 900 and 1600 px, in panes of 480 px or less (down to 360 px), and v39 to v41, v54, v59 and v62.
- Method: test/page/modules/firstClearance.test.ts (narrow-table fallback): a leading properties table in a 460 px column with its toggle under the toolbar keeps inset 0 and takes a clearance above 0.
- Criteria: The values written to the root style are --sphinx-preview-first-clearance: 0px and --sphinx-preview-first-inset: 0px when nothing is covered; clearance equals toolbar bottom plus 8 minus content top minus 40 and never below 0; inset equals the content right edge minus the toolbar left edge plus 8, with clearance 0; clearance is greater than 0 for the Start writing button only when the rectangles of the button and the toolbar share horizontal space; the bottom edge variable is 0px when the inset is above 0, otherwise the toolbar bottom edge plus 8 px (92px for a toolbar ending at 84 px).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-004](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-004.md): The first element starts clear of the top and of the floating toolbar
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LAYOUT-012](SwRS-MDOKFSTUDIO-LAYOUT-012.md): A first-block editor too narrow to be narrowed is pushed below the toolbar
  - [SwRS-MDOKFSTUDIO-LAYOUT-014](SwRS-MDOKFSTUDIO-LAYOUT-014.md): A first-block editor gives up the width the toolbar covers
  - [SwRS-MDOKFSTUDIO-LAYOUT-015](SwRS-MDOKFSTUDIO-LAYOUT-015.md): The Start writing button is pushed only when it sits under the toolbar
  - [SwRS-MDOKFSTUDIO-LAYOUT-016](SwRS-MDOKFSTUDIO-LAYOUT-016.md): A leading properties table gives up the toolbar width for its Description toggle
  - [SwRS-MDOKFSTUDIO-LAYOUT-018](SwRS-MDOKFSTUDIO-LAYOUT-018.md): The clearance is measured again after layout events, in bounded bursts
  - [SwRS-MDOKFSTUDIO-LAYOUT-037](SwRS-MDOKFSTUDIO-LAYOUT-037.md): A leading properties table is pushed down for a control under the toolbar
  - [SwRS-MDOKFSTUDIO-LAYOUT-042](SwRS-MDOKFSTUDIO-LAYOUT-042.md): A first-block editor's palette keeps its place unless the frame is under the toolbar
<!-- okf:links:end -->
