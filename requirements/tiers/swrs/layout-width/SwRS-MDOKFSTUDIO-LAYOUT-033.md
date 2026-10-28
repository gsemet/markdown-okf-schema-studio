---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-033
uuid: f49147a1-6c54-46ff-8ad3-1386548dfaeb
title: A scrolling table shades its overflowing edges
description: When a table is more than 1 px wider than its box, the extension
  SHALL mark it as overflowing so that the theme shades its edges, and remove
  the mark when the table fits.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-032; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-032
default_owner_email: gaetan@xeberon.net
---

## A scrolling table shades its overflowing edges

### Normative behavior

When a table is more than 1 px wider than its box, the extension SHALL mark it as overflowing so that the theme shades its edges, and remove the mark when the table fits.

### Scenario: Real overflow

- GIVEN a table with a scroll width of 900 and a client width of 400 (not a properties table)
- WHEN the layout is stabilised
- THEN the table carries data-sphinx-table-overflow=true

### Scenario: One pixel and fitting tables

- GIVEN scroll width 401 against client width 400, then 402, then 400 again, and a properties table with an overflow
- WHEN the layout is stabilised each time
- THEN 401 is not an overflow, 402 sets the mark, 400 removes it, the properties table is never marked, and a second pass writes no attribute

### Verification notes

- Method: Unit tests markWideTables marks short cells and the overflow of a wide table, never the properties table, and markWideTables sets the overflow attribute only past a one pixel tolerance and is idempotent; CSS test for the shadows.
- Criteria: The attribute is true only when scroll width exceeds client width by more than 1 px.
