---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-005
uuid: e456ca49-8e8f-4f76-9600-dcd3a09c0a1a
title: Numbered, emphasized and diff blocks are wrapped into lines
description: When a numbered, emphasized or diff block is shown, the extension
  SHALL wrap it into lines also when its language is unknown, where the block
  keeps no highlight class, number the lines of a MyST code directive from its
  start value, emphasize the listed lines relative to it and show each special
  character once.
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
- src/core/render/mystNormalize.ts
tested_in_files:
- test/core/render/highlight.test.ts
- test/core/render/mystFeatures.test.ts
- test/core/render/renderReq.codeBlocks.requirements.test.ts
---

## Numbered, emphasized and diff blocks are wrapped into lines

### Normative behavior

When a numbered, emphasized or diff block is shown, the extension SHALL wrap it into lines also when its language is unknown, where the block keeps no highlight class, number the lines of a MyST code directive from its start value, emphasize the listed lines relative to it and show each special character once.

### Scenario (nominal): An unknown language is still wrapped into lines

- GIVEN a numbered block in an unknown language
- WHEN the preview renders it
- THEN each line is wrapped in its own line element and the block has no `hljs` class

### Scenario (boundary): A diff block keeps the highlight class

- GIVEN a diff block (diff is a registered grammar)
- WHEN the preview renders it
- THEN lines are wrapped and classified, and the block keeps the highlight class because diff is a registered grammar

### Scenario (nominal): A MyST code directive numbers and emphasizes lines

- GIVEN a `{code}`, `{code-block}` or `{code-cell}` with `:linenos:`, `:lineno-start: 10` and `:emphasize-lines: 2`
- WHEN the preview renders it
- THEN lines are numbered from 10 and the second line is emphasized

### Scenario (refusal): Invalid directive values fall back

- GIVEN a directive with `:lineno-start: abc` and `:emphasize-lines: 2,x`
- WHEN the preview renders it
- THEN numbering starts at 1 and the invalid emphasis entry is ignored

### Scenario (nominal): Special characters are shown once

- GIVEN a highlighted block containing `a < b && c` and `&#60;`
- WHEN the preview renders it
- THEN the page shows `a < b && c` and `<` exactly once each, with no double escaping

### Scenario (boundary): An unknown named reference is kept as written

- GIVEN a highlighted block containing an unknown named reference such as `&bogus;`
- WHEN the preview renders it
- THEN the text is shown as written, not altered

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-001: highlights fenced code and leaves other code literal
- SwRS-MDOKFSTUDIO-CODE-008: marks the lines of `diff` and `patch` blocks

### Verification notes

- Method: test/core/render/renderReq.codeBlocks.requirements.test.ts (unknown language wrapped without highlight class, diff keeps the highlight class)
- Method: test/core/render/highlight.test.ts (numbered and emphasized lines without broken multiline spans, special characters shown once, unknown named reference)
- Method: test/core/render/mystFeatures.test.ts (MyST directive numbering, start value, emphasis and invalid values)
- Criteria: line wrappers present; no highlight class for unknown languages; line numbers and emphasized lines match the options and invalid values fall back; no `&amp;amp;` appears in the output and the displayed text equals the source
