---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-002
uuid: 32df8136-ff48-4007-a722-4acc44eeacaf
title: A document without a closing fence has no frontmatter
description: When a document starts with a `---` line but has no closing `---`
  or `...` line, the extension SHALL treat the document as having no frontmatter
  and show no properties table.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## A document without a closing fence has no frontmatter

### Normative behavior

When a document starts with a `---` line but has no closing `---` or `...` line, the extension SHALL treat the document as having no frontmatter and show no properties table.

### Scenario: Opening fence without a closing fence

- GIVEN a document with `---`, the lines `title: Open` and `status: draft`, a heading and no closing fence line
- WHEN the preview is rendered
- THEN no properties table is shown

### Scenario: Closing fence added

- GIVEN the same document after a closing `---` line is inserted after the two fields
- WHEN the preview refreshes
- THEN the table appears with the fields title and status

### Verification notes

- Method: Unit test of the fence matcher.
- Criteria: No closing fence gives present = false and no table; adding it gives the table.
