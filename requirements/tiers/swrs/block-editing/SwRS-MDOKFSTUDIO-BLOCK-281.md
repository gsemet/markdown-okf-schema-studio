---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-281
uuid: d906d86a-5f9b-429f-ae88-bfd4a41dd1ec
title: A code block cut by an edge is balanced with its fences
description: When the balance-edges setting is on, the raw copy SHALL copy only
  the code text, with the indentation and prefixes of its containers removed,
  when both edges lie inside one code block, and SHALL add the code fence's
  opening line or closing line when the selection starts or ends inside the code
  block and leaves it.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
scenarios:
- id: S1
  title: setting off
- id: S2
  title: both edges inside one code block
- id: S3
  title: boundary crossed at the start
- id: S4
  title: boundary crossed at the end
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopyBalance.ts
tested_in_files:
- test/core/mapping/rawCopyBalanceBlocks.test.ts
- test/visual/capture_raw_copy_balanced.py
default_owner_email: gaetan@xeberon.net
---

## A code block cut by an edge is balanced with its fences

### Normative behavior

When the balance-edges setting is on, the raw copy SHALL copy only the code text, with the indentation and prefixes of its containers removed, when both edges lie inside one code block, and SHALL add the code fence's opening line or closing line when the selection starts or ends inside the code block and leaves it.

### Scenario S1: setting off

- GIVEN the setting is off and a fenced code block
- WHEN the selection starts inside the code and ends after the block
- THEN the copy is the source verbatim

### Scenario S2: both edges inside one code block

- GIVEN the setting is on and the code block lies in a list item
- WHEN the reader copies from one code line to another
- THEN the clipboard holds the code text with the container indentation removed

### Scenario S3: boundary crossed at the start

- GIVEN the setting is on
- WHEN the selection starts inside the code block and ends after it
- THEN the opening fence line is added

### Scenario S4: boundary crossed at the end

- GIVEN the setting is on
- WHEN the selection starts before the code block and ends inside it
- THEN the closing fence line is added

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages
- Criteria: the code is copied alone when both edges lie inside, and fenced when it is cut

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
