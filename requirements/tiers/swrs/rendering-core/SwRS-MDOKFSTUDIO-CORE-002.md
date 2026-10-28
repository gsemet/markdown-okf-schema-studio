---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-002
uuid: 1f54a64e-384b-48c0-9e09-7454e13c2f34
title: Render the CommonMark blocks
description: When a document holds CommonMark content, the extension SHALL
  render headings h1 to h6, paragraphs, bullet and numbered lists, block quotes,
  thematic breaks, emphasis, strong text, links, images and inline code as the
  matching HTML elements.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-001
default_owner_email: gaetan@xeberon.net
---

## Render the CommonMark blocks

### Normative behavior

When a document holds CommonMark content, the extension SHALL render headings h1 to h6, paragraphs, bullet and numbered lists, block quotes, thematic breaks, emphasis, strong text, links, images and inline code as the matching HTML elements.

### Scenario: Nominal render the CommonMark blocks

- GIVEN a document with a heading of each level, a list, a quote, a thematic break, emphasis, a link, an image and inline code
- WHEN it is rendered
- THEN each construct appears as its matching HTML element

### Scenario: Boundary or refusal of render the CommonMark blocks

- GIVEN a document with strikethrough text and an h6 heading
- WHEN it is rendered
- THEN strikethrough text is struck through and the h6 renders as a heading, not as a paragraph

### Verification notes

- Method: Unit test "the in-process renderer preserves the active-file MyST feature contract" in test/core/render/mystFeatures.test.ts
- Criteria: The rendered HTML holds one matching element per CommonMark construct.
