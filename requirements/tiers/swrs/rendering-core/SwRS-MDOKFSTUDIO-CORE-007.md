---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-007
uuid: 019d5b31-a519-4ca9-a9f1-8763767e5bed
title: Map image-only blocks
description: When a paragraph holds only an image, an `{image}` directive or a
  lone raw `<img>` element, the extension SHALL render it as a mapped block with
  its source lines.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Map image-only blocks

### Normative behavior

When a paragraph holds only an image, an `{image}` directive or a lone raw `<img>` element, the extension SHALL render it as a mapped block with its source lines.

### Scenario: Nominal map image-only blocks

- GIVEN a paragraph holding only an image
- WHEN it is rendered
- THEN the image block is mapped, so an insert point can follow it

### Scenario: Boundary or refusal of map image-only blocks

- GIVEN a raw `<img>` without a `src` attribute
- WHEN it is rendered
- THEN the element is dropped

### Verification notes

- Method: test
- Criteria: Image-only blocks carry source lines; a raw `<img>` without `src` is not rendered.
