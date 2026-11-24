---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-284
uuid: be7f72c0-438e-456c-958f-ede4b2c3ac73
title: A heading cut by an edge keeps its marker or its underline
description: When the balance-edges setting is on, the raw copy SHALL begin with
  the heading marker of an ATX heading the selection starts inside, SHALL end
  with the underline line of a setext heading the selection ends inside, and
  SHALL copy the text between the edges alone when both edges lie in one
  heading.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopyBalance.ts
tested_in_files:
- test/core/mapping/rawCopyBalanceBlocks.test.ts
- test/core/mapping/rawCopyBalanceContainers.test.ts
- test/visual/capture_raw_copy_balanced.py
default_owner_email: gaetan@xeberon.net
---

## A heading cut by an edge keeps its marker or its underline

### Normative behavior

When the balance-edges setting is on, the raw copy SHALL begin with the heading marker of an ATX heading the selection starts inside, SHALL end with the underline line of a setext heading the selection ends inside, and SHALL copy the text between the edges alone when both edges lie in one heading.

### Scenario: setting off

- GIVEN the setting is off and `## Hello`
- WHEN the selection starts inside `Hello` and ends after the heading
- THEN the copy has no `##`

### Scenario: both edges in one heading

- GIVEN the setting is on
- WHEN the reader copies from `l` to `o` in `Hello`
- THEN the clipboard holds `llo`

### Scenario: boundary crossed at the start

- GIVEN the setting is on
- WHEN the selection starts inside an ATX heading and ends after it
- THEN `## ` is put before the text

### Scenario: boundary crossed at the end

- GIVEN the setting is on
- WHEN the selection starts before a setext heading and ends inside it
- THEN the underline line follows the text

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages
- Criteria: the marker or the underline is added when the heading is cut

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
