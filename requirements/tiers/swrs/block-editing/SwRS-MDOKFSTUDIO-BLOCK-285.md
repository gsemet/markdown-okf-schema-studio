---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-285
uuid: 87145257-165e-4250-8f0f-c027956184e4
title: A definition, an HTML block or a footnote cut by an edge is balanced
description: When the balance-edges setting is on and a selection starts or ends
  inside a definition, a raw HTML block or a footnote definition it does not
  entirely contain, the raw copy SHALL add the term line and the definition
  marker, the opening tag line or the matching closing tag, or the footnote
  label, and when both edges lie inside one of them it SHALL copy the text
  between the edges alone.
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
  title: both edges inside one element
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
default_owner_email: gaetan@xeberon.net
---

## A definition, an HTML block or a footnote cut by an edge is balanced

### Normative behavior

When the balance-edges setting is on and a selection starts or ends inside a definition, a raw HTML block or a footnote definition it does not entirely contain, the raw copy SHALL add the term line and the definition marker, the opening tag line or the matching closing tag, or the footnote label, and when both edges lie inside one of them it SHALL copy the text between the edges alone.

### Scenario S1: setting off

- GIVEN the setting is off and a definition list
- WHEN the selection starts inside a definition
- THEN the copy is the source verbatim

### Scenario S2: both edges inside one element

- GIVEN the setting is on and both edges lie inside one definition, HTML block or footnote
- WHEN the reader copies
- THEN the clipboard holds the text between the edges

### Scenario S3: boundary crossed at the start

- GIVEN the setting is on
- WHEN the selection starts inside a definition, an HTML block or a footnote definition and ends after it
- THEN the term line and marker, the opening tag line or the footnote label are added

### Scenario S4: boundary crossed at the end

- GIVEN the setting is on
- WHEN the selection starts before an HTML block and ends inside it
- THEN the matching closing tag is added

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages and on placed edges
- Criteria: the added lines match the source

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
