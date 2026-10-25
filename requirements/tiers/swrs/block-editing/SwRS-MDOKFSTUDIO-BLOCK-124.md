---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-124
uuid: f9310a4d-88e3-46e4-a8c5-6d882ce844a8
title: "Moves and clipboard edits are refused for ranges that do not match the document"
description: "When the ranges of a block move, the range of a copy or a cut, or the
  line of a paste do not match the document, or a move or a clipboard edit reaches
  into the frontmatter, or text lies between the two blocks of a move, the host SHALL
  answer with the reason of that case and change nothing."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
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
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockMove.ts
- src/core/mapping/blockRange.ts
tested_in_files:
- test/core/mapping/blockMove.test.ts
- test/core/mapping/blockRange.test.ts
- test/integration/blockClipboard.test.ts
- test/integration/blockMove.test.ts
---

## Moves and clipboard edits are refused for ranges that do not match the document

### Normative behavior

When the ranges of a block move, the range of a copy or a cut, or the line of a paste do not match the document, or a move or a clipboard edit reaches into the frontmatter, or text lies between the two blocks of a move, the host SHALL answer with the reason of that case and change nothing.

### Scenario (refusal): Move ranges that do not match the document

| Input | Outcome |
| --- | --- |
| Two ranges that overlap | The move is refused with "The preview is out of date. Refresh it and try again." |
| Unordered ranges | Refused with the same reason |
| A range outside the text | Refused with the same reason |
| A range whose first or last line is blank | Refused with the same reason |

### Scenario (refusal): Copy, cut and paste ranges that do not match the document

| Input | Outcome |
| --- | --- |
| A cut of lines 15 to 99 in a shorter document | The answer is ok false with "The preview is out of date. Refresh it and try again." and the document is unchanged |
| A copy or cut range that is out of bounds or unordered | The same refusal |
| A cut that starts or ends on a blank line | The same refusal |
| A paste after a line that does not exist or that is blank | The same refusal |

### Scenario (refusal): Moves into or out of the frontmatter

| Input | Outcome |
| --- | --- |
| A first range inside the frontmatter lines | The move is refused with "A block cannot be moved into or out of the frontmatter." |
| A move across the frontmatter, also a span next to it | Refused with the same reason |

### Scenario (refusal): Copy, cut and paste in the frontmatter

| Input | Outcome |
| --- | --- |
| A copy of lines 1 to 3 of a document that starts with frontmatter | The answer is ok false with "Blocks of the frontmatter cannot be cut, copied or pasted into." |
| A cut or a paste that names a line inside the frontmatter | The same refusal |

### Scenario (refusal): Text between the two blocks of a move

- GIVEN two blocks with an HTML comment between them
- WHEN the move is planned
- THEN it is refused with "Text between the two blocks (a comment or a link definition) prevents the move." and nothing changes

### Scenario (nominal): Ranges that match the document

| Input | Outcome |
| --- | --- |
| Two body blocks below the frontmatter | The move is planned normally |
| Two blocks with only blank lines between them | The move is planned |
| A copy of body lines | The copy is done |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-117: the move that these checks guard
- SwRS-MDOKFSTUDIO-BLOCK-166: copy
- SwRS-MDOKFSTUDIO-BLOCK-169: cut
- SwRS-MDOKFSTUDIO-BLOCK-174: paste
- SwRS-MDOKFSTUDIO-BLOCK-127: included blocks are refused with their own reasons

### Verification notes

- Method: test/core/mapping/blockMove.test.ts (move ranges, frontmatter, text between: `refuses overlapping, unordered, out-of-range and blank-edged ranges`, `refuses blocks in the frontmatter and a move across it`, `a span next to the frontmatter cannot cross it`, `refuses non-blank text between the blocks`).
- Method: test/integration/blockMove.test.ts (overlap and blank edge, frontmatter; the text between the blocks is not checked here).
- Method: test/core/mapping/blockRange.test.ts (copy, cut and paste ranges and the frontmatter: `spanText refuses bad ranges and the frontmatter`, `cut refuses the frontmatter and bad ranges`, `paste refuses an empty clipboard, the frontmatter and stale lines`).
- Method: test/integration/blockClipboard.test.ts (blank line, bounds, frontmatter).
- Criteria: planBlockMove returns the refusal for each move case; checkSpan and planPaste return the refusal for each clipboard case; the reason text equals the one in the table.
