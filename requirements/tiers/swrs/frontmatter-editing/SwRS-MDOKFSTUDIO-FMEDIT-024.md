---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-024
uuid: 5a2d0d8a-cee8-48c2-9c10-f682d524a894
title: A click on a field name renames the key
description: When a writer clicks a field name in edit mode, the extension SHALL
  open a key editor in the name cell whose suggestion list offers the schema
  keys not yet used, and rename the key from it on Enter or on leaving with a
  changed name, changing only the key text and keeping the comments.
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
- src/page/features/frontmatterEditor.ts
tested_in_files:
- test/core/edits/frontmatterEdit.test.ts
- test/core/frontmatter/frontmatterPreservation.test.ts
- test/page/runtimeEditorFlush.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
- test/visual/scenarioDefinitions2.ts
---

## A click on a field name renames the key

### Normative behavior

When a writer clicks a field name in edit mode, the extension SHALL open a key editor in the name cell whose suggestion list offers the schema keys not yet used, and rename the key from it on Enter or on leaving with a changed name, changing only the key text and keeping the comments.

### Scenario (nominal): Click on a field name opens the key editor
- GIVEN edit mode on and a schema whose keys include owner, absent from the document
- WHEN the writer clicks the name cell of the title field
- THEN an input labelled "Frontmatter key title" opens with the caret at the end and its datalist offers owner

### Scenario (boundary): Key editor without a schema
- GIVEN a document without a schema
- WHEN the writer clicks a name cell
- THEN the key editor opens with an empty suggestion list

### Scenario (nominal): Enter or leaving renames only the key text
- GIVEN a key editor for title holding the new name heading, the field being followed by a trailing comment
- WHEN the writer presses Enter (or leaves the editor with the changed name)
- THEN a save with fieldName title and newFieldName heading is posted and the written line keeps its trailing comment

### Scenario (boundary): Unchanged name and Escape
- GIVEN a key editor whose name was not changed
- WHEN the writer presses Enter or leaves it
- THEN the editor closes and nothing is posted; Escape cancels the edit

### Scenario (refusal): The key editor refuses an empty or padded name
| Name typed in the key editor | Outcome after Enter |
| --- | --- |
| empty | the status shows "Enter a non-empty key without leading or trailing spaces." in the error state and nothing is posted |
| " owner" (leading space) | the same message shows and nothing is posted |

A flush does not refuse: it trims the key and an empty key keeps the old one (see SwRS-MDOKFSTUDIO-FMEDIT-067).

### Scenario (refusal): The host refuses a rename to a used or invalid name
| Rename request received by the host | Answer, document unchanged |
| --- | --- |
| title renamed to count, in a document with the fields title and count | 'A frontmatter field named "count" already exists.' |
| a name with surrounding spaces, or an empty name, sent directly to the host | "Enter a non-empty frontmatter key without leading or trailing spaces." |

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-067: a flush trims the typed key and keeps the old key when the typed one is empty.
- SwRS-MDOKFSTUDIO-FMEDIT-054: the accepted shape of the save message that carries the rename.

### Verification notes
- Method: test/page/runtimeFrontmatterEditor.test.ts (scenarios: click opens the key editor with suggestions, no schema, Enter or blur renames, unchanged name and Escape), visual scenario frontmatter-editing/v01-edit-key-suggestions-dark-900 in test/visual/scenarioDefinitions2.ts (key editor opens focused with the suggestion list).
- Method: test/page/runtimeEditorFlush.test.ts (scenario: empty or padded name refused in the key editor).
- Method: test/core/frontmatter/frontmatterPreservation.test.ts (scenario: Enter renames and the trailing comment is kept, structural F2 rename of title to heading).
- Method: test/core/edits/frontmatterEdit.test.ts (scenario: the host refuses a rename to a used name or an invalid name).
- Criteria: the page-side check and the host check are separate; the host check also holds for a request that did not come from the key editor.
