---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-042
uuid: 57ce26b9-dce4-4ad8-9979-df08bbea5988
title: Wrap long URLs in the column
description: When a paragraph holds a URL longer than the column, the extension
  SHALL wrap it inside the column without horizontal page overflow.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-034; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-034
---

## Wrap long URLs in the column

### Normative behavior

When a paragraph holds a URL longer than the column, the extension SHALL wrap it inside the column without horizontal page overflow.

### Scenario: Nominal wrap long URLs in the column

- GIVEN a 200-character URL link
- WHEN it is shown
- THEN it wraps inside the column

### Scenario: Boundary or refusal of wrap long URLs in the column

- GIVEN the pane narrowed to 460 px
- WHEN it is shown
- THEN the page has no horizontal overflow

### Verification notes

- Method: Unit test "K1: long words and bare URLs wrap inside text blocks, links and table cells" in test/core/preview/previewStyles.test.ts
- Criteria: Links are covered by the wrap rule.
