---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-065
uuid: afba5a86-5047-4e6f-94c2-16213145f482
title: Place inline images on the text line
description: When an image is written inside a line of text, the extension SHALL
  render it inline and centred on the line, while an image alone in its
  paragraph stays a centred figure paragraph.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-008; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-008
default_owner_email: gaetan@xeberon.net
---

## Place inline images on the text line

### Normative behavior

When an image is written inside a line of text, the extension SHALL render it inline and centred on the line, while an image alone in its paragraph stays a centred figure paragraph.

### Scenario: Nominal place inline images on the text line

- GIVEN an image in a sentence
- WHEN it is rendered
- THEN it sits on the text line

### Scenario: Boundary or refusal of place inline images on the text line

- GIVEN an image alone in a paragraph
- WHEN it is rendered
- THEN it is a centred figure paragraph

### Verification notes

- Method: Visual scenario rendering-core/v23-inline-image-in-text-light-900 in test/visual/scenarioDefinitions2.ts
- Criteria: Both placements load, also in edit mode.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-008](SwRS-MDOKFSTUDIO-CORE-008.md): Images fit the column, sit on the line and survive a missing file
<!-- okf:links:end -->
