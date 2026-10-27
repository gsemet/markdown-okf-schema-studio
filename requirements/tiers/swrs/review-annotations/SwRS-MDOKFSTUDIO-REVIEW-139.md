---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-139
uuid: a3974cfb-3f30-4d82-b571-cd71ef3dd38c
title: TODO words and TODO comments show as green chips
description: When a paragraph holds the word TODO not glued to letters, digits
  or an underscore, or an HTML comment starts with that word in any case (with
  or without a colon, on one or several lines), the renderer SHALL replace the
  word by a green TODO chip titled TODO and leave the rest of the sentence
  unchanged, and leave the word TODO plain in inline code, a fenced code block,
  link text, a URL and math.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/commentMarkers.ts
tested_in_files:
- test/core/render/commentMarkers.test.ts
---

## TODO words and TODO comments show as green chips

### Normative behavior

When a paragraph holds the word TODO not glued to letters, digits or an underscore, or an HTML comment starts with that word in any case (with or without a colon, on one or several lines), the renderer SHALL replace the word by a green TODO chip titled TODO and leave the rest of the sentence unchanged, and leave the word TODO plain in inline code, a fenced code block, link text, a URL and math.

### Scenario (nominal): Word in a sentence

- GIVEN the text "We still TODO this part, TODOs and todo stay plain."
- WHEN the document is rendered
- THEN one green chip replaces the first TODO and the text content of the sentence is unchanged

### Scenario (boundary): Glued or lower case

- GIVEN the words TODOs and todo
- WHEN the document is rendered
- THEN they stay plain text

### Scenario (refusal): TODO in code, links and URLs

| Input | Outcome |
| --- | --- |
| TODO in backticks | No chip is written |
| TODO in a link text | No chip is written |
| TODO in a URL | No chip is written |
| TODO in a fenced block | No chip is written |
| TODO between dollar signs (math) | No chip is written |

### Scenario (nominal): TODO comment

- GIVEN the comment "`<!-- TODO: finish the chapter -->`" or "`<!-- todo finish the chapter -->`"
- WHEN the document is rendered
- THEN a wrapper of kind todo holds a green chip reading TODO with the title "TODO: finish the chapter" and a hidden body with the comment text

### Scenario (boundary): Comment word glued to letters

- GIVEN a comment starting with TODOS
- WHEN the document is rendered
- THEN it is a gray comment chip

### Verification notes

- Method: test/core/render/commentMarkers.test.ts: `the word TODO in prose becomes a green chip and the rest of the sentence is unchanged` (word in a sentence; glued or lower case); `TODO in code, inline code, link text and URLs is left alone` (TODO in code, links, URLs and math); `a TODO comment is a green expandable chip` (TODO comment; the glued comment case is untested).
- Method: test/integration/realInput/frontmatterFields.ts (one TODO chip is counted in a paragraph).
- Criteria: One chip with the class okf-chip--todo exists and the paragraph text is unchanged; the document holds no chip for TODO in code, links and URLs; the wrapper has data-okf-comment-kind todo and the chip has the class okf-chip--todo.
