---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-044
uuid: 38c04766-643b-4f78-ab81-783df65787d8
title: A new table waits while a field editor is open
description: When a refreshed properties table arrives while a frontmatter field
  editor is open, the extension SHALL keep the new markup aside and apply it
  after the editor closes.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-043; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-043
default_owner_email: gaetan@xeberon.net
---

## A new table waits while a field editor is open

### Normative behavior

When a refreshed properties table arrives while a frontmatter field editor is open, the extension SHALL keep the new markup aside and apply it after the editor closes.

### Scenario: Editor open

- GIVEN a frontmatter field editor open on the page
- WHEN the host posts a new properties table
- THEN the page keeps the current table and remembers the markup and its sequence number

### Scenario: Editor closed

- GIVEN the writer saves or cancels the editor
- WHEN the editor closes
- THEN the remembered markup replaces the table

### Verification notes

- Method: Unit test of the page host handlers.
- Criteria: Only the latest deferred markup is kept.
