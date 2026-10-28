---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-091
uuid: ce501f5e-e007-4e95-9579-254ca5a6d6e4
title: A block with a link has the same key on the first page and after a patch
description: When a block holds a link, the page SHALL give it the same key on
  the first load and after a patch, including a link title that the host wrote
  itself.
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

## A block with a link has the same key on the first page and after a patch

### Normative behavior

When a block holds a link, the page SHALL give it the same key on the first load and after a patch, including a link title that the host wrote itself.

### Scenario: Link block

- GIVEN a paragraph with a link, on the first page and in a patch
- WHEN the keys are computed
- THEN they are equal (unit test test/page/modules/contentMorph.test.ts "PERF-05: the first page and a patch give a block with a link the same key")

### Scenario: Host title

- GIVEN a link title that the host wrote
- WHEN the key is computed
- THEN the title stays part of the key (unit test test/page/modules/contentMorph.test.ts "PERF-05: a link title the host wrote itself stays part of the key")

### Verification notes

- Method: Unit tests test/page/modules/contentMorph.test.ts as named.
- Criteria: The keys of the two renders of the same link block are equal.

### Archived

Folded into SwRS-MDOKFSTUDIO-LIFE-088.
