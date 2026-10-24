---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-035
uuid: 2c60c1b1-0a30-4cf7-8fe8-4d1be0e47301
title: The page revalidates span colours before applying
description: When the page applies kept span colours, the extension SHALL set
  them through the CSSOM after revalidating each value with the colour grammar,
  only under the preview content.
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

## The page revalidates span colours before applying

### Normative behavior

When the page applies kept span colours, the extension SHALL set them through the CSSOM after revalidating each value with the colour grammar, only under the preview content.

### Scenario: Valid attributes applied

- GIVEN a span with data-okf-color '#f00'
- WHEN colours are applied
- THEN the element style color is set

### Scenario: Hand-edited invalid attribute

- GIVEN a span with data-okf-color 'url(x)'
- WHEN colours are applied
- THEN no style is set

### Verification notes

- Method: Page unit test.
- Criteria: Only grammar-valid values reach styles.
