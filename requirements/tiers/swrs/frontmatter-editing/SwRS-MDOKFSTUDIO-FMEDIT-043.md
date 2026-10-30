---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-043
uuid: e0399f98-3d33-4482-a362-4a0c194121f1
title: A frontmatter edit changes only the lines of its field
description: When a writer saves a value, the extension SHALL change only the
  lines of that field and keep comments, quoting style, spacing, fences, body
  and line endings byte-identical, and refuse an edit that would leave a block
  that does not parse or whose keys are not exactly the expected ones.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
- StRS-MDOKFSTUDIO-FMEDIT-008
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterParse.ts
- src/core/frontmatter/frontmatterSerialize.ts
tested_in_files:
- test/core/frontmatter/frontmatterFence.test.ts
- test/core/frontmatter/frontmatterPreservation.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-039
- SwRS-MDOKFSTUDIO-FMEDIT-044
- SwRS-MDOKFSTUDIO-FMEDIT-045
- SwRS-MDOKFSTUDIO-FMEDIT-046
---

## A frontmatter edit changes only the lines of its field

### Normative behavior

When a writer saves a value, the extension SHALL change only the lines of that field and keep comments, quoting style, spacing, fences, body and line endings byte-identical, and refuse an edit that would leave a block that does not parse or whose keys are not exactly the expected ones.

### Scenario (nominal): A value edit changes only its field
- GIVEN a document with a trailing comment on the title line and other fields
- WHEN title is changed from Alpha to Beta
- THEN only the title line changes and its comment is kept

### Scenario (boundary): Line endings, fences and values that look like a fence
| Document | Edit | Outcome |
| --- | --- | --- |
| CRLF endings | a value is changed | only the named field's lines change; the fences, body and line endings stay identical |
| closing fence of three dots | a value is changed | the closing fence is kept and only the edited line changes |
| title: To be continued... and status: draft | status is changed | exactly the status line changes and the block keeps its three keys (a value ending in ... or --- stays inside the block) |

### Scenario (nominal): An added field is one inserted line in the file's line endings
- GIVEN a CRLF document with the fields title and status
- WHEN owner is added after title
- THEN the edit inserts exactly one line ended by CRLF

### Scenario (boundary): An added list uses the compact sequence style
- GIVEN an added list value
- WHEN the field is written
- THEN the list uses the compact sequence style

### Scenario (boundary): Anchored or aliased values rewrite the whole block with the right data
| Block | Edit | Outcome |
| --- | --- | --- |
| a: &x 1 and b: 3 | a is set to 2 | the block parses to a: 2 and b: 3 |
| a value that is edited as an object | saved | the written block parses to the same data |

### Scenario (refusal): An edit that loses or corrupts a key is refused
| Patch checked by the patch guard | Outcome |
| --- | --- |
| deletes the author key | refused, no edit is applied; the host answers "The frontmatter YAML could not be updated." |
| duplicates the status key | refused, no edit is applied; the same answer |
| leaves invalid YAML | refused |
| a faithful patch of the status line | passes unchanged |

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-037: where an added field is inserted.

### Verification notes
- Method: test/core/frontmatter/frontmatterPreservation.test.ts (scenarios: value edit F1-F4 changes only the named field, CRLF endings, structural CRLF add after a field, structural F1 add of a list uses the compact sequence style).
- Method: test/core/frontmatter/frontmatterFence.test.ts (scenarios: fence fixtures for a value ending in three dots, four dots, three dashes and a dot-dot-dot closing fence; patch guard refuses patches that lose, duplicate or corrupt a key).
- Method: test/core/frontmatter/okfFrontmatter.test.ts and test/core/frontmatter/okfFrontmatter.test.ts (scenarios: value patch rewrites only the edited field line, value patch for an anchored value still writes correct data, a nested map written as an object yields the same data).
- Criteria: every edit is compared with the original text, so any byte outside the lines of the edited field must be identical, except for the whole-block rewrite of an anchored or aliased value, which must keep the data.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-039](SwRS-MDOKFSTUDIO-FMEDIT-039.md): An added field is a single inserted line in the file's line endings
  - [SwRS-MDOKFSTUDIO-FMEDIT-044](SwRS-MDOKFSTUDIO-FMEDIT-044.md): Anchored or aliased values fall back to a whole-block rewrite
  - [SwRS-MDOKFSTUDIO-FMEDIT-045](SwRS-MDOKFSTUDIO-FMEDIT-045.md): A frontmatter edit that loses or corrupts a key is refused
  - [SwRS-MDOKFSTUDIO-FMEDIT-046](SwRS-MDOKFSTUDIO-FMEDIT-046.md): Values ending in three dots or dashes stay inside the block
<!-- okf:links:end -->
