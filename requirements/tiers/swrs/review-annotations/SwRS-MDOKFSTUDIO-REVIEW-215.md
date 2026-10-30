---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-215
uuid: f03ec38c-7472-4537-afcd-938b53ae7925
title: Changed or added front matter fields get their own change bar
description: When the page receives line ranges that meet the lines of a front
  matter field, the extension SHALL mark the properties table row of that field
  with data-sphinx-preview-changed and draw one change bar for that row, like
  the bar of a changed body block, and when a field present at HEAD is missing
  from the shown text and no row is marked, it SHALL mark the whole properties
  table.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
relates_to:
- SwRS-MDOKFSTUDIO-REVIEW-195
- SwRS-MDOKFSTUDIO-REVIEW-207
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterChanges.ts
- src/core/frontmatter/propertiesTable.ts
- src/page/modules/incomingChanges.ts
- src/session/features/incomingChanges.ts
tested_in_files:
- test/core/frontmatter/frontmatterChanges.test.ts
- test/core/frontmatter/propertiesTable.test.ts
- test/page/modules/incomingChanges.test.ts
- test/visual/frontmatterChangeBarScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Changed or added front matter fields get their own change bar

### Normative behavior

When the page receives line ranges that meet the lines of a front matter field, the extension SHALL mark the properties table row of that field with data-sphinx-preview-changed and draw one change bar for that row, like the bar of a changed body block, and when a field present at HEAD is missing from the shown text and no row is marked, it SHALL mark the whole properties table.

### Scenario (nominal): A changed or added field

| Input | Outcome |
| --- | --- |
| A front matter field whose lines differ from HEAD (a changed value) | its row of the properties table is marked and gets one bar with the top and the height of the row |
| A front matter field that is not in HEAD (an added field) | its row is marked and gets one bar, in the same green as a changed body block |
| A field whose value spans several lines (a list or a mapping) | one bar for the whole row, not one per line |
| A field whose lines are unchanged | its row is not marked |
| Both a front matter field and a body block changed | one bar per marked row and one per marked block |

### Scenario (boundary): A removed field

| Input | Outcome |
| --- | --- |
| A field present at HEAD and missing from the shown text | the host adds a range on line 1; when no row is marked, the properties table as a whole is marked and gets one bar |
| A removed field together with a changed or added field | the rows of the changed or added fields are marked and the table, which contains them, is not |
| A body that lost lines but no front matter field | no range is added and the table is not marked |

### Scenario (boundary): Rows that are not marked

| Input | Outcome |
| --- | --- |
| The properties table is switched off, or the document has no front matter | no row exists and nothing is marked |
| A row under an open editor | the row is not marked, as for any block |

### Verification notes

- Method: unit tests on the line ranges of the fields and on the fields added, changed and removed
  between two texts; unit tests on the page marks; visual scenarios in the light and dark themes
  that check the bar of a changed and of an added field row.
- Criteria: every changed or added field row carries one bar with the top and the height of the
  row, and the unchanged rows carry none.

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-207: the bar of a changed block, which a field row reuses.
- SwRS-MDOKFSTUDIO-REVIEW-195: the host that posts the ranges.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
- Relates to:
  - [SwRS-MDOKFSTUDIO-REVIEW-195](SwRS-MDOKFSTUDIO-REVIEW-195.md): The host posts the lines that differ from the last commit
  - [SwRS-MDOKFSTUDIO-REVIEW-207](SwRS-MDOKFSTUDIO-REVIEW-207.md): Changed blocks get a thin change bar that moves nothing
<!-- okf:links:end -->
