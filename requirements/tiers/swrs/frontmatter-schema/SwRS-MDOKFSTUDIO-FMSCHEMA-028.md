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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: true
exemption_reason: "Absence of code: no watcher observes schema folders. No implementation
  marker is possible."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-027
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test `editing a schema file refreshes nothing by itself; the next document change re-analyses the table` in `test/session/diagReq.settings.requirements.test.ts`.
- Criteria: No watcher observes `_schema` folders; only linked targets and Markdown stems are watched.
- Known issue: a schema author must touch the document or refresh the preview to see the effect of a schema edit.
