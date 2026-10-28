---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-076
uuid: c8824265-9970-41a5-806f-ff216dbf575a
title: Invalid YAML does not stop the body from rendering
description: When the frontmatter block is not valid YAML, the extension SHALL
  still render the Markdown body below the properties table.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## Invalid YAML does not stop the body from rendering

### Normative behavior

When the frontmatter block is not valid YAML, the extension SHALL still render the Markdown body below the properties table.

### Scenario: Broken YAML

- GIVEN a document whose frontmatter is the single line `k: [a` followed by a heading
- WHEN the preview is rendered
- THEN the heading is rendered below the error row

### Scenario: Table off

- GIVEN the same document with `frontmatter.propertiesTable` false
- WHEN the preview is rendered
- THEN no error row appears and the heading is rendered

### Verification notes

- Method: Visual scenario.
- Criteria: The frontmatter block is left out of the body whether or not it parses.
