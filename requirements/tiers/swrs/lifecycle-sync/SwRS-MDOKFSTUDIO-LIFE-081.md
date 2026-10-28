---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-081
uuid: 9b4ee773-68a4-49f9-8a67-ca63790e694c
title: After a patch the page answers only to the new identifiers
description: When a content patch has moved the page to the next render, the
  page SHALL refuse host messages that name the previous render.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## After a patch the page answers only to the new identifiers

### Normative behavior

When a content patch has moved the page to the next render, the page SHALL refuse host messages that name the previous render.

### Scenario: Old identifiers

- GIVEN a page that applied a patch to request 2
- WHEN a host message naming request 1 arrives
- THEN the page ignores it (unit tests test/page/runtimeContentPatch.test.ts "T34: after a patch the page answers to the new identifiers only" and test/page/pageMessages.test.ts "a content patch moves the page to the next identity: the previous one is refused afterwards")

### Scenario: New identifiers

- GIVEN a host message naming request 2
- WHEN it arrives
- THEN the page handles it

### Verification notes

- Method: Unit tests as named.
- Criteria: The page's context.requestId equals the patch's next request.

### Archived

Covered by SwRS-MDOKFSTUDIO-TRUST-060 (after a patch the page's render identity is the next render's).
