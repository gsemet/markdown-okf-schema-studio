---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-039
uuid: 0c4fd34c-6d41-4e25-a535-243ccb926a42
title: Full width centres the content with gutters of at least 15 px
description: When the width mode is Full width, the extension SHALL centre text,
  tables, code blocks and figures on the pane with gutters of at least 15 px.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-022
default_owner_email: gaetan@xeberon.net
---

## Full width centres the content with gutters of at least 15 px

### Normative behavior

When the width mode is Full width, the extension SHALL centre text, tables, code blocks and figures on the pane with gutters of at least 15 px.

### Scenario: Light pane at 460 px

- GIVEN Full width mode, the light theme and a 460 px pane (visual scenario v80)
- WHEN the preview is rendered
- THEN the table, code block and figure are centred with at least 15 px gutters and the text has 16 px (within 2 px) side margins

### Scenario: Dark pane at 900 px

- GIVEN Full width mode, the dark theme and a 900 px pane (visual scenario v83)
- WHEN the preview is rendered
- THEN the same centring and gutters hold, and the page does not scroll horizontally

### Verification notes

- Method: Visual scenarios v80 and v83 (and the Full width halves of v66 to v71).
- Criteria: Gutters of at least 15 px and side margins of 16 px within 2 px.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
- Superseded by:
  - [SwRS-MDOKFSTUDIO-LAYOUT-022](SwRS-MDOKFSTUDIO-LAYOUT-022.md): Margin keeps blocks in the column and Full removes the limit
<!-- okf:links:end -->
