---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-124
uuid: f9310a4d-88e3-46e4-a8c5-6d882ce844a8
title: "Moves and clipboard edits are refused for ranges that do not match the document"
description: "When the ranges of a block move, the range of a copy or a cut, or the
  line of a paste do not match the document, or a move or a clipboard edit reaches
  into the frontmatter, or text lies between the two blocks of a move, or a move would
  start the body of an admonition or an alert with a block that hides it or becomes
  its title, the host SHALL answer with the reason of that case and change nothing."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
scenarios:
- id: S1
  title: Move ranges that do not match the document
- id: S2
  title: Copy, cut and paste ranges that do not match the document
- id: S3
  title: Moves into or out of the frontmatter
- id: S4
  title: Copy, cut and paste in the frontmatter
- id: S5
  title: Text between the two blocks of a move
- id: S6
  title: Ranges that match the document
- id: S7
  title: A move that would spoil an admonition as its first block
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockMove.ts
- src/core/mapping/blockRange.ts
- src/core/mapping/boxFirstBlock.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/blockMove.test.ts
- test/core/mapping/blockRange.test.ts
- test/integration/blockClipboard.test.ts
- test/integration/blockMove.test.ts
- test/session/boxBlockSourceLines.test.ts
default_owner_email: gaetan@xeberon.net
---

## Moves and clipboard edits are refused for ranges that do not match the document

### Normative behavior

When the ranges of a block move, the range of a copy or a cut, or the line of a paste do not match the document, or a move or a clipboard edit reaches into the frontmatter, or text lies between the two blocks of a move, or a move would start the body of an admonition or an alert with a block that hides it or becomes its title, the host SHALL answer with the reason of that case and change nothing.

### Scenario S1 (refusal): Move ranges that do not match the document

| Input | Outcome |
| --- | --- |
| Two ranges that overlap | The move is refused with "The preview is out of date. Refresh it and try again." |
| Unordered ranges | Refused with the same reason |
| A range outside the text | Refused with the same reason |
| A range whose first line is blank, or a range of blank lines only | Refused with the same reason (blank lines at the end of a range are dropped before the check, see SwRS-MDOKFSTUDIO-BLOCK-117) |

### Scenario S2 (refusal): Copy, cut and paste ranges that do not match the document

| Input | Outcome |
| --- | --- |
| A cut of lines 15 to 99 in a shorter document | The answer is ok false with "The preview is out of date. Refresh it and try again." and the document is unchanged |
| A copy or cut range that is out of bounds or unordered | The same refusal |
| A copy or cut that starts on a blank line, covers blank lines only, or ends on a line holding only a no-break space | The same refusal (spaces-and-tabs lines at the end of a copy or cut range are dropped before the check, see SwRS-MDOKFSTUDIO-BLOCK-166 and SwRS-MDOKFSTUDIO-BLOCK-169) |
| A paste after a line that does not exist, a line holding only a no-break space, or a blank line with no body line above it (the start of the text, right under the frontmatter) | The same refusal (a blank line that ends a block is accepted, see SwRS-MDOKFSTUDIO-BLOCK-174) |

### Scenario S3 (refusal): Moves into or out of the frontmatter

| Input | Outcome |
| --- | --- |
| A first range inside the frontmatter lines | The move is refused with "A block cannot be moved into or out of the frontmatter." |
| A move across the frontmatter, also a span next to it | Refused with the same reason |

### Scenario S4 (refusal): Copy, cut and paste in the frontmatter

| Input | Outcome |
| --- | --- |
| A copy of lines 1 to 3 of a document that starts with frontmatter | The answer is ok false with "Blocks of the frontmatter cannot be cut, copied or pasted into." |
| A cut or a paste that names a line inside the frontmatter | The same refusal |

### Scenario S5 (refusal): Text between the two blocks of a move

- GIVEN two blocks with an HTML comment between them
- WHEN the move is planned
- THEN it is refused with "Text between the two blocks (a comment or a link definition) prevents the move." and nothing changes

### Scenario S6 (nominal): Ranges that match the document

| Input | Outcome |
| --- | --- |
| Two body blocks below the frontmatter | The move is planned normally |
| Two blocks with only blank lines between them | The move is planned |
| A copy of body lines | The copy is done |

### Scenario S7 (refusal): A move that would spoil an admonition as its first block

The body below is that of a MyST admonition (`{note}` and its kinds, `{admonition}`), a `{dropdown}`, a version admonition, a Quarto callout (also a `{div}` with a `callout-` class in its braces or in a `class=` attribute, and a `{div}` whose options name `callout-` anywhere, in a `:class:` option or in a block of options in any YAML spelling, even when it gets no callout class) or a GitHub alert. The first place is the one under the opening or marker line, also below the directive's options and blank lines. The move is refused whichever of its two blocks the writer moves.

| Input | Outcome |
| --- | --- |
| A move that gives the first place of such a body to a block that starts with a line of three dashes or more, indented no further than the opening | Refused with "A --- line cannot start an admonition or an alert: its content would not show." |
| A move that gives the first place to a heading, in an admonition directive with no argument on its opening line, or in a callout | Refused with "A heading cannot start this admonition: it would become its title." |
| `***` or an indented `---` moved to the first place, or `---` moved below a comment or a link definition that starts the body | The move is done |
| A heading moved to the first place of an admonition with an argument on its opening line, a `{dropdown}`, a version admonition or a GitHub alert | The move is done |

### Known issues

- Known issue (CR-514): a paragraph that is only bold text, moved to the first place of an admonition without a title, becomes its title; the move is not refused.
- Known issue (CR-514): erasing the block above a `---` line at the start of such a body leaves that line first, and the body does not show.

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-117: the move that these checks guard
- SwRS-MDOKFSTUDIO-BLOCK-166: copy
- SwRS-MDOKFSTUDIO-BLOCK-169: cut
- SwRS-MDOKFSTUDIO-BLOCK-174: paste
- SwRS-MDOKFSTUDIO-BLOCK-127: included blocks are refused with their own reasons

### Verification notes

- Method: test/core/mapping/blockMove.test.ts (move ranges, frontmatter, text between: `refuses overlapping, unordered, out-of-range and blank-edged ranges`, `refuses blocks in the frontmatter and a move across it`, `a span next to the frontmatter cannot cross it`, `refuses non-blank text between the blocks`).
- Method: test/integration/blockMove.test.ts (overlap and blank edge, frontmatter; the text between the blocks is not checked here).
- Method: test/core/mapping/blockRange.test.ts (copy, cut and paste ranges and the frontmatter: `spanText refuses bad ranges and the frontmatter`, `cut refuses the frontmatter and bad ranges`, `paste refuses an empty clipboard, the frontmatter and stale lines` with its blank-line assertion changed to an accepted paste, `paste still refuses a blank line with no body above it and a no-break-space line`); test/core/edits/sourceEdits.test.ts (`copy and cut still refuse blank-only, blank-first and out-of-range spans`, `a selection ending on a no-break-space line is refused, not shortened`).
- Method: test/integration/blockClipboard.test.ts (blank line, bounds, frontmatter).
- Method: test/session/boxBlockSourceLines.test.ts, answered by the real `PreviewManager` (scenario 7): with the neighbour `moveNeighbour` gives on the rendered page, `the chord is refused when it would start a box with a block that spoils it: ...` (a colon and a backtick admonition, a dropdown, a version admonition, a block of options, a body on the opening line, a note in a list item, both alert markers, a bare `{admonition}`, a callout, a `{div}` callout given by a `:class:` option, a block of options or a `class=` attribute, its class listed, escaped or given by a YAML alias there, names written with spaces, classes or capitals; both directions), `the chord is also refused in a {div} whose options name a callout class that it does not get` and `the chord still moves a rule or a heading to a first place that renders it` (also a heading in a `{div}` that is no callout).
- Criteria: planBlockMove returns the refusal for each move case (the first place of an admonition body is read from the source lines by firstBlockRefusal); checkSpan and planPaste return the refusal for each clipboard case; the reason text equals the one in the table; the trailing CommonMark blank lines of a copy or cut range are dropped before checkSpan; planPaste moves a CommonMark-blank anchor under a body line before planInsertion.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
