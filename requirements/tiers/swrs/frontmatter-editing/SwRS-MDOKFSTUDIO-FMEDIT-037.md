---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-037
uuid: d18a6c97-ad18-4ebc-b9ce-b4a5ae8a61a2
title: An added field is one inserted line where its row shows, and its editor
  opens
description: 'When a writer adds a field, the extension SHALL insert it as one line
  where its row shows and open the editor of the new field once: with a schema right
  after the present field that precedes it in schema order or right before the next
  one when it comes first, without a schema after the row whose menu was used, else
  at the end of the block.'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/frontmatterEdit.ts
- src/core/frontmatter/frontmatterSerialize.ts
- src/page/features/frontmatterEditor.ts
- src/page/features/frontmatterValueEditor.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
- test/page/runtimeFrontmatterFields.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-038
- SwRS-MDOKFSTUDIO-FMEDIT-040
- SwRS-MDOKFSTUDIO-FMEDIT-041
- SwRS-MDOKFSTUDIO-FMEDIT-042
---

## An added field is one inserted line where its row shows, and its editor opens

### Normative behavior

When a writer adds a field, the extension SHALL insert it as one line where its row shows and open the editor of the new field once: with a schema right after the present field that precedes it in schema order or right before the next one when it comes first, without a schema after the row whose menu was used, else at the end of the block.

### Scenario (nominal): With a schema, the field goes where its row shows
- GIVEN a schema listing title, owner, status and a document with title and status
- WHEN owner is added
- THEN owner is inserted between title and status whichever row was clicked, right after the present field that precedes it in schema order

### Scenario (boundary): First in schema order and custom keys
| Added field | Insert point |
| --- | --- |
| a field that comes first in schema order, with a leading comment in the block | after the leading comment lines, before the first key (beforeField) |
| a schema field whose schema neighbours are absent from the document | the absent schema neighbours are skipped |
| a custom key | after the last row |

### Scenario (nominal): Without a schema, the field follows the row whose menu was used
| Added field | Insert point |
| --- | --- |
| owner, added from the menu of title, in a document without a schema with the fields title and status | directly after title |
| owner, with an afterField naming a field that does not exist | appended at the end of the block |

### Scenario (nominal): The editor of the added field opens by itself once
- GIVEN an add posted for the field owner in edit mode
- WHEN the re-rendered table arrives
- THEN the editor of owner opens and the pending edit is cleared when it closes

### Scenario (boundary): Reload and later renders
| Page load | Outcome |
| --- | --- |
| the render that posted the add is loaded again | the pending edit is kept for the next render |
| a later render of an already opened editor | the editor is not reopened |

### Scenario (refusal): A pending editor that cannot be used is dropped
| Situation when the table is re-rendered | Outcome |
| --- | --- |
| edit mode turned off | no editor opens and the pending edit is cleared |
| the row of the new field is missing | no editor opens and the pending edit is cleared |
| the add was refused by the host (error result) | the pending edit is cleared |

### Scenario (nominal): A new custom key is saved as a plain scalar when that is safe
- GIVEN a custom key just added with the empty string as value
- WHEN the writer types plain text and presses Enter
- THEN the editor is one text line, the save carries fieldValueStyle plain and the value is written unquoted

### Scenario (boundary): Text that would not read back as the same string
| Value typed for the new custom key | Outcome |
| --- | --- |
| yes, on, or a date-like value | written quoted |
| any save of an existing field (a field whose current value is not the empty string) | never asks for a plain scalar; the host accepts the plain style only for a field whose current value is the empty string |

### Known issues
- Known issue: when the minimal insertion cannot be verified, the field is appended at the end of the block instead (positioned false).

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-028: the Add field menu that posts the add.
- SwRS-MDOKFSTUDIO-FMEDIT-043: the added field is one inserted line in the line endings of the file.

### Verification notes
- Method: test/core/frontmatter/okfFrontmatter.test.ts and test/core/frontmatter/okfFrontmatter.test.ts (scenarios: schema placement, first in schema order and custom keys, T41 a schema field goes between its schema neighbours, skips absent neighbours, a custom key goes after the last row, beforeField on the first key inserts after leading comment lines; without a schema, add with afterField reports whether the field was placed; plainScalar quotes a date-like value).
- Method: test/page/runtimeFrontmatterFields.test.ts (scenarios: T25 a pending frontmatter edit opens the editor, reload keeps it and a later render does not reopen it, a pending edit outside edit mode, for a missing row or after an error result is dropped).
- Method: test/page/runtimeFrontmatterEditor.test.ts (scenarios: T41 a new custom key opens a one-line text editor, plain scalar safety).
- Criteria: the plain scalar rule holds when the text reads back as the same string.
