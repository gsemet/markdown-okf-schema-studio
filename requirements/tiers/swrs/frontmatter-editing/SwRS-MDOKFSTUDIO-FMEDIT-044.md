---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-044
uuid: 43f6e57c-f7ec-40b3-b8f9-37c1e841d93b
title: Anchored or aliased values fall back to a whole-block rewrite
description: When the edited value carries a YAML anchor or alias, the extension
  SHALL fall back to rewriting the whole block while still writing the right
  data.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-043; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-043
default_owner_email: gaetan@xeberon.net
---

## Anchored or aliased values fall back to a whole-block rewrite

### Normative behavior

When the edited value carries a YAML anchor or alias, the extension SHALL fall back to rewriting the whole block while still writing the right data.

### Scenario: Nominal

- GIVEN a block a: &x 1 and b: 3
- WHEN a is set to 2
- THEN the block parses to a: 2 and b: 3

### Scenario: Boundary or refusal

- GIVEN a value that is edited as an object
- WHEN it is saved
- THEN the written block parses to the same data

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/okfFrontmatter.test.ts).
- Criteria: Tests value patch for an anchored value still writes correct data; a nested map written as an object yields the same data.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-043](SwRS-MDOKFSTUDIO-FMEDIT-043.md): A frontmatter edit changes only the lines of its field
<!-- okf:links:end -->
