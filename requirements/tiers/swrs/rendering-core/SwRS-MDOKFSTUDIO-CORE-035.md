---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-035
uuid: 3716023b-2381-4c24-82d1-7c47286f955e
title: Scroll wide tables inside their box
description: When a table is wider than the content column, the extension SHALL
  scroll it inside its own box without widening the page.
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

## Scroll wide tables inside their box

### Normative behavior

When a table is wider than the content column, the extension SHALL scroll it inside its own box without widening the page.

### Scenario: Nominal scroll wide tables inside their box

- GIVEN a table wider than the column
- WHEN it is shown
- THEN the table scrolls sideways in its box and the page does not

### Scenario: Boundary or refusal of scroll wide tables inside their box

- GIVEN a table that fits
- WHEN it is shown
- THEN no scroll bar appears

### Verification notes

- Method: test
- Criteria: Page scroll width equals its client width with a wide table.
