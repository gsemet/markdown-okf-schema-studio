---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-048
uuid: ea256d16-10b8-4e44-8600-d909de1f3fdd
title: The rename field shows progress and refusals
description: When the host works on a rename, the extension SHALL disable the
  field with Renaming..., match the answer by edit id and leave it editable
  after a refusal showing its reason.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-038
default_owner_email: gaetan@xeberon.net
---

## The rename field shows progress and refusals

### Normative behavior

When the host works on a rename, the extension SHALL disable the field with Renaming..., match the answer by edit id and leave it editable after a refusal showing its reason.

### Scenario: Nominal

- GIVEN a posted rename
- WHEN the host has not answered
- THEN the field is disabled and reads Renaming...

### Scenario: Boundary or refusal

- GIVEN an answer with another edit id, or a refusal with a reason
- WHEN the answer arrives
- THEN the foreign answer is ignored and the refusal reason is shown with the field editable

### Verification notes

- Method: Unit test "the result shows how many {ref} uses of the old name remain" in test/page/modules/labelRename.test.ts
- Criteria: Matching is by edit id.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-038](SwRS-MDOKFSTUDIO-MYST-038.md): The anchor icon opens a rename field that sends valid names
<!-- okf:links:end -->
