---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-279
uuid: f3981b50-b5fa-45a4-aa2b-ee0addfbb744
title: An inline construct cut by an edge is balanced with its delimiters
description: When the balance-edges setting is on and a selection ends or starts
  inside an inline construct it does not entirely contain, the raw copy SHALL
  add that construct's missing opening or closing delimiter read from the
  source, and when both edges lie inside one construct it SHALL copy the text
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
  title: both edges inside one construct
- id: S3
  title: boundary crossed at the start
- id: S4
  title: boundary crossed at the end
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopyInline.ts
tested_in_files:
- test/core/mapping/rawCopyBalanceContainers.test.ts
- test/core/mapping/rawCopyBalanceInline.test.ts
- test/visual/capture_raw_copy_balanced.py
- test/visual/rawCopyScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## An inline construct cut by an edge is balanced with its delimiters

### Normative behavior

When the balance-edges setting is on and a selection ends or starts inside an inline construct it does not entirely contain, the raw copy SHALL add that construct's missing opening or closing delimiter read from the source, and when both edges lie inside one construct it SHALL copy the text between the edges alone.

### Scenario S1: setting off

- GIVEN the setting is off and `Hello **world** again`
- WHEN the reader selects from the `r` of `world` to the end of the line
- THEN the copy is `rld** again`

### Scenario S2: both edges inside one construct

- GIVEN the setting is on and both edges lie inside the bold `world`
- WHEN the reader copies
- THEN the clipboard holds the text between the edges, `orl`, with no delimiter

### Scenario S3: boundary crossed at the start

- GIVEN the setting is on
- WHEN the selection starts inside the bold `world` and ends after it
- THEN the opening `**` is added, read from the source

### Scenario S4: boundary crossed at the end

- GIVEN the setting is on
- WHEN the selection starts before the bold `world` and ends inside it
- THEN the closing `**` is added, read from the source

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages
- Criteria: each missing delimiter is added, and none when both edges lie inside the construct

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
