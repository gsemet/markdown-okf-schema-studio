---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-010
uuid: c2eb031b-4ed4-4394-90e5-4315a334cd0a
title: The properties table has a lean frame
description: When the properties table is displayed, the extension SHALL draw it
  without an outer border and with transparent section, table and cells, apart
  from translucent grey header cells, the red background of an error row and a
  title without background.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-006
default_owner_email: gaetan@xeberon.net
---

## The properties table has a lean frame

### Normative behavior

When the properties table is displayed, the extension SHALL draw it without an outer border and with transparent section, table and cells, apart from translucent grey header cells, the red background of an error row and a title without background.

### Scenario: Table frame

- GIVEN a document with frontmatter in a dark, a white and a cream theme
- WHEN the preview is rendered
- THEN the section and table have no border and no background, the cells are transparent and the title Frontmatter properties has no background

### Scenario: Header cells

- GIVEN the same table
- WHEN the header row is inspected
- THEN the header cells show the translucent grey background and the data cells do not

### Scenario: Contrast

- GIVEN the same table in a dark, a white and a cream theme
- WHEN the title badge, the description text and the value text are inspected
- THEN the title badge reaches 2.5:1 contrast, the description text 2.2:1 and is smaller than the value text, and the value text reaches 4:1

### Verification notes

- Method: Visual scenarios v01 and v05 and their style checks.
- Criteria: Computed styles of [data-okf-properties] and its cells match the lean frame in every theme.
- Criteria: The contrast thresholds (title badge 2.5:1, description text 2.2:1, value text 4:1) are those checked by the visual scenarios in `capture.py`.
