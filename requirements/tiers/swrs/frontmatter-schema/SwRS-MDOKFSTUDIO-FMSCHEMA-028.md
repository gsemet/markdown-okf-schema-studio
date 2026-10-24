---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-028
uuid: 22b0f425-35a0-471b-b312-bb70e7f99368
title: Editing a schema does not refresh open previews by itself
description: When a schema file is edited while a preview is open, the extension
  SHALL leave the table as it is until the next document change, refresh,
  re-render or settings change.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Editing a schema does not refresh open previews by itself

### Normative behavior

When a schema file is edited while a preview is open, the extension SHALL leave the table as it is until the next document change, refresh, re-render or settings change.

### Scenario: Schema edited

- GIVEN a preview open on a typed document and its schema edited and saved
- WHEN nothing else happens
- THEN the table still shows the previous validation result

### Scenario: Document edited afterwards

- GIVEN the same preview after any edit of the document
- WHEN the frontmatter is re-analysed
- THEN the table reflects the edited schema

### Verification notes

- Method: Not covered by a test today (follows from the absence of a watcher on schema folders).
- Criteria: No watcher observes `_schema` folders; only linked targets and Markdown stems are watched.
- Known issue: a schema author must touch the document or refresh the preview to see the effect of a schema edit.
