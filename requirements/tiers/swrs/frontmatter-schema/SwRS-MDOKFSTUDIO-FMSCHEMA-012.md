---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-012
uuid: ba219da9-3512-498f-a84a-30778787409d
title: Every table value is HTML-escaped
description: When the properties table is built, the extension SHALL escape
  every name, value, tooltip and data attribute as text, so that frontmatter
  cannot inject markup into the page.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-005
---

## Every table value is HTML-escaped

### Normative behavior

When the properties table is built, the extension SHALL escape every name, value, tooltip and data attribute as text, so that frontmatter cannot inject markup into the page.

### Scenario: Markup in a value

- GIVEN a field whose value is a bold tag, an ampersand and double quotes written as a YAML string
- WHEN the properties table is rendered
- THEN the Value cell shows the characters literally (escaped as lt, amp and quot entities) and no bold element is created

### Scenario: Markup in a name

- GIVEN a field whose name contains an angle bracket
- WHEN the properties table is rendered
- THEN the name appears as text in the Name cell and in the row attributes, never as an element

### Verification notes

- Method: Unit test of the table renderer with hostile values.
- Criteria: Output contains &lt;, &gt;, &amp; and &quot; in place of the raw characters.
