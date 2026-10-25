---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-010
uuid: 2ec5f533-e4bb-42c2-8a1c-bdc26081a8fb
title: "List fields and link lists are edited item by item"
description: "When a writer opens the editor of a list field, the extension SHALL
  show one text input per item, each with a drag handle and a remove button, an Add
  item button and no Save or Cancel button, and let the writer add, remove, reorder
  and save the items from the keyboard or by drag, with the known Markdown file stems
  offered on a list of filename-stem links."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/frontmatterListEditor.ts
tested_in_files:
- test/page/runtimeFrontmatterEditor.test.ts
- test/page/runtimeFrontmatterFields.test.ts
---

## List fields and link lists are edited item by item

### Normative behavior

When a writer opens the editor of a list field, the extension SHALL show one text input per item, each with a drag handle and a remove button, an Add item button and no Save or Cancel button, and let the writer add, remove, reorder and save the items from the keyboard or by drag, with the known Markdown file stems offered on a list of filename-stem links.

### Scenario (nominal): A list field shows one input per item

- GIVEN a list field with items a and b
- WHEN the writer opens its editor
- THEN two inputs labelled List item 1 and List item 2 appear with a handle and a remove button each, plus "+ Add item" and no Save or Cancel button

### Scenario (boundary): What saves the list and what does not

| Input | Outcome |
| --- | --- |
| Focus moves out of the editor | The list is saved as an array of strings |
| Cmd or Ctrl+Enter in an item | One previewFrontmatterSave with the items as strings is posted |
| Focus moves to the field menu | No save |
| A drag in progress (focus change of the drag) | No save |
| Enter with Shift, or Enter during IME composition, in an item | The list is not touched and nothing is posted |

### Scenario (nominal): Enter inserts an empty item after the caret item

- GIVEN a list editor with items a and b and the caret in a
- WHEN the writer presses Enter
- THEN an empty item is inserted after a and focused, nothing is posted

### Scenario (boundary): Enter and Backspace on empty items

| Input | Outcome |
| --- | --- |
| Enter in an empty last item | The item is removed and the list is saved |
| Enter with Shift or Alt, or during IME composition | The list is not touched |
| Backspace in an empty middle item | The item is removed and the previous input is focused |
| Backspace in an empty first item | The item is removed and the next input is focused |
| Backspace in the only item | The item is removed and the Add item button is focused |
| Backspace in a non-empty item | The key is left to the browser and the item stays |

### Scenario (nominal): Items reorder by keyboard

- GIVEN a list editor with items a, b and c
- WHEN the writer presses ArrowDown on the handle of a
- THEN the order becomes b, a, c and the labels are renumbered

### Scenario (boundary): Items reorder by drag

- GIVEN a drag of the handle of a over c
- WHEN the item is dropped
- THEN an insertion line shows during the drag, the order changes, and no save is triggered by the focus change of the drag

### Scenario (nominal): Link lists suggest the known Markdown file stems

- GIVEN a list field of filename-stem links whose row carries link suggestions
- WHEN the writer opens its editor and adds an item
- THEN each input, the new one included, references the datalist of the stems

### Scenario (boundary): An item matching no stem is warned about and still saved

- GIVEN an item whose value matches no stem
- WHEN the writer types it
- THEN the status warns 'No Markdown file named "x.md" was found. It will be saved as typed.' and saving still posts the value; a missing or invalid suggestion attribute gives no datalist

### Known issues

- Known issue: list items are edited as strings: a number in a list is saved as text.
- Known issue: suggestions exist only after the deferred link inspection: an editor opened before it gets none, and scalar link fields get no suggestions.

### Related requirements

- SwRS-MDOKFSTUDIO-FMEDIT-019: the commit rules of every field editor (Escape, saving in flight, refused saves).
- SwRS-MDOKFSTUDIO-FMEDIT-003: the Set to null button inside a nullable list editor.

### Verification notes

- Method: test/page/runtimeFrontmatterEditor.test.ts (one input per item with handle, remove and Add item buttons; leaving the editor saves an array of strings, the field menu focus and a drag do not save; ArrowDown reorder and renumbering; add, reorder, remove and direct array saves; drag shows the insertion boundary).
- Method: test/page/runtimeFrontmatterFields.test.ts (Enter inserts an empty item and focuses it; Enter in an empty last item removes it and saves; Enter with Shift or Alt or while composing does not touch the list; Backspace in an empty item removes it and moves focus; Cmd or Ctrl+Enter saves the list; link list datalist on every input, none for a missing or invalid attribute, the warning, the save still posted).
- Criteria: Items are shown and saved as strings.
