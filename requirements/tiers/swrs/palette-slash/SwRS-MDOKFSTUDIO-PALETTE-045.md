---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-045
uuid: 91cde570-dd54-4e42-a52c-c5c950f4ba7f
title: Bold and Italic toggle their shared asterisk markers
description: When the writer presses Bold or Italic, the extension SHALL wrap
  the selection, ignoring the blanks at its edges, or the word at a collapsed
  caret, in two or one asterisks, insert an empty pair at a caret outside a
  word, remove the markers when they are already there, add or remove only its
  own share of a run of asterisks, and produce no edit when the selection cuts
  into a run of asterisks on one side only.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Bold and Italic toggle their shared asterisk markers

### Normative behavior

When the writer presses Bold or Italic, the extension SHALL wrap the selection, ignoring the blanks at its edges, or the word at a collapsed caret, in two or one asterisks, insert an empty pair at a caret outside a word, remove the markers when they are already there, add or remove only its own share of a run of asterisks, and produce no edit when the selection cuts into a run of asterisks on one side only.

### Scenario (nominal): Wrap and unwrap

- GIVEN the text say foo now with foo selected
- WHEN Bold is pressed twice
- THEN the first press gives say **foo** now with foo selected and the second restores the text

In the tables of this tile, `[ ]` marks the selection and `|` marks the caret.

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

### Scenario (refusal): A selection that cuts into a marker run

- GIVEN a selection that starts inside a run of asterisks and ends outside it
- WHEN Bold is pressed
- THEN no edit is produced

- GIVEN a selection that covers the content with its whole run
- WHEN Bold is pressed
- THEN the markers are handled as usual

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `**f[oo]**` | no edit |
| Italic | `*[fo]o*` | no edit |
| Bold | `[*foo*]` (selection includes the markers) | not refused: the markers are handled as usual (this input is untested) |

### Scenario (boundary): Edges, lines and other markers

| Action | Input | Outcome |
| --- | --- | --- |
| Bold | `a[ foo ]b` (blanks at the selection edges) | `a **[foo]** b` (the markers go around the trimmed content) |
| Bold | `**a**[ b ]**c**` (blanks between two spans) | `**a** **[b]** **c**` (not a wrapped selection) |
| Bold | `[a` newline `b]` (multi-line selection) | `**[a` newline `b]**` (one span) |
| Bold | `[_foo_]` (underscores) | `**[_foo_]**` (underscores are not recognised as markers and stay in place) |

A run holds bold when it has two or more asterisks and italic when its length is odd.

### Verification notes

- Method: test/page/modules/editActions.test.ts (data-driven rows named editActions bold and editActions italic for wrap, unwrap, empty pair, shared run and boundary; bold then italic then unwrapping both restores the text; a selection cutting into a marker run on one side produces no edit)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Untested: the Bold press on a selection that includes a whole run (`[*foo*]`) in the refusal scenario has no test row.
- Criteria: The markers go around the trimmed content, markers inside or just outside the selection count as present, underscores are not recognised, a multi-line selection is wrapped as one span, a run holds bold when it has two or more asterisks and italic when its length is odd, and the refusal applies when exactly one side has markers that the selection does not cover.
