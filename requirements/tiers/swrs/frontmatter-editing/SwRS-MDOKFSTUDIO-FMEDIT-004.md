---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-004
uuid: b37a820d-e7e7-4737-83a2-46291d188e59
title: "Text values are edited as one or several lines"
description: "When a writer edits the value of a text field, the extension SHALL show
  a text box in which Enter saves a one-line value, Enter adds a line in a multi-line
  value, Cmd or Ctrl+Enter saves, and the saved value keeps no trailing line break
  unless the original had one and is written as a YAML literal block when it holds
  line breaks."
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: proposed
status: stable
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
- src/core/frontmatter/frontmatterSerialize.ts
- src/page/features/frontmatterValueEditor.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-005
- SwRS-MDOKFSTUDIO-FMEDIT-006
- SwRS-MDOKFSTUDIO-FMEDIT-015
- SwRS-MDOKFSTUDIO-FMEDIT-075
- SwRS-MDOKFSTUDIO-FMEDIT-076
---

## Text values are edited as one or several lines

### Normative behavior

When a writer edits the value of a text field, the extension SHALL show a text box in which Enter saves a one-line value, Enter adds a line in a multi-line value, Cmd or Ctrl+Enter saves, and the saved value keeps no trailing line break unless the original had one and is written as a YAML literal block when it holds line breaks.

### Scenario (nominal): Enter saves a one-line text value

- GIVEN a text field title holding a one-line value, its editor open in the one-row text box
- WHEN the writer presses Enter
- THEN one previewFrontmatterSave is posted with the typed value

### Scenario (nominal): In a multi-line value Enter adds a line and Cmd or Ctrl+Enter saves

- GIVEN a text field editor whose value has two lines
- WHEN the writer presses Enter, then Cmd or Ctrl+Enter
- THEN Enter adds a line and posts nothing, and Cmd or Ctrl+Enter posts one previewFrontmatterSave with the typed value

### Scenario (refusal): Keys that do not save a text value

| Input | Outcome |
| --- | --- |
| Enter during IME composition in a one-line value | The key is ignored and nothing is posted |
| Shift+Enter in the text box of a text field | The key is left to the text box, which adds a line, and nothing is posted |
| Alt+Enter in the same editor | Nothing is posted |

### Scenario (boundary): Trailing line breaks of the typed value

| Input | Outcome |
| --- | --- |
| Original value without a trailing line break, two empty lines typed after the text, then save | The posted fieldValue has no trailing line break |
| Original value ending with a line break, saved without removing it | The trailing line break is kept in the posted value |

### Scenario (nominal): A multi-line value is written as a literal block

- GIVEN a plain frontmatter field description holding one line, followed by the field b: 2
- WHEN the value "a\nb" (two lines) is saved for description
- THEN the field is written as a literal block (description: |- then the lines a and b indented), and the line b: 2 and the fences stay unchanged

### Scenario (nominal): Fields without a schema type are edited as YAML text

- GIVEN a document without a schema and a field tags holding an object (the same box serves a field of unknown type, a list-typed field with a non-list value and an object value)
- WHEN the writer opens its editor
- THEN a text box labelled "Frontmatter tags" shows the value as YAML, its rows between 1 and 20; Enter adds a line and Cmd or Ctrl+Enter saves

### Scenario (boundary): A field just added opens an empty box

- GIVEN a field just added, whose value is the empty string
- WHEN its editor opens
- THEN the text box starts empty instead of showing the two quote characters

### Known issues

- Known issue: objects are edited as de-indented YAML and a YAML parser error is shown as raw, possibly multi-line text.

### Related requirements

- SwRS-MDOKFSTUDIO-FMEDIT-019: the commit rules of every field editor (leaving the editor, Escape).
- SwRS-MDOKFSTUDIO-FMEDIT-054: the shape of the save message these editors post.

### Verification notes

- Method: test/page/runtimeFrontmatterEditor.test.ts (Enter saves a one-line frontmatter text field, IME Enter, Shift+Enter and Alt+Enter post nothing; Enter in a multi-line value inserts a line and Cmd or Ctrl+Enter saves; trailing line breaks dropped and kept; schema-free values use a generic YAML editor with Enter inserting a line; empty string starts empty).
- Method: test/core/frontmatter/okfFrontmatter.test.ts (a multi-line value on a plain field is written as a literal block; marker file test/core/frontmatter/okfFrontmatter.test.ts).
- Criteria: Posted fieldValue compared in each case; the YAML text box has 1 to 20 rows.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-005](SwRS-MDOKFSTUDIO-FMEDIT-005.md): Trailing line breaks of a text value are dropped
  - [SwRS-MDOKFSTUDIO-FMEDIT-006](SwRS-MDOKFSTUDIO-FMEDIT-006.md): A multi-line text value is written as a literal block
  - [SwRS-MDOKFSTUDIO-FMEDIT-015](SwRS-MDOKFSTUDIO-FMEDIT-015.md): Fields without a schema type are edited as YAML text
  - [SwRS-MDOKFSTUDIO-FMEDIT-075](SwRS-MDOKFSTUDIO-FMEDIT-075.md): Shift+Enter adds a line in a text field without saving
  - [SwRS-MDOKFSTUDIO-FMEDIT-076](SwRS-MDOKFSTUDIO-FMEDIT-076.md): In a multi-line text value Enter adds a line and Cmd or Ctrl+Enter saves
<!-- okf:links:end -->
