---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-075
uuid: 61e7a61d-da93-4827-b352-781c28a38f9d
title: The body still renders when the table is off
description: When `markdownOkfSchemaStudio.frontmatter.propertiesTable` is
  false, the extension SHALL still render the body of the document.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-004; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-004
default_owner_email: gaetan@xeberon.net
---

## The body still renders when the table is off

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.propertiesTable` is false, the extension SHALL still render the body of the document.

### Scenario: Setting off

- GIVEN a document with frontmatter and the heading `# Title`, with the setting false
- WHEN the preview is rendered
- THEN the heading Title is rendered at the top of the preview

### Scenario: Document without frontmatter

- GIVEN a document without frontmatter and the setting false
- WHEN the preview is rendered
- THEN the body is rendered as with the setting on

### Verification notes

- Method: Unit test of the table renderer with the setting off; visual scenario with the setting off.
- Criteria: The renderer returns no markup when the setting is off and does not touch the body.
- Known issue: the frontmatter is still parsed and validated while the table is off; nothing is shown, so a schema problem cannot be seen.
