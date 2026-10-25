---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-001
uuid: 04e0c14a-7c6b-46b8-ba68-bc39a96757d3
title: Fenced code in a supported language is highlighted, other code stays
  literal
description: When a document contains a fenced code block, the extension SHALL
  colour the keywords, strings, numbers and comments of a block in a supported
  language with distinct token colours, select the grammar from the fence label,
  and leave a block of an unknown or absent language, inline code and the text
  of every code block as literal text.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/highlight.ts
tested_in_files:
- test/core/render/highlight.test.ts
- test/core/render/renderReq.codeBlocks.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
---

## Fenced code in a supported language is highlighted, other code stays literal

### Normative behavior

When a document contains a fenced code block, the extension SHALL colour the keywords, strings, numbers and comments of a block in a supported language with distinct token colours, select the grammar from the fence label, and leave a block of an unknown or absent language, inline code and the text of every code block as literal text.

### Scenario (nominal): Tokens of a supported language are coloured

- GIVEN a document with a fenced `rust` block and a `python` block
- WHEN the preview renders the document
- THEN keywords, strings, numbers and comments of each block get distinct token colours

### Scenario (boundary): The fence label selects the grammar

| Fence label | Outcome |
| --- | --- |
| `py` (also the aliases `js`, `sh`, `rs` and `patch`) | The block is coloured with the grammar the alias names (`py`: the Python grammar) |
| `Python {linenos}` | The leading word, lower-cased, selects the Python grammar; the text after a space, a comma or `{` is ignored |
| `, python` | The leading word is empty: no grammar is selected and the block stays plain |
| `wobble` (an unlisted label) | The block stays plain text |
| `python` block with no content | An empty highlighted block is shown without error |

### Scenario (refusal): Unknown or absent language leaves the block as plain text

- GIVEN a block fenced as `wobblescript`, and a block with no language label
- WHEN the preview renders them
- THEN each block is plain monospace text with no token spans, its text is unchanged and no `hljs` class is added

### Scenario (nominal): Inline code is never highlighted

- GIVEN a paragraph with inline `code` and a one-line fenced block
- WHEN the preview renders it
- THEN the inline code has no token spans and only the fenced block is highlighted

### Scenario (nominal): Fenced code text is shown literally

- GIVEN a `markdown` fence containing a table, a link and an inner fence under a longer outer fence
- WHEN the preview renders the document
- THEN the table, link and inner fence appear as literal text and no table or anchor element is created inside the block

### Scenario (boundary): A shorter backtick line does not close the fence

- GIVEN a fence whose content has a line of backticks shorter than the outer fence
- WHEN the preview renders the document
- THEN that line stays part of the code and does not close the block

### Scenario (refusal): A failing grammar falls back to escaped text lines

- GIVEN a numbered, emphasized or diff block whose grammar throws while highlighting
- WHEN the preview renders it
- THEN a block that is wrapped into lines shows the escaped source text in wrapped lines, and an unwrapped block is returned unchanged

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-005: wraps numbered, emphasized and diff blocks into lines
- SwRS-MDOKFSTUDIO-CODE-008: marks the lines of `diff` and `patch` blocks

### Verification notes

- Method: test/core/render/highlight.test.ts (tokens of a supported language, alias `py`, unknown language left unchanged, plain output equals the input block)
- Method: test/core/render/renderReq.codeBlocks.requirements.test.ts (label case and leading word, inline code not highlighted, literal fence text, shorter backtick line, failing grammar fallback with a throwing grammar stub)
- Method: test/visual/scenarioDefinitions1.ts (highlighting family, unknown-language scenario, source-fragment scenarios)
- Criteria: token spans exist for each token class of the supported grammars; an empty block yields an empty block; an unlisted label, an empty leading word and an absent label yield none and no `hljs` class; only pre/code pairs are processed; rendered code text equals the source text; the fallback output is escaped wrapped text for wrapped blocks and the original block otherwise
