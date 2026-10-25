---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-094
uuid: 5d708e2a-7eb0-4ccd-be85-822aeee81afd
title: The host inserts a new block with clean blank lines
description: When the host writes a new block after a line, it SHALL put one
  blank line before it and one blank line after it (none after it at the end of
  the document), in the line endings of the document, and write nothing for an
  empty or whitespace-only text or for a line that is not in the document.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/insertion.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/mapping/insertion.test.ts
- test/integration/previewEditing.test.ts
---

## The host inserts a new block with clean blank lines

### Normative behavior

When the host writes a new block after a line, it SHALL put one blank line before it and one blank line after it (none after it at the end of the document), in the line endings of the document, and write nothing for an empty or whitespace-only text or for a line that is not in the document.

### Scenario (nominal): Between blocks
- GIVEN a document with two blocks separated by a blank line and a new block inserted after the first
- WHEN the host plans the insertion
- THEN the new text goes at the end of the first block's last line, preceded by a blank line and followed by the existing blank line

### Scenario (boundary): Blocks and the end of the document
| Input | Outcome |
| --- | --- |
| A block directly followed by a non-blank line, a block inserted after it | A line break is added after the new block so that the next block is not glued to it |
| A document ending with a figure fence and a final line break, a block inserted after the closing fence | The new block follows the closing fence after one blank line, with no separator after it |
| A document that ends with an image line and no final line break, a block inserted after that line | The new block follows after one blank line, with no separator after it |

### Scenario (boundary): The first block (after line 0)
| Input | Outcome |
| --- | --- |
| A document that starts with frontmatter | The new text follows the closing fence and the frontmatter text is unchanged |
| A document that holds only frontmatter | The new block ends the document after one blank line |
| An empty document | The document holds the new block followed by one line break |
| A document that starts with a heading and has no frontmatter | The new block comes first, followed by a blank line and then the heading |

### Scenario (boundary): Line endings
| Input | Outcome |
| --- | --- |
| A document with CR LF line breaks, a block of two lines inserted | Every line break of the inserted text is CR LF |
| A document with LF line breaks only, a block inserted | Every line break of the inserted text is LF |
| A document whose lines end with a lone CR, a block of two lines inserted after line 1 or after a later line | The block goes at the end of that line and every line break of the inserted text is CR; a line after the last CR is refused as missing |

### Scenario (refusal): A whitespace-only new block
| Input | Outcome |
| --- | --- |
| An insertion editor whose text is `  \n`, the final save arrives | The document is unchanged and the edit ends |
| An insertion editor whose text is `Hello`, the final save arrives | The block is inserted |

### Scenario (boundary): Trailing line breaks are dropped
| Input | Outcome |
| --- | --- |
| A new block typed as `Hello\n\n` | The document holds `Hello` followed by the planned separator only |
| A block typed as `a\n\nb` | The inner blank line is kept |

### Scenario (refusal): A line that does not exist
| Input | Outcome |
| --- | --- |
| A previewEditOpen with insertAfterLine beyond the last line | The host registers no editor and the editor shows "The preview is stale. Refresh it before editing this block." |
| A previewEditOpen with insertAfterLine on the last line | The empty source of the new block is sent |

### Known issues
- Known issue: a document whose lines end with a lone CR is not recognised as having frontmatter (the fence match accepts LF and CR LF only), so an insertion at the start of such a document goes before the frontmatter.

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-087: the page side of the insertion
- SwRS-MDOKFSTUDIO-BLOCK-216: a refused open or save keeps the typed text and says why (the save for an insertion after a missing line)

### Verification notes
- Method: test/core/mapping/insertion.test.ts (between blocks, glued next block, last line with and without a final line break, frontmatter, empty document, CRLF documents, lone-CR documents, whitespace-only text, trailing line breaks, out of range lines); the stale message has no assertion
- Method: test/integration/previewEditing.test.ts (insertion protocol: autosave, final save, cancel, empty text)
- Method: real-input scenario scenarioInsertAfterFinalFigure and visual scenarios block-editing/v09 and block-editing/v10 (end of document after a figure or an image)
- Criteria: prefix is two line endings and suffix one line ending only when the next line holds text; the offset equals the end of the closing fence line after frontmatter; offset 0 with an empty prefix for a first block without frontmatter; the plan's lineEnding is CR LF when the text contains a CR LF pair, else LF when it contains an LF, else CR when it contains a CR; insertionText returns an empty string for whitespace; a final line break is not counted as a following line; no double separator follows the inserted text; planInsertion returns undefined for an out of range line and the host posts the error
