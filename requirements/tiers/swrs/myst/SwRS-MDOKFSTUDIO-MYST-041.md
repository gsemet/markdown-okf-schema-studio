---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-041
uuid: 5619e278-3fe6-4963-a331-c815cf96d9fe
title: Invalid label names are not sent
description: 'When the new label name is empty, longer than 100 characters or uses
  characters other than letters, digits and _ . : -, the extension SHALL not send
  it and show Use letters, digits and _ . : - only (100 characters at most).'
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

## Invalid label names are not sent

### Normative behavior

When the new label name is empty, longer than 100 characters or uses characters other than letters, digits and _ . : -, the extension SHALL not send it and show Use letters, digits and _ . : - only (100 characters at most).

### Scenario: Nominal

- GIVEN the name `-bad`
- WHEN Enter is pressed
- THEN the message is shown and nothing is posted

### Scenario: Boundary or refusal

- GIVEN an empty name or a 101-character name
- WHEN Enter is pressed
- THEN the same message is shown; the host and message validator repeat the check

### Verification notes

- Method: Unit test "an invalid or unchanged name is not sent" in test/page/modules/labelRename.test.ts; Unit test "label names follow the MyST pattern and the length limit" in test/core/mapping/labelRename.test.ts; Unit test "previewLabelRename validates the line and both label names" in test/core/protocol/pageToHost.test.ts
- Criteria: Both page and host reject.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-038](SwRS-MDOKFSTUDIO-MYST-038.md): The anchor icon opens a rename field that sends valid names
<!-- okf:links:end -->
