---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-029
uuid: 1ac5f94d-2922-40bc-a8d8-b6621b8b8970
title: Raw details render as collapsible sections
description: When a document contains a raw details element with optional open
  and a plain summary element, in one block or as head, body and closing blocks,
  the extension SHALL render a collapsible section, with the summary Details
  when empty.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Raw details render as collapsible sections

### Normative behavior

When a document contains a raw details element with optional open and a plain summary element, in one block or as head, body and closing blocks, the extension SHALL render a collapsible section, with the summary Details when empty.

### Scenario: Details with summary

- GIVEN a details element with the open attribute and a summary reading More, and a Markdown body
- WHEN the preview is rendered
- THEN a collapsible section is open with title More and the body rendered

### Scenario: Empty summary and unsupported markup

- GIVEN an empty summary element and a summary with markup
- WHEN the preview is rendered
- THEN the empty one reads Details and the marked-up one is not recognised

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Details structure matches the source.
