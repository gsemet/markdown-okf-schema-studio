---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-280
uuid: 5a3fee6f-5225-4752-a73c-df265f1e404d
title: A container cut by an edge is balanced with its opening and closing lines
description: When the balance-edges setting is on and a selection starts or ends
  inside a fenced container, an alert, a blockquote or a tab item it does not
  entirely contain, the raw copy SHALL add that container's opening lines at the
  start or its closing line at the end, and when both edges lie inside one
  container it SHALL copy its content with the container's line prefix removed.
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
- src/core/mapping/rawCopyScan.ts
tested_in_files:
- test/core/mapping/rawCopyBalanceBlocks.test.ts
- test/core/mapping/rawCopyBalanceContainers.test.ts
- test/core/mapping/rawCopyBalanceNesting.test.ts
- test/visual/capture_raw_copy_balanced.py
- test/visual/rawCopyScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A container cut by an edge is balanced with its opening and closing lines

### Normative behavior

When the balance-edges setting is on and a selection starts or ends inside a fenced container, an alert, a blockquote or a tab item it does not entirely contain, the raw copy SHALL add that container's opening lines at the start or its closing line at the end, and when both edges lie inside one container it SHALL copy its content with the container's line prefix removed.

### Scenario: setting off

- GIVEN the setting is off and a note admonition holding two paragraphs
- WHEN the selection starts inside the admonition and ends after it
- THEN the copy is the source verbatim, with no opening line

### Scenario: both edges inside one container

- GIVEN the setting is on and both edges lie inside the same admonition, quote or alert
- WHEN the reader copies
- THEN the clipboard holds its content with the container's line prefix removed and no fence line added

### Scenario: boundary crossed at the start

- GIVEN the setting is on
- WHEN the selection starts inside a container and ends after it
- THEN the container's opening lines are added before the text

### Scenario: boundary crossed at the end

- GIVEN the setting is on
- WHEN the selection starts before a container and ends inside it
- THEN the container's closing line is added after the text

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages, nested and listed containers included; visual capture check
- Criteria: the opening and closing lines of every cut container are added, and nothing when both edges lie inside

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
