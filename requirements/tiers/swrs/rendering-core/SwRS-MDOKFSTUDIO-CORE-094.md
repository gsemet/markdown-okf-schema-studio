---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-094
uuid: cdffbd20-09f3-46bb-a7ec-6d566df261ec
title: The release adds the commit of each changelog line
description: The release script SHALL add to each line of the Unreleased section
  of CHANGELOG.md the short SHA-1 of the commit on the base that added it, as
  the first item of the line's reference group, and SHALL write nothing when a
  line's commit is not on the base or the file has uncommitted changes.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-007
scenarios:
- id: S1
  title: A line with a reference group and a line without
- id: S2
  title: Lines the script leaves alone or refuses
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- scripts/changelog_refs.py
tested_in_files:
- test/build/test_changelog_refs.py
default_owner_email: gaetan@xeberon.net
---

## The release adds the commit of each changelog line

### Normative behavior

The release script SHALL add to each line of the Unreleased section of CHANGELOG.md the short SHA-1 of the commit on the base that added it, as the first item of the line's reference group, and SHALL write nothing when a line's commit is not on the base or the file has uncommitted changes.

### Scenario S1 (nominal): A line with a reference group and a line without

- GIVEN `## Unreleased` holds one line ending with `(CR-463 change-bar-tooltip, PR #476, issue #413)` and one line with no group, each added by a commit that is on the base
- WHEN `just changelog-refs` runs
- THEN the first line's group starts with `commit <short SHA-1 of the commit that added the line>, ` and the second line ends with ` (commit <short SHA-1>)`, written with LF line endings, and the sections of released versions are unchanged

### Scenario S2 (boundary): Lines the script leaves alone or refuses

| Input | Outcome |
| --- | --- |
| a line whose group already starts with `commit ` | left as it is; a second run changes nothing |
| a line of three physical lines, its last line edited by a later commit | the SHA-1 is the commit of its first line, written at the end of its last line |
| a line whose commit is not on the base | exit 1 naming the line and the commit, and nothing is written |
| a line whose commit is not on the base, with `--skip-missing` | the line is left unchanged and listed as skipped, the other lines get their commit, exit 0 |
| `CHANGELOG.md` has uncommitted changes | exit 1 and the file is unchanged |
| `## Unreleased` is empty | "No line to update", exit 0, the file is unchanged |

### Verification notes

- Method: test/build/test_changelog_refs.py runs scripts/changelog_refs.py with `git` in temporary repositories whose commits the test makes.
- Criteria: the written file, the exit code and the output match the tables above.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-007](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-007.md): A maintainer ships a version only after green checks and reviewed release notes
<!-- okf:links:end -->
