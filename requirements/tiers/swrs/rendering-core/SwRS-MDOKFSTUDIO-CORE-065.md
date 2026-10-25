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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-008; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-008
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
