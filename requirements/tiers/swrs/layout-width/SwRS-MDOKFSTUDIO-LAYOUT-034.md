---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-034
uuid: db94c0a3-8516-4cf5-852d-9aebfe54e040
title: Short identifiers stay on one line in a scrolling table
description: When a table overflows, the extension SHALL keep a cell holding a
  single word of at most 24 characters on one line.
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

## Short identifiers stay on one line in a scrolling table

### Normative behavior

When a table overflows, the extension SHALL keep a cell holding a single word of at most 24 characters on one line.

### Scenario: Short identifier

- GIVEN an overflowing table with the cells nw-02, North, North Pole and a 25-character word
- WHEN the layout is stabilised
- THEN nw-02 and North are marked data-sphinx-short-cell and set to nowrap; North Pole (two words) and the 25-character word are not

### Scenario: Not overflowing or properties table

- GIVEN a table that fits, and a properties table
- WHEN the layout is stabilised
- THEN the nowrap rule applies only to a table marked as overflowing, and no cell of a properties table is marked

### Known issues

- Known issue: A cell mark, once set, is never removed when the cell text changes (the code returns early for a marked cell).
- Known issue: The short-cell mark is written on every short cell of every table that is not a properties table, whether or not the table overflows; only the nowrap effect depends on data-sphinx-table-overflow.

### Verification notes

- Method: Unit test markWideTables marks short cells and the overflow of a wide table, never the properties table, and the CSS test for the nowrap rule.
- Criteria: A cell matches only when its trimmed text is one to 24 non-space characters.
