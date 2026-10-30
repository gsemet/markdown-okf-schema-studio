---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-048
uuid: 6526afe9-d6f9-4c44-910d-91ee0246e468
title: Link values are checked for type and syntax
description: When a field annotated with `x-okf-link` holds a non-string value,
  a wikilink not written `[[target]]` or `[[target|label]]`, or an empty target,
  the extension SHALL mark the field with an E10 error.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-046; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
default_owner_email: gaetan@xeberon.net
---

## Link values are checked for type and syntax

### Normative behavior

When a field annotated with `x-okf-link` holds a non-string value, a wikilink not written `[[target]]` or `[[target|label]]`, or an empty target, the extension SHALL mark the field with an E10 error.

### Scenario: Wikilink syntax

- GIVEN an annotation with syntax wikilink and the value t.md without brackets
- WHEN the document is analysed
- THEN the field carries [E10] wikilink value has invalid syntax at 'ref'

### Scenario: Empty and non-string values

- GIVEN an empty string value and a number value
- WHEN the document is analysed
- THEN the messages read file-link target is empty and file-link value must be a string

### Verification notes

- Method: Unit test of the link inspection (partial: wikilink parsing has no dedicated assertion).
- Criteria: A non-string value also gets the validator's own type error when the schema declares string.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-046](SwRS-MDOKFSTUDIO-FMSCHEMA-046.md): x-okf-link annotations declare link fields and their syntax
<!-- okf:links:end -->
