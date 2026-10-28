---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-200
uuid: 55b4d8af-770e-4d28-90fa-8786d82d2bb6
title: The line diff reports added and modified lines
description: When the extension compares a base text with the current text, it
  SHALL report the added and modified lines of the current text as 1-based
  ranges, merging adjacent lines and keeping separate edits as separate ranges,
  report no range for a difference of line endings, of a missing final newline
  or of deleted lines only, and report the whole differing middle as one range
  when more than 20 000 lines differ or more than 2000 edits are needed.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/lineDiff.ts
tested_in_files:
- test/core/mapping/lineDiff.test.ts
default_owner_email: gaetan@xeberon.net
---

## The line diff reports added and modified lines

### Normative behavior

When the extension compares a base text with the current text, it SHALL report the added and modified lines of the current text as 1-based ranges, merging adjacent lines and keeping separate edits as separate ranges, report no range for a difference of line endings, of a missing final newline or of deleted lines only, and report the whole differing middle as one range when more than 20 000 lines differ or more than 2000 edits are needed.

### Scenario (nominal): Added, modified and separate edits

| Input | Outcome |
| --- | --- |
| A base and a current text with two lines added | the added lines are reported in the line numbers of the current text |
| One modified line | one range |
| Two separate edits | two ranges |
| Identical texts | no range |

### Scenario (boundary): Differences that do not count

| Input | Outcome |
| --- | --- |
| A base with LF and a current text with CRLF | no range is reported |
| A base without a final newline against one with it | no range is reported |
| A current text with lines removed and nothing added | no range is reported |

### Scenario (boundary): Size limits

| Input | Outcome |
| --- | --- |
| A middle part of more than 20 000 lines (above the line cap) | one range covers the whole middle |
| More than 2000 edits (above the edit budget) | one range covers the whole middle |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-195: the host that posts the ranges to the page.

### Verification notes

- Method: test/core/mapping/lineDiff.test.ts (unit tests `T16: identical text has no changed range`, `T16: added lines are reported in current line numbers`, `T16: a modified line is one range and two separate edits are two ranges`: scenario added, modified and separate edits; `T16: line endings do not count as changes`, `T16: a base without a trailing newline matches one with it`, `T16: deleted-only lines give no range`: scenario differences that do not count; `T16: above the size cap the whole middle counts as changed`, `T16: many differences beyond the edit budget fall back to the whole middle`: scenario size limits).
- Criteria: The ranges equal the expected start and end lines; the result is an empty list in each no-range case; MAX_DIFF_LINES = 20000 and MAX_DIFF_EDITS = 2000 switch to one range.
