---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-026
uuid: 137fa9c6-6eb2-4ea0-9318-357d81d7ee63
title: A schema that cannot be compiled gives a red row
description: 'When the validator cannot compile a schema, the extension SHALL show
  a red alert row "Schema validation failed to run: {diagnostic}" that spans every
  visible column and counts one error in the badge, while still listing the fields
  in schema order.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-023
default_owner_email: gaetan@xeberon.net
---

## A schema that cannot be compiled gives a red row

### Normative behavior

When the validator cannot compile a schema, the extension SHALL show a red alert row "Schema validation failed to run: {diagnostic}" that spans every visible column and counts one error in the badge, while still listing the fields in schema order.

### Scenario: Invalid type keyword

- GIVEN a schema declaring a property with `type: nonsense`
- WHEN a document of type Note is analysed
- THEN one red alert row reads Schema validation failed to run: schema is invalid: ... and the badge reads 1 error

### Scenario: Narrow preview

- GIVEN the same table in a 460 px preview with the Description column hidden
- WHEN the preview is rendered
- THEN the row spans two columns and no text overflows

### Verification notes

- Method: Unit test of the analysis; visual scenario (dark and light, 900 px and 460 px).
- Criteria: The same error is reported at every analysis; the declared fields keep their schema order and documentation.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-006](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-006.md): A document finds its schema and schema problems are reported
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-023](SwRS-MDOKFSTUDIO-FMSCHEMA-023.md): Schemas in YAML, JSON or JSON5 with relative references compile or report a row
<!-- okf:links:end -->
