---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-136
uuid: b52d98d3-2240-40fc-ab3f-f1a2a68c2243
title: A saved state keeps at most 100 open-section indexes between 0 and 9999
description: When the extension reads a saved panel state, it SHALL keep at most
  100 open-section indexes, each an integer from 0 to 9999, and drop the others.
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

## A saved state keeps at most 100 open-section indexes between 0 and 9999

### Normative behavior

When the extension reads a saved panel state, it SHALL keep at most 100 open-section indexes, each an integer from 0 to 9999, and drop the others.

### Scenario: Within bounds

- GIVEN a state with open sections 0, 3 and 9999
- WHEN it is parsed
- THEN the three indexes are kept (unit test test/core/state/previewState.test.ts "parses bounded preview panel state and preserves supported fields")

### Scenario: Out of bounds

- GIVEN a state with 101 valid indexes and an index of 10000 or -1
- WHEN it is parsed
- THEN the first 100 valid indexes are kept and the invalid ones are dropped (unit test test/core/state/previewState.test.ts "rejects invalid identity and drops malformed optional state")

### Verification notes

- Method: Unit tests test/core/state/previewState.test.ts as named.
- Criteria: openDisclosures has at most 100 entries, each valid.

### Archived

Folded into SwRS-MDOKFSTUDIO-LIFE-135.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-014](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-014.md): Previews come back after a reload, remember recent documents and leave nothing behind
<!-- okf:links:end -->
