---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-276
uuid: 0da689d6-3dba-4418-977a-a9e0211b84e0
title: Inline marker buttons toggle their markers around the selection
description: When the writer presses Bold, Italic, Strikethrough, Subscript,
  Superscript, Key or Key (MyST), the extension SHALL wrap the selection, or the
  word at a collapsed caret, in the markers of that button, remove the markers
  when they are already there, and produce no edit when the markers cannot be
  written safely.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-019
- StRS-MDOKFSTUDIO-PALETTE-020
- StRS-MDOKFSTUDIO-PALETTE-021
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-PALETTE-045
- SwRS-MDOKFSTUDIO-PALETTE-048
- SwRS-MDOKFSTUDIO-PALETTE-126
- SwRS-MDOKFSTUDIO-PALETTE-135
- SwRS-MDOKFSTUDIO-PALETTE-138
implemented_in_files:
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## Inline marker buttons toggle their markers around the selection

### Normative behavior

When the writer presses Bold, Italic, Strikethrough, Subscript, Superscript, Key or Key (MyST), the extension SHALL wrap the selection, ignoring the blanks at its edges, or the word at a collapsed caret, in the markers of that button, insert an empty pair at a caret outside a word, remove the markers when they are already there, and produce no edit when the markers cannot be written safely: a selection that cuts into a run of asterisks on one side only, or a selection that holds a backtick or a line break where a role is written.

In the tables of this requirement, `[ ]` marks the selection and `|` marks the caret.

### Scenario (nominal): Bold and Italic wrap and unwrap

- GIVEN the text say foo now with foo selected
- WHEN Bold is pressed twice
- THEN the first press gives say **foo** now with foo selected and the second restores the text

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `say [foo] now` | `say **[foo]** now` |
| Italic | `say [foo] now` | `say *[foo]* now` |
| Bold | `say **[foo]** now` (markers outside the selection) | `say [foo] now` |
| Italic | `say *[foo]* now` (markers outside the selection) | `say [foo] now` |
| Bold | `say [**foo**] now` (markers inside the selection) | `say [foo] now` |
| Italic | `say [*foo*] now` (markers inside the selection) | `say [foo] now` |
| Bold | `say **fo\|o** now` (caret in the word) | `say fo\|o now` |
| Italic | `say *fo\|o* now` (caret in the word) | `say fo\|o now` |
| Bold | `**foo\|**` | `foo\|` |
| Bold, then Italic, then Italic, then Bold on `x foo y` with foo selected | | `x ***foo*** y` after the first two presses, then `x foo y` with the same selection |

### Scenario (nominal): Empty pair

- GIVEN the caret between two spaces
- WHEN Italic is pressed
- THEN the text gets two single asterisks with the caret between them

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `say \| now` | `say **\|** now` |
| Italic | `say foo\| now` (caret after a word) | `say foo*\|* now` |
| Bold | `\|` | `**\|**` |
| Bold | `x **\|** y` (empty pair) | `x \| y` |
| Italic | `x *\|* y` (empty pair) | `x \| y` |
| Strikethrough | `say \| now` (caret outside a word) | `say ~~\|~~ now` |
| Strikethrough | `x ~~\|~~ y` (empty pair) | `x \| y` |

### Scenario (nominal): Bold and Italic share a run of asterisks

- GIVEN the text foo selected inside ***foo***
- WHEN Bold is pressed and then Italic
- THEN Bold leaves *foo* and Italic then unwraps the text; each press removes only its share

- GIVEN the text foo selected inside *foo*
- WHEN Bold is pressed
- THEN the run becomes ***foo***

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `*[foo]*` | `***[foo]***` |
| Italic | `**[foo]**` | `***[foo]***` |
| Italic | `***[foo]***` | `**[foo]**` |
| Bold | `***[foo]***` | `*[foo]*` |
| Bold | `***fo\|o***` | `*fo\|o*` |
| Italic | `***fo\|o***` | `**fo\|o**` |

### Scenario (nominal): Strikethrough wraps and unwraps a double tilde pair

- GIVEN the text say foo now with foo selected
- WHEN Strikethrough is pressed
- THEN the text is say ~~foo~~ now with foo selected

- GIVEN the caret inside ~~foo~~
- WHEN Strikethrough is pressed
- THEN the markers are removed and the caret stays in the word

| Input | Outcome |
| --- | --- |
| `say ~~[foo]~~ now` (markers outside the selection) | `say [foo] now` |
| `say [~~foo~~] now` (markers inside the selection) | `say [foo] now` |
| `say ~~fo\|o~~ now` | `say fo\|o now` |
| `a[ foo ]b` (blanks at the selection edges are ignored) | `a ~~[foo]~~ b` |
| `[a` newline `b]` (multi-line selection) | `~~[a` newline `b]~~` |

The Strikethrough button has no keyboard shortcut.

### Scenario (nominal): Subscript and Superscript wrap the selection in a role

- GIVEN the selected 2 in H2O
- WHEN Subscript is pressed
- THEN the 2 is wrapped in the sub role and stays selected; with nothing selected the caret is put between the quotes of the role

- GIVEN the caret in a table cell editor
- WHEN Subscript or Superscript is pressed
- THEN both buttons work as in a block editor

### Scenario (nominal): Key (MyST) wraps the selection in the kbd role

- GIVEN the selected word Ctrl
- WHEN Key (MyST) is pressed
- THEN the word is wrapped in the kbd role

- GIVEN no selection
- WHEN Key (MyST) is pressed
- THEN `{kbd}` with the sample Ctrl+K is inserted with Ctrl+K selected

| Input | Outcome |
| --- | --- |
| Key (MyST) pressed in a table cell | The action works |
| Key (MyST) pressed on text that already has markup | Unlike Key, it never removes existing markup |

### Scenario (nominal): Key wraps the selection in kbd tags

- GIVEN a selected word
- WHEN Key is pressed twice
- THEN the word is wrapped in kbd tags and then unwrapped; the tags are also removed when the selection or its surroundings already have them

| Input | Outcome |
| --- | --- |
| The caret with no selection | A kbd element holding Key is inserted with Key selected |
| Key pressed in a table cell editor | Key works in a table cell too |

### Scenario (refusal): A selection that cuts into a marker run, or that a role cannot hold

- GIVEN a selection that starts inside a run of asterisks and ends outside it
- WHEN Bold is pressed
- THEN no edit is produced

- GIVEN a selection that covers the content with its whole run
- WHEN Bold is pressed
- THEN the markers are handled as usual

- GIVEN a selection that contains a backtick (Subscript, Superscript or Key (MyST)) or a line break (Subscript or Superscript)
- WHEN the button is pressed
- THEN no edit is produced

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `**f[oo]**` | no edit |
| Italic | `*[fo]o*` | no edit |
| Bold | `[*foo*]` (selection includes the markers) | not refused: the markers are handled as usual (this input is untested) |
| Superscript | a selection that contains a backtick | no edit |
| Key (MyST) | a selection that contains a backtick | no edit |

### Scenario (boundary): Edges, lines and other markers

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `a[ foo ]b` (blanks at the selection edges) | `a **[foo]** b` (the markers go around the trimmed content) |
| Bold | `**a**[ b ]**c**` (blanks between two spans) | `**a** **[b]** **c**` (not a wrapped selection) |
| Bold | `[a` newline `b]` (multi-line selection) | `**[a` newline `b]**` (one span) |
| Bold | `[_foo_]` (underscores) | `**[_foo_]**` (underscores are not recognised as markers and stay in place) |

A run holds bold when it has two or more asterisks and italic when its length is odd.

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-071: the rendering of a kbd element.

### Verification notes

- Method: test/page/modules/editActions.test.ts (data-driven rows named editActions bold, editActions italic and editActions strikethrough for wrap, unwrap, empty pair, shared run and boundary; unit tests for sub and sup, roleKbd and kbd: wrap and refusal, sample, table cell)
- Method: test/page/modules/editPalette.test.ts (Details, Footnote, Mermaid and Key are one-click actions; sample and table cell)
- Untested: the Bold press on a selection that includes a whole run (`[*foo*]`) and Key (MyST) on text that already has markup have no test row.
- Criteria: The markers go around the trimmed content, markers inside or just outside the selection count as present, underscores are not recognised, a multi-line selection is wrapped as one span, a run holds bold when it has two or more asterisks and italic when its length is odd, the refusal applies when exactly one side has markers that the selection does not cover, the roles never accept a backtick, and Key (MyST) never removes existing markup.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-019](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-019.md): A writer formats text with buttons and shortcuts
  - [StRS-MDOKFSTUDIO-PALETTE-020](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-020.md): A writer inserts GitHub Flavored Markdown constructs
  - [StRS-MDOKFSTUDIO-PALETTE-021](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-021.md): A writer inserts MyST constructs
- Supersedes:
  - [SwRS-MDOKFSTUDIO-PALETTE-045](SwRS-MDOKFSTUDIO-PALETTE-045.md): Bold and Italic toggle their shared asterisk markers
  - [SwRS-MDOKFSTUDIO-PALETTE-048](SwRS-MDOKFSTUDIO-PALETTE-048.md): Strikethrough toggles a double tilde pair
  - [SwRS-MDOKFSTUDIO-PALETTE-126](SwRS-MDOKFSTUDIO-PALETTE-126.md): Key wraps the selection in kbd tags, removes them, or inserts a sample
  - [SwRS-MDOKFSTUDIO-PALETTE-135](SwRS-MDOKFSTUDIO-PALETTE-135.md): Subscript and Superscript wrap the selection in a role
  - [SwRS-MDOKFSTUDIO-PALETTE-138](SwRS-MDOKFSTUDIO-PALETTE-138.md): Key (MyST) wraps the selection in the kbd role
<!-- okf:links:end -->
