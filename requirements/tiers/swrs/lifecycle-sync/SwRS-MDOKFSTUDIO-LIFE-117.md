---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-117
uuid: 9a1ef25d-93a1-4ffc-b41a-ee191ef9f3e9
title: The page ignores a source scroll for another render
description: When the page receives a sourceScroll that names another document,
  revision or request than its own, the page SHALL ignore it.
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

## The page ignores a source scroll for another render

### Normative behavior

When the page receives a sourceScroll that names another document, revision or request than its own, the page SHALL ignore it.

### Scenario: Old render

- GIVEN a sourceScroll addressed to the previous request
- WHEN the page receives it
- THEN the anchor and the scroll position are unchanged (unit test test/page/runtimeScroll.test.ts "source scrolling rejects stale identities and invalid line numbers")

### Scenario: Current render

- GIVEN a sourceScroll addressed to the current render
- WHEN the page receives it
- THEN the page follows it

### Verification notes

- Method: Unit test test/page/runtimeScroll.test.ts as named.
- Criteria: The anchor is unchanged by a stale message.

### Archived

Covered by SwRS-MDOKFSTUDIO-TRUST-060 (the page accepts a host message only if it is addressed to the page).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-010](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-010.md): The panes scroll together and the reading position survives updates
<!-- okf:links:end -->
