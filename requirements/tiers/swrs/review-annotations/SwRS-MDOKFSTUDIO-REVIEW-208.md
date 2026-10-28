---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-208
uuid: 1d8fdebd-2908-4f45-a953-3f625e4c26bb
title: Malformed incoming-change ranges are ignored
description: When a range received by the page is not a pair of integers with 1
  <= start <= end, the extension SHALL ignore it.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/incomingChanges.ts
tested_in_files:
- test/page/modules/incomingChanges.test.ts
default_owner_email: gaetan@xeberon.net
---

## Malformed incoming-change ranges are ignored

### Normative behavior

When a range received by the page is not a pair of integers with 1 <= start <= end, the extension SHALL ignore it.

### Scenario (nominal): Valid ranges

- GIVEN a previewIncomingChanges message whose ranges are pairs of integers with 1 <= start <= end
- WHEN it is received
- THEN the blocks that meet them are marked and the enabled value is reported

### Scenario (refusal): Bad ranges

- GIVEN ranges with a zero, a negative number, a fraction or an end before the start
- WHEN they are received
- THEN no block is marked from them

### Scenario (refusal): Not a list

- GIVEN a previewIncomingChanges message whose ranges are not a list
- WHEN it is received
- THEN all marks are cleared

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-207: how the page marks blocks from valid ranges.

### Verification notes

- Method: test/page/modules/incomingChanges.test.ts (unit test `T16: malformed ranges are ignored and enabled is reported`: scenarios valid ranges, bad ranges, not a list).
- Criteria: Only valid ranges produce marks.
