---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-064
uuid: a03b917d-5031-4519-9a51-cc90c2029dad
title: The table bar rides down with a tall table and stays visible
description: When a cell editor is open and the table bar would lie under the
  sticky band or the preview controls, the extension SHALL keep the bar visible,
  by translating it down with a tall table to 4 px below the usable top and
  never past the end of the table, and by scrolling the page up by exactly the
  missing distance when the bar appears above the reading offset.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/editorChrome.ts
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/page/fmtableReqTable.requirements.test.ts
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## The table bar rides down with a tall table and stays visible

### Normative behavior

When a cell editor is open and the table bar would lie under the sticky band or the preview controls, the extension SHALL keep the bar visible, by translating it down with a tall table to 4 px below the usable top and never past the end of the table, and by scrolling the page up by exactly the missing distance when the bar appears above the reading offset.

### Scenario (nominal): Scrolled into a tall table
- GIVEN a table taller than the pane scrolled so that its top is under the sticky band
- WHEN the page scrolls
- THEN the bar is translated down to the usable top plus 4 px, the table text does not move, and the bar carries the stuck mark

### Scenario (boundary): Near the end of the table
- GIVEN the table's bottom close to the usable top
- WHEN the page scrolls
- THEN the translation is limited so that the bar bottom does not pass the table bottom

### Scenario (boundary): Size of the bar against the viewport
| Input | Outcome |
| --- | --- |
| A bar taller than 40 percent of the viewport and a table scrolled under the band | The bar stays in its place above the table: the shift stays 0 px and the stuck mark is not set |
| A bar at most 40 percent of the viewport and the same scroll | The bar rides down |

### Scenario (nominal): Window resize while the editor is open
| Input | Outcome |
| --- | --- |
| A bar translated down and the window resized (the resize event fires) | The shift is recomputed for the new geometry |
| The editor closed, then the window scrolls or is resized | The scroll and resize listeners of the bar are gone and nothing is recomputed |

### Scenario (nominal): Bar appearing above the reading offset
| Input | Outcome |
| --- | --- |
| The bar appears 30 px above the usable top with the page scrolled down | The page scrolls up by 30 px as a preview-owned scroll and the edit anchor is moved by the same delta |
| The page is scrolled to 10 px and the bar is 30 px above the usable top | The scroll is limited to 10 px |

### Scenario (boundary): No scroll into view
| Input | Outcome |
| --- | --- |
| A bar at or below the usable top | No scroll is made |
| Only the empty part of the bar lies under the preview controls | No scroll is made |
| A bar above the usable top and a selected cell whose bottom plus the delta passes the viewport height | No scroll is made |

### Scenario (nominal): A later layout change hides the bar again
| Input | Outcome |
| --- | --- |
| The bar is shown and its status wraps onto a new line, which moves the bar above the usable top, then the edit anchor is restored | The bar is revealed again by the missing distance |
| The bar size is unchanged and the writer has scrolled, then the edit anchor is restored | The writer's scroll is not undone |

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-048: the table bar that this behaviour keeps visible.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts, unit tests CR 034: the table toolbar rides down with a tall table and leaves with the table (scenarios "Scrolled into a tall table", small bar of "Size of the bar against the viewport"), a toolbar that appears above the reading offset is scrolled into view by the exact delta ("Bar appearing above the reading offset"), a toolbar that is already visible causes no extra scroll, P8: a toolbar box is not revealed when only its empty part is under the preview controls and the toolbar is not revealed when that would push the selected cell out of the viewport ("No scroll into view"), and a later layout change that pushes the toolbar above the reading offset is revealed again ("A later layout change hides the bar again", the unchanged-size case is covered by the already-visible test).
- Method: test/page/fmtableReqTable.requirements.test.ts, unit tests a table bar taller than 40 percent of the viewport keeps its place above the table (tall bar and small bar of "Size of the bar against the viewport") and the table bar position follows a window resize and stops once the editor is closed ("Window resize while the editor is open").
- Method: visual scenarios palette-slash/v19 and v20 (cited by the palette-slash scope) check the bar riding down with a tall table.
- Method: "Near the end of the table" is checked by the assertion of a bar not below the table end in the CR 034 test above; the exact translation value (usable top plus 4 minus the natural top, limited by the room to the table bottom) is the stickyBarShift formula and is not asserted.
- Criteria: A positive shift, the stuck mark, a bar inside the viewport and a bar not below the table end; the shift value (0 px) for the tall bar; the shift changing with the resize and the listeners removed at close; the scroll target equal to the previous offset minus the delta; no programmatic scroll in the three no-scroll cases; a new programmatic scroll when the status wraps and none when the size is unchanged.
