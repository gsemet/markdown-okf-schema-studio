---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-061
uuid: 37b221f2-429f-4a5f-8086-6c7ac181a231
title: A content patch message is applied only within its bounds
description: When the page receives previewContentPatch, it SHALL accept it only
  if next holds integer revision and requestId, a finite initialAnchor if
  present, an initialPin with finite line and viewportTop if present,
  contentHtml is a string of at most 20 MiB, status is a known one, label is a
  string of at most 500 characters, an optional message is a string of at most
  20 000 characters, and diagnostics are at most 500 entries, each with a
  severity of at most 50 characters, a text of at most 20 000 characters and,
  when present, a code of at most 100 characters.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/page/runtimeContentPatch.test.ts
default_owner_email: gaetan@xeberon.net
---

## A content patch message is applied only within its bounds

### Normative behavior

When the page receives previewContentPatch, it SHALL accept it only if next holds integer revision and requestId, a finite initialAnchor if present, an initialPin with finite line and viewportTop if present, contentHtml is a string of at most 20 MiB, status is a known one, label is a string of at most 500 characters, an optional message is a string of at most 20 000 characters, and diagnostics are at most 500 entries, each with a severity of at most 50 characters, a text of at most 20 000 characters and, when present, a code of at most 100 characters.

### Scenario (nominal): Valid patch

- GIVEN a patch with a small content, status success and two status lines that carry codes
- WHEN it is checked and applied
- THEN it is accepted and each status line keeps its code attribute

### Scenario (refusal): Out of bounds

| Input | Outcome |
| --- | --- |
| 501 diagnostics | refused |
| a content longer than 20 MiB | refused |
| an unknown status | refused |
| a non-finite anchor | refused |
| a diagnostic code of 101 characters | refused |

A refused patch is not applied (see SwRS-MDOKFSTUDIO-TRUST-059).

### Scenario (boundary): Known statuses

| Input | Outcome |
| --- | --- |
| status pending, success, stale, error, missing-source or recovery | accepted as a known status |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-071: a render that cannot patch loads a new page document

### Verification notes

- Method: Unit test test/core/protocol/hostToPage.test.ts (the payload checks refuse what the page used to refuse) covers the out of bounds cases.
- Method: Unit test test/page/runtimeContentPatch.test.ts (CR 050: a patch keeps the code of each status line and refuses a malformed one) covers the valid patch and a malformed one.
- Criteria: Known statuses: pending, success, stale, error, missing-source, recovery.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-009](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-009.md): What the page and the host exchange is checked and never applied to another version
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
<!-- okf:links:end -->
