---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-074
uuid: 33830894-de7d-495c-b163-8591a8ece9ed
title: An unusable frontmatter link is not followed
description: 'When a writer activates a frontmatter link that is invalid, unavailable
  or outside the allowed folders, the extension SHALL not follow it.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-073; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-073
default_owner_email: gaetan@xeberon.net
---

## An unusable frontmatter link is not followed

### Normative behavior

When a writer activates a frontmatter link that is invalid, unavailable or outside the allowed folders, the extension SHALL not follow it.

### Scenario: Broken link

- GIVEN a link whose target does not exist, activated through its navigation request
- WHEN the request is handled
- THEN no editor is opened and the history is unchanged

### Scenario: Outside link

- GIVEN a document-relative link outside the workspace with the setting false
- WHEN the request is handled
- THEN no editor is opened

### Verification notes

- Method: Integration test.
- Criteria: The refusal opens nothing: no editor is opened and the history is unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-073](SwRS-MDOKFSTUDIO-FMSCHEMA-073.md): A resolving frontmatter link opens its target, others are refused with a warning
<!-- okf:links:end -->
