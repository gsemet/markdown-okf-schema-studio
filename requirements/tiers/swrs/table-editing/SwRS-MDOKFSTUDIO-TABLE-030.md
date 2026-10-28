---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-030
uuid: b21e6f88-e755-49ca-8ea4-08a120cf70e0
title: Following a link or pressing Back or Next saves an open cell first
description: When a cell editor holds typed text and the writer follows a link
  to another file or presses Back or Next, the extension SHALL post the cell's
  final save, flagged as a flush, before the navigation message.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Following a link or pressing Back or Next saves an open cell first

### Normative behavior

When a cell editor holds typed text and the writer follows a link to another file or presses Back or Next, the extension SHALL post the cell's final save, flagged as a flush, before the navigation message.

### Scenario: Link right after typing

- GIVEN a cell typed in less than 400 ms ago and a link to another file clicked
- WHEN the click is handled
- THEN a final previewEditSave with the flush flag is posted before the link message

### Scenario: Anchor inside the page

- GIVEN an open editor and a link to an anchor inside the same page
- WHEN the link is clicked
- THEN the editor stays open and nothing is flushed

### Verification notes

- Method: Unit tests CR 025: following a link right after typing posts the final save before the link and CR 025: Back right after typing posts the final save before previewHistoryGo in test/page/runtimeEditorFlush.test.ts (the tests drive a block editor; the cell path is the same function, flushOpenEditors, and CR 025: a host flush request saves the typed text of an open table cell covers the cell branch); real-window scenario scenarioFlushCellAndFrontmatter in test/integration/realInput/flushBeforeNavigate.ts.
- Criteria: The flushed save precedes the navigation message. The anchor-in-page boundary is tested for a block editor only.
