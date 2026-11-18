---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-001
uuid: 04e0c14a-7c6b-46b8-ba68-bc39a96757d3
title: Fenced code in a supported language is highlighted, other code stays
  literal
description: When a document contains a fenced code block, the extension SHALL
  highlight a block in a supported language with the grammar selected from the
  fence label, and leave a block of an unknown or absent language, inline code
  and the text of every code block as literal text, each special character shown
  once.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- scripts/page-bundle.mjs
- src/core/render/highlight.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/build/bundleSplit.test.ts
- test/core/preview/codeBlockStyles.test.ts
- test/core/render/contentCaches.test.ts
- test/core/render/highlight.test.ts
- test/core/render/renderReq.codeBlocks.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-002
- SwRS-MDOKFSTUDIO-CODE-003
- SwRS-MDOKFSTUDIO-CODE-004
- SwRS-MDOKFSTUDIO-CODE-005
- SwRS-MDOKFSTUDIO-CODE-030
- SwRS-MDOKFSTUDIO-CODE-031
- SwRS-MDOKFSTUDIO-CODE-037
---

## Fenced code in a supported language is highlighted, other code stays literal

### Normative behavior

When a document contains a fenced code block, the extension SHALL highlight a block in a supported language with the grammar selected from the fence label, and leave a block of an unknown or absent language, inline code and the text of every code block as literal text, each special character shown once.

### Scenario (nominal): A supported language is highlighted by its grammar

- GIVEN a document with a fenced `rust` block and a `python` block
- WHEN the preview renders the document
- THEN the keywords, strings, numbers and comments of each block are split into token spans by the Shiki TextMate grammar of its language, and the block gets the `shiki` class; the colours of the tokens are those of SwRS-MDOKFSTUDIO-CODE-040

### Scenario (boundary): The fence label selects the grammar

| Fence label | Outcome |
| --- | --- |
| `py` (also the aliases `js`, `sh`, `rs` and `patch`) | The block is coloured with the grammar the alias names (`py`: the Python grammar) |
| `Python {linenos}` | The leading word, lower-cased, selects the Python grammar; the text after a space, a comma or `{` is ignored |
| `, python` | The leading word is empty: no grammar is selected and the block stays plain |
| `wobble` (an unlisted label) | The block stays plain text |
| `yaml`, `bash`, `json`, `sql`, `toml`, `c`, `cpp`, `go`, `java`, `html`, `css`, `diff`, `markdown`, `dockerfile` and the other bundled languages | The block is coloured by its grammar |
| `python` block with no content | An empty highlighted block is shown without error |

### Scenario (refusal): Unknown or absent language leaves the block as plain text

- GIVEN a block fenced as `wobblescript`, and a block with no language label
- WHEN the preview renders them
- THEN each block is plain monospace text with no token spans, its text is unchanged and no `shiki` class is added; a block of two or more lines is still wrapped into numbered lines (SwRS-MDOKFSTUDIO-CODE-039)

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

### Scenario (nominal): Special characters are shown once

- GIVEN a highlighted block containing `a < b && c` and `&#60;`
- WHEN the preview renders it
- THEN the page shows `a < b && c` and `<` exactly once each, with no double escaping

### Scenario (boundary): An unknown named reference is kept as written

- GIVEN a highlighted block containing an unknown named reference such as `&bogus;`
- WHEN the preview renders it
- THEN the text is shown as written, not altered

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-008: marks the lines of `diff` and `patch` blocks
- SwRS-MDOKFSTUDIO-CODE-039: numbers and emphasizes the lines of a block
- SwRS-MDOKFSTUDIO-CODE-040: sets the token colours

### Verification notes

- Method: test/core/render/highlight.test.ts (tokens of each bundled language, alias `py`, unknown language left unchanged, plain output equals the input block, special characters shown once, unknown named reference)
- Method: test/core/render/renderReq.codeBlocks.requirements.test.ts (label case and leading word, inline code not highlighted, literal fence text, shorter backtick line, failing grammar fallback with a throwing grammar stub, special characters shown once)
- Method: test/visual/scenarioDefinitions1.ts (highlighting family, unknown-language scenario, source-fragment scenarios)
- Internal (cache): a block that did not change is not highlighted again; the unchanged block gets the same markup without a new grammar run, the edited block is highlighted again, and the memory kept for this is bounded (400 blocks, about 4 million characters): test/core/render/contentCaches.test.ts.
- Internal (bundle): Shiki and its grammars are a separate file, `lazy/highlight.js`, read on the first code block, and `extension.js` holds no grammar: test/build/bundleSplit.test.ts (the split bundle highlights a block).
- Criteria: token spans exist for each token class of the supported grammars; an empty block yields an empty block; an unlisted label, an empty leading word and an absent label yield none and no `shiki` class; only pre/code pairs are processed; rendered code text equals the source text; no `&amp;amp;` appears in the output; the fallback output is escaped wrapped text for wrapped blocks and the original block otherwise

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-002](SwRS-MDOKFSTUDIO-CODE-002.md): Resolve common fence labels to a supported grammar
  - [SwRS-MDOKFSTUDIO-CODE-003](SwRS-MDOKFSTUDIO-CODE-003.md): Read the fence label case-insensitively up to its first separator
  - [SwRS-MDOKFSTUDIO-CODE-004](SwRS-MDOKFSTUDIO-CODE-004.md): Leave unknown-language code as plain text
  - [SwRS-MDOKFSTUDIO-CODE-005](SwRS-MDOKFSTUDIO-CODE-005.md): Numbered, emphasized and diff blocks are wrapped into lines
  - [SwRS-MDOKFSTUDIO-CODE-030](SwRS-MDOKFSTUDIO-CODE-030.md): Never highlight inline code
  - [SwRS-MDOKFSTUDIO-CODE-031](SwRS-MDOKFSTUDIO-CODE-031.md): Show fenced code text literally
  - [SwRS-MDOKFSTUDIO-CODE-037](SwRS-MDOKFSTUDIO-CODE-037.md): Fall back to escaped text lines when a grammar fails
<!-- okf:links:end -->
