---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-026
uuid: 8059ccec-6dd8-4d73-b4fc-66c7889d2d66
title: Auto leaves edited and relatively sized elements in the column
description: When an element is under edit, or a figure has a size given in %,
  em or rem, the extension SHALL keep it at the column width in Auto width mode.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-023
---

## Auto leaves edited and relatively sized elements in the column

### Normative behavior

When an element is under edit, or a figure has a size given in %, em or rem, the extension SHALL keep it at the column width in Auto width mode.

### Scenario: Element under edit

- GIVEN a wide table marked data-sphinx-preview-editing in Auto mode
- WHEN the elements are measured
- THEN the table is not marked wide and keeps the column width while its editor is open

### Scenario: Relative figure size

- GIVEN an image whose data-okf-width is 50% (or 20em, or 3rem)
- WHEN the elements are measured
- THEN the image is not marked wide

### Known issues

- Known issue: The relative-size (%, em, rem) exclusion has no test.

### Verification notes

- Method: Unit test T10 the saved width mode applies at startup and an edited element keeps the column; the relative-size path is verified by inspection of widthMode.ts.
- Criteria: Marked elements never include an element under edit or a relative-sized figure.
