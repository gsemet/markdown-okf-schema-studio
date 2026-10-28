---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-003
uuid: 0cedfdb5-fd8e-4ff9-a6c2-fbcd688d2a55
title: Every rendered block maps to its absolute source lines
description: When a document is rendered, the extension SHALL give every
  paragraph, heading, block quote, list, list item, code block, table, math
  block, thematic break and definition list a one-based source line, with an end
  line for a multi-line block, counted in the whole file after a leading
  frontmatter block is left out of the body.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystNode.ts
- src/core/render/mystNormalize.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/render/alertSourceLines.test.ts
- test/core/render/mystFeatures.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-004
- SwRS-MDOKFSTUDIO-CORE-005
- SwRS-MDOKFSTUDIO-CORE-006
- SwRS-MDOKFSTUDIO-CORE-007
---

## Every rendered block maps to its absolute source lines

### Normative behavior

When a document is rendered, the extension SHALL give every paragraph, heading, block quote, list, list item, code block, table, math block, thematic break and definition list a one-based source line, with an end line for a multi-line block, counted in the whole file after a leading frontmatter block is left out of the body.

### Scenario (nominal): Map each block to its source line

- GIVEN a document whose third line starts a paragraph
- WHEN it is rendered
- THEN that paragraph element carries source line 3

### Scenario (nominal): Map a multi-line block to its end line

- GIVEN a code fence on lines 5 to 9
- WHEN it is rendered
- THEN the block carries start line 5 and end line 9

### Scenario (boundary): Map a one-line block and a directive child

| Input | Outcome |
| --- | --- |
| a one-line paragraph | the block carries its start line and no larger end line |
| a directive whose children have no position of their own | each child carries the line of the directive |

### Scenario (nominal): Hide leading frontmatter from the body

- GIVEN a document that starts with a YAML frontmatter block
- WHEN it is rendered
- THEN the body holds no code block for the frontmatter

### Scenario (boundary): Only the leading block is frontmatter

- GIVEN a document with a thematic break `---` later in the text
- WHEN it is rendered
- THEN only the leading block is treated as frontmatter and the later `---` line is unchanged

### Scenario (boundary): Keep body lines absolute after frontmatter

| Input | Outcome |
| --- | --- |
| a frontmatter block of four lines then a paragraph (LF) | the paragraph carries source line 5 |
| the same document saved with CRLF line breaks | the paragraph still carries source line 5 |
| the same document with CR line breaks | the body source lines equal the absolute file line |

### Scenario (nominal): Map image-only blocks

- GIVEN a paragraph holding only an image, an `{image}` directive or a lone raw `<img>` element
- WHEN it is rendered
- THEN the image block is mapped with its source lines, so an insert point can follow it

### Scenario (refusal): Drop a raw image without source

- GIVEN a raw `<img>` without a `src` attribute
- WHEN it is rendered
- THEN the element is dropped

### Verification notes

- Method: Unit test "block elements carry the source line the editor scrolls against" in test/core/render/mystFeatures.test.ts (nominal source line, boundary directive child)
- Method: Unit test "multiline blocks retain their full mapped source range" in test/core/render/mystFeatures.test.ts (nominal end line, boundary one-line block)
- Method: Unit test "block source ranges stay absolute when leading frontmatter is stripped" in test/core/render/mystFeatures.test.ts (nominal hide frontmatter, boundary leading block only, boundary absolute lines for the LF row, with a frontmatter of three lines; the CRLF and CR rows are untested)
- Method: Unit test "a lone raw <img> block is a mapped block with a source line" in test/core/render/mystFeatures.test.ts (nominal image-only blocks, refusal raw image without source)
- Method: Unit tests in test/core/render/alertSourceLines.test.ts (nominal source and end lines of the blocks of a document with GitHub alerts, which are rewritten into longer admonitions before parsing, with and without frontmatter)
- Criteria: Every mapped block element carries a one-based source line attribute; multi-line blocks expose their full source range and single-line blocks do not exceed it. No frontmatter code block appears in the body and later `---` lines are unchanged. Body source lines equal the absolute file line for every line-break style. Image-only blocks carry source lines; a raw `<img>` without `src` is not rendered.
