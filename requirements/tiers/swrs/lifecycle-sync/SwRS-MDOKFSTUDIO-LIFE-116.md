---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-116
uuid: d372760c-29d6-4342-9ab7-951739fcab49
title: A scroll or reveal report that does not name the current render moves
  nothing
description: When a previewScroll or previewReveal does not name the document,
  the revision and the request of the render the host holds, the extension SHALL
  NOT move the editor.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A scroll or reveal report that does not name the current render moves nothing

### Normative behavior

When a previewScroll or previewReveal does not name the document, the revision and the request of the render the host holds, the extension SHALL NOT move the editor.

### Scenario: Other document

- GIVEN a previewReveal naming file:///outside-workspace.md
- WHEN the host receives it
- THEN no line is revealed (integration test test/integration/lifecycle.test.ts)

### Scenario: Older request

- GIVEN a previewScroll with the previous requestId
- WHEN the host receives it
- THEN no line is revealed (integration test test/integration/sourceMapping.test.ts)

### Verification notes

- Method: Integration tests test/integration/lifecycle.test.ts and test/integration/sourceMapping.test.ts. The envelope belongs to trust-security.
- Criteria: lastRevealedSourceLine is unchanged by a stale message.

### Archived

Covered by SwRS-MDOKFSTUDIO-TRUST-065 and SwRS-MDOKFSTUDIO-TRUST-069 (a page message must name the render the host holds).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-010](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-010.md): The panes scroll together and the reading position survives updates
<!-- okf:links:end -->
