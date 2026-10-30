---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-004
uuid: c3b39bfa-78e2-48b2-b6d1-5f9faef77c71
title: The Description column can be collapsed
description: When a writer collapses the Description column of a properties
  table, the Studio SHALL keep Name and Value readable and remember the choice
  for that document.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I hide the Description column when I need room and find
  it hidden again next time.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## The Description column can be collapsed

### Normative behavior

When a writer collapses the Description column of a properties table, the Studio SHALL keep Name and Value readable and remember the choice for that document.

### Preserved stakeholder intent

Descriptions help while learning a schema but cost width; the writer controls that trade-off per document.

As a writer, I hide the Description column when I need room and find it hidden again next time.

### Rationale and constraints

- A toggle in the column headers collapses and restores the column; error rows re-span the visible columns; the choice survives a refresh and is kept for the 200 most recent documents.
- Without a remembered choice, a preview 640 px wide or less starts collapsed (measured when the page starts).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-001](StRS-MDOKFSTUDIO-FMSCHEMA-001.md): Frontmatter appears as a readable, configurable properties table
<!-- okf:links:end -->
