---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-137
uuid: 5042acd9-f85e-40e0-b89a-69327e806984
title: A saved state keeps a focused block id of at most 200 characters, a
  selection of at most 4096 and a boolean Description state
description: When the extension reads a saved panel state, it SHALL keep the
  focused block id up to 200 characters, the selected text up to 4096 characters
  and descriptionsCollapsed only as a boolean, and drop any other value.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A saved state keeps a focused block id of at most 200 characters, a selection of at most 4096 and a boolean Description state

### Normative behavior

When the extension reads a saved panel state, it SHALL keep the focused block id up to 200 characters, the selected text up to 4096 characters and descriptionsCollapsed only as a boolean, and drop any other value.

### Scenario: Within bounds

- GIVEN a 200 character block id, a 4096 character selection and descriptionsCollapsed true
- WHEN it is parsed
- THEN all three are kept (unit test test/core/state/previewState.test.ts "parses bounded preview panel state and preserves supported fields")

### Scenario: Out of bounds

- GIVEN a 201 character block id, a 4097 character selection and descriptionsCollapsed set to the string yes
- WHEN it is parsed
- THEN all three are dropped (unit test test/core/state/previewState.test.ts "rejects invalid identity and drops malformed optional state")

### Verification notes

- Method: Unit tests test/core/state/previewState.test.ts as named.
- Criteria: Each field is present only inside its bound.

### Archived

Folded into SwRS-MDOKFSTUDIO-LIFE-135.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-014](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-014.md): Previews come back after a reload, remember recent documents and leave nothing behind
<!-- okf:links:end -->
