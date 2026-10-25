---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-029
uuid: 8be9695c-f3bb-4669-9c99-0b781e7ea85c
title: Remove field deletes exactly the lines of a non-required field
description: When a field editor is open, the extension SHALL show in its field
  action menu a "Remove field" button for the edited row, which deletes exactly
  the lines of that field and keeps the comment lines above it, and which is
  disabled and refused by the host for a field the schema requires.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
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
- src/core/edits/frontmatterEdit.ts
- src/core/frontmatter/frontmatterSerialize.ts
- src/page/features/frontmatterMenu.ts
tested_in_files:
- test/core/edits/frontmatterEdit.test.ts
- test/core/frontmatter/frontmatterPreservation.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
- test/page/runtimeFrontmatterFields.test.ts
---

## Remove field deletes exactly the lines of a non-required field

### Normative behavior

When a field editor is open, the extension SHALL show in its field action menu a "Remove field" button for the edited row, which deletes exactly the lines of that field and keeps the comment lines above it, and which is disabled and refused by the host for a field the schema requires.

### Scenario (nominal): Every field editor has a Remove field button
| Editor open on the row | Outcome |
| --- | --- |
| a value editor on an optional field | the menu has an enabled button "Remove frontmatter field" labelled Remove field |
| a key editor | the same Remove field button appears in its menu |

### Scenario (nominal): Remove deletes exactly the lines of the field
- GIVEN frontmatter with a comment line above the field legacy followed by another field
- WHEN legacy is removed
- THEN only the legacy line is deleted and the comment lines stay

### Scenario (boundary): Removal leaves a valid block
| Field removed | Outcome |
| --- | --- |
| the only field of the block | the block becomes a valid empty mapping ({}) between the fences |
| tags (a list) | exactly the sequence lines are deleted |

### Scenario (refusal): Remove is disabled for a schema-required field
| Row whose editor opens | Remove button |
| --- | --- |
| marked required by the schema | disabled, its title reads "Required by the schema; it cannot be removed" |
| optional | enabled |

### Scenario (refusal): The host refuses to remove a required field
- GIVEN a document with a schema in which count is required
- WHEN a remove of count arrives
- THEN the answer is 'Cannot remove required frontmatter field "count".' and the document is unchanged

### Scenario (boundary): Only a newly missing required field blocks a remove
| Remove request | Outcome |
| --- | --- |
| an optional field, while a required field was already missing before the remove | accepted |
| a field whose removal makes another field newly missing through a conditional required rule | refused the same way, with the message above |

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-028: the Add field button of the same menu.

### Verification notes
- Method: test/page/runtimeFrontmatterEditor.test.ts and test/page/runtimeFrontmatterFields.test.ts (scenarios: Remove field button for a value editor and a key editor, T24 Remove field stays enabled on an optional row, T24 Remove field is disabled with a tooltip on a required row).
- Method: test/core/frontmatter/frontmatterPreservation.test.ts, test/core/frontmatter/okfFrontmatter.test.ts and test/core/frontmatter/okfFrontmatter.test.ts (scenarios: removal keeps the comment lines above the removed key, removing the only field leaves a valid empty mapping, remove of tags deletes exactly the sequence lines).
- Method: test/core/edits/frontmatterEdit.test.ts (scenarios: the host refuses to remove a required field, only a newly missing required field blocks a remove).
- Criteria: the disabled state is a page-side affordance; the host refusal holds for any remove request.
