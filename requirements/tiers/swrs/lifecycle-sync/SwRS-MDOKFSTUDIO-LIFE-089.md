---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-089
uuid: cb0060ce-4a5e-4667-9276-0b7f236a523e
title: Equal blocks pair in document order and each kept node is used once
description: When two blocks of a patch have the same HTML, the page SHALL pair
  them with the old equal blocks in document order and use each kept node once.
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

## Equal blocks pair in document order and each kept node is used once

### Normative behavior

When two blocks of a patch have the same HTML, the page SHALL pair them with the old equal blocks in document order and use each kept node once.

### Scenario: Repeated block

- GIVEN three identical paragraphs and a patch that keeps three
- WHEN the page replaces the content
- THEN the first old node pairs with the first new one and so on (unit test test/page/modules/contentMorph.test.ts "PERF-05: equal blocks pair in document order and each kept node is used once")

### Scenario: One more

- GIVEN a patch with four identical paragraphs
- WHEN the page replaces the content
- THEN three nodes are kept and the fourth is new

### Verification notes

- Method: Unit test test/page/modules/contentMorph.test.ts as named.
- Criteria: No old node is used twice.

### Archived

Folded into SwRS-MDOKFSTUDIO-LIFE-088.
