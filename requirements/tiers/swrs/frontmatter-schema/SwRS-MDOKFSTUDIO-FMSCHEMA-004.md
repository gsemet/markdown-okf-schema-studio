---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-004
uuid: fedff6f5-b384-4dc1-962c-a74ebc4237a9
title: The propertiesTable setting hides the table and the raw YAML
description: When `markdownOkfSchemaStudio.frontmatter.propertiesTable` is
  false, the extension SHALL show neither the properties table nor the raw
  frontmatter text.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The propertiesTable setting hides the table and the raw YAML

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.propertiesTable` is false, the extension SHALL show neither the properties table nor the raw frontmatter text.

### Scenario: Setting off

- GIVEN a document with frontmatter and the heading `# Title`, with `frontmatter.propertiesTable` set to false
- WHEN the preview is rendered
- THEN no properties table and no frontmatter text appear

### Scenario: Setting at its default

- GIVEN the same document with `frontmatter.propertiesTable` unset (default true, boolean, no other accepted value)
- WHEN the preview is rendered
- THEN the properties table is shown above the heading

### Verification notes

- Method: Unit test of the table renderer with the setting off and on; visual scenario with the setting off.
- Criteria: Default true; the value is a boolean taken as stored; the renderer returns no markup when the setting is off.
- Known issue: the frontmatter is still parsed and validated while the table is off; nothing is shown, so a schema problem cannot be seen.
