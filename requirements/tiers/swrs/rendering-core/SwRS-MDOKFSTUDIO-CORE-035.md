---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-035
uuid: 3716023b-2381-4c24-82d1-7c47286f955e
title: Scroll wide tables inside their box
description: When a table is wider than the content column, the extension SHALL
  scroll it inside its own box without widening the page.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-032; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-032
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "overflowing content tables keep short cells whole and show scroll shadows" in test/core/preview/previewStyles.test.ts
- Criteria: Page scroll width equals its client width with a wide table.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-LAYOUT-032](../layout-width/SwRS-MDOKFSTUDIO-LAYOUT-032.md): A wide table scrolls inside its own box with shaded edges
<!-- okf:links:end -->
