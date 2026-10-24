---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-008
uuid: fae00a2f-255b-46fc-b3da-95c9708eb762
title: Strikethrough renders from double tildes
description: When prose contains ~~text~~, the extension SHALL render the text
  struck through, and SHALL leave a single ~x~ pair and tildes in code literal.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Strikethrough renders from double tildes

### Normative behavior

When prose contains ~~text~~, the extension SHALL render the text struck through, and SHALL leave a single ~x~ pair and tildes in code literal.

### Scenario: Struck text in prose and tables

- GIVEN ~~old~~ in a paragraph, a list item and a table cell
- WHEN the preview is rendered
- THEN each is rendered struck through

### Scenario: Single tildes and code

- GIVEN '~x~' in prose and '~~x~~' in inline code
- WHEN the preview is rendered
- THEN both stay literal text

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Strikethrough elements exist only for double-tilde prose pairs.
