---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-018
uuid: 7594fe35-49be-4bf9-90c0-ed34b26d118d
title: The clearance is measured again after layout events, in bounded bursts
description: When the window is resized, the column, toolbar or leading
  properties table changes size, the toolbar or column content mutates, a root
  attribute changes, a web font loads, the window loads, the toolbar is
  collapsed or expanded or the reader changes the width mode, the extension
  SHALL measure the first-element clearance again and publish the toolbar bottom
  edge plus 8 px as --sphinx-preview-toolbar-bottom while the toolbar shares
  horizontal space with the text column (0 otherwise), skipping the excess of
  more than 200 updates within one second and measuring the last change in one
  trailing update.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/firstClearance.ts
- src/page/runtime.ts
tested_in_files:
- test/page/diagReq.layout.requirements.test.ts
- test/page/modules/firstClearance.test.ts
- test/visual/capture_comment_checks.py
- test/visual/scenarioAssertions.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-013
- SwRS-MDOKFSTUDIO-LAYOUT-017
- SwRS-MDOKFSTUDIO-LAYOUT-019
- SwRS-MDOKFSTUDIO-LAYOUT-041
---

## The clearance is measured again after layout events, in bounded bursts

### Normative behavior

When the window is resized, the column, toolbar or leading properties table changes size, the toolbar or column content mutates, a root attribute changes, a web font loads, the window loads, the toolbar is collapsed or expanded or the reader changes the width mode, the extension SHALL measure the first-element clearance again and publish the toolbar bottom edge plus 8 px as --sphinx-preview-toolbar-bottom while the toolbar shares horizontal space with the text column (0 otherwise), skipping the excess of more than 200 updates within one second and measuring the last change in one trailing update.

### Scenario (nominal): Late load
- GIVEN a leading properties table whose Description toggle moves under the toolbar after the last measurement
- WHEN the window load event fires
- THEN the inset is measured again and published (192 px in the tested layout)

### Scenario (nominal): Replaced properties table
- GIVEN the properties section is replaced by a new one
- WHEN the next update runs
- THEN the new section is observed for size changes

### Scenario (nominal): Collapsing the toolbar
- GIVEN a 360 px pane in edit mode with the toolbar collapsed to its first row and a paragraph, then a table, as first element
- WHEN the page is rendered
- THEN the paragraph and the table start exactly 40 px (within 4 px) below the top
- AND with a settled page, a click on the collapse chevron makes the toolbar-collapse callback measure the first-element clearance again

### Scenario (nominal): Width mode change
- GIVEN a page whose first element sits 40 px below the top, and a width mode change that makes the column narrower
- WHEN the Width button is clicked
- THEN the first-element clearance is measured again, so the first element keeps its 40 px gap below the toolbar at the new width
- AND a width mode change that leaves the column width and the toolbar position unchanged still measures the clearance again, because the change callback calls the update unconditionally, and the published values stay the same

### Scenario (boundary): Toolbar bottom edge for the sticky palette
| Input | Outcome |
| --- | --- |
| 460 px column and a toolbar from 200 to 450 px ending at 84 px | --sphinx-preview-toolbar-bottom is 92px |
| 600 px column from 100 px and a toolbar from 800 px | The toolbar bottom is 0px |

### Scenario (boundary): Burst of updates
- GIVEN 205 resize events in one second followed by a layout change and two more resizes
- WHEN the events are handled
- THEN the change is not measured by the skipped updates and exactly one trailing timer is scheduled
- AND when the second has ended and the trailing timer runs, the last change is measured and published (inset 192 px in the tested layout)

### Known issues
- Known issue: This robustness behaviour is undocumented and comes from a continuous-integration regression (run 39916805010) described in the source comment; describe() is a diagnostic exposed as window.__studioDiagnostics.firstClearance.
- Known issue: The same toolbar-collapse callback also refreshes the sticky heading position, the table-of-contents layout and the width update; those belong to other requirements.
- Known issue: The wiring of the toolbar-collapse callback has no unit test of its own; the collapse itself belongs to the toolbar requirements.
- Known issue: Part of the sticky edit bar behaviour belongs to the palette requirements; only the toolbar clearance input is specified here and the sticky behaviour has no layout-width visual scenario.
- Known issue: After a change the layout is also measured on every animation frame until it has been unchanged for 60 frames, with a limit of 300 frames; only the burst limiter is tested.

### Verification notes
- Method: test/page/modules/firstClearance.test.ts (late load, replaced properties table, toolbar bottom edge, burst): a late load or font settlement measures again; the leading properties table is observed itself, also after it is replaced; P4 the toolbar's bottom edge is published for the sticky palette only where it overlaps the column; P3 an open first-block editor keeps its 40px gap and gives up the width the toolbar covers; a change inside a burst of skipped updates is measured by one trailing update.
- Method: test/visual/capture_comment_checks.py and test/visual/scenarioAssertions.ts (collapsing the toolbar): visual scenarios v55 and v56 (collapsed toolbar at 360 px); the callback wiring in the page runtime is checked by inspection (the callback list is complete).
- Method: test/page/diagReq.layout.requirements.test.ts (width mode change): the unit test `a width mode change measures the first-element clearance again, even when nothing moved`.
- Criteria: After each event the published values equal a fresh measurement; the measured top of the first element is 40 px within 4 px in the visual cases; published toolbar values equal the bottom edge plus 8 on overlap and 0 otherwise; exactly one timer is pending after a burst and the final measurement is published after it fires; the change callback calls the first-element clearance update.
