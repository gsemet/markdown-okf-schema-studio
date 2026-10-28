---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-015
uuid: eac88dc3-ec4d-4b6b-961f-fb1031153ee9
title: The Description choice is remembered per document
description: When a writer collapses or expands the Description column, the
  extension SHALL remember the choice for that document, keep it for the 200
  most recent documents and restore it after a refresh.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-014; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-014
default_owner_email: gaetan@xeberon.net
---

## The Description choice is remembered per document

### Normative behavior

When a writer collapses or expands the Description column, the extension SHALL remember the choice for that document, keep it for the 200 most recent documents and restore it after a refresh.

### Scenario: Remembered choice

- GIVEN a writer collapsed the Description column of a document
- WHEN the preview is refreshed or reopened for that document
- THEN the column is still collapsed

### Scenario: More than 200 documents

- GIVEN choices were stored for 201 documents
- WHEN the oldest document is opened again
- THEN its choice is forgotten and the default applies

### Verification notes

- Method: Unit test of the bounded map and the workspace choices; integration test.
- Criteria: The map holds 200 entries (MAX_DOCUMENT_STATES), most recently used last, persisted under one workspace key.
