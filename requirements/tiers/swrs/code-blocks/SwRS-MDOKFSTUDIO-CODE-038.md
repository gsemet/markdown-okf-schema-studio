---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-038
uuid: 7e5e23b3-077a-43f3-8f08-f39ad37dde73
title: Colour YAML code text with the link colour in the forced white and cream
  themes
description: When the white or cream theme is forced, the extension SHALL colour
  YAML code text with the link colour.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-028
default_owner_email: gaetan@xeberon.net
---

## Colour YAML code text with the link colour in the forced white and cream themes

### Normative behavior

When the white or cream theme is forced, the extension SHALL colour YAML code text with the link colour.

### Scenario: nominal behavior

- GIVEN the cream theme is forced and a YAML block is shown
- WHEN the preview renders it
- THEN its text uses the link colour

### Scenario: boundary or refusal behavior

- GIVEN the white theme is forced and a Python block is shown
- WHEN the preview renders it
- THEN the Python text does not use the link colour

### Verification notes

- Method: Stylesheet unit test.
- Criteria: The YAML language rule sets the link colour in white and cream only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-028](../rendering-core/SwRS-MDOKFSTUDIO-CORE-028.md): Body text, headings, lists and inline code are typeset readably
<!-- okf:links:end -->
