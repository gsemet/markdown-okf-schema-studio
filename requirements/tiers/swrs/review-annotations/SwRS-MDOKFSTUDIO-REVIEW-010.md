---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-010
uuid: c7275b27-65fc-49a0-9b5b-abf6c31fd5ab
title: The line diff reports hunks with both sides
description: When the extension compares a base text with the current text for
  the side-by-side diff, it SHALL report each difference as a hunk that gives
  the base lines and the current lines it covers as 1-based inclusive ranges,
  with an empty side (end one before start) for lines only added or only
  removed, merge a hunk of lines only added or only removed with the hunk next
  to it when only blank lines separate them on both sides, ignore differences of
  line endings, and report the whole differing middle as one hunk when more than
  20 000 lines differ or more than 2000 edits are needed.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/lineDiff.ts
tested_in_files:
- test/core/mapping/lineHunks.test.ts
default_owner_email: gaetan@xeberon.net
---

## The line diff reports hunks with both sides

### Normative behavior

When the extension compares a base text with the current text for the side-by-side diff, it SHALL report each difference as a hunk that gives the base lines and the current lines it covers as 1-based inclusive ranges, with an empty side (end one before start) for lines only added or only removed, merge a hunk of lines only added or only removed with the hunk next to it when only blank lines separate them on both sides, ignore differences of line endings, and report the whole differing middle as one hunk when more than 20 000 lines differ or more than 2000 edits are needed.

### Scenario (nominal): Hunks with both sides

| Input | Outcome |
| --- | --- |
| Two identical texts, or texts that differ only by line endings | no hunk |
| One line modified | one hunk with the same line on both sides |
| Lines added | a hunk whose base side is empty (base end one before base start) |
| Lines removed | a hunk whose current side is empty (end one before start) |
| Two separate edits | two hunks |
| Lines removed and added before the next common line | one hunk |
| Lines removed (or added) next to a changed line, only blank lines between them on both sides | one hunk that holds both and the blank lines between them |
| Lines removed (or added) next to a changed line, a heading or any other non-blank line between them | two hunks |
| Two changed lines (both sides not empty), only blank lines between them | two hunks |

### Scenario (boundary): Size limits and block mapping

| Input | Outcome |
| --- | --- |
| More than 20 000 differing lines, or more than 2000 edits | one hunk covers the whole differing middle |
| A block of the current text and the hunks | the block is changed when it meets a hunk with current lines or holds a removal; its base lines are the base side of the hunk it lies in, or its own lines shifted by the hunks before it |
### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-200: the line diff of the green bars, which shares the Myers search.
- SwRS-MDOKFSTUDIO-REVIEW-009: the page that cuts changed blocks with these hunks.

### Verification notes

- Method: test/core/mapping/lineHunks.test.ts (unit tests `CR147: identical texts have no hunk, line endings do not count`, `CR147: a hunk gives the base lines and the current lines`, `CR147: added lines have an empty base side and removed lines an empty current side`, `CR147: separate edits are separate hunks`, `CR147: lines removed and added before the next common line form one hunk`, `CR234: a removal next to a changed line across a blank line is one hunk`, `CR234: a removal is never merged across a heading or a text line`: scenario hunks with both sides; `CR147: above the size caps the whole differing middle is one hunk`, `CR147: a block is changed when it meets added lines or holds a removal`, `CR147: the base lines of a block follow the hunks`: scenario size limits and block mapping).
- Criteria: The hunks equal the expected base and current line ranges; the whole middle is one hunk above MAX_DIFF_LINES = 20000 and MAX_DIFF_EDITS = 2000; the changed test and the base lines of a block match the expected values.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
<!-- okf:links:end -->
