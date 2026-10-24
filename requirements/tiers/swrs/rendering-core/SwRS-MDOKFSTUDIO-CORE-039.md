---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-039
uuid: 7d9483a2-d877-4e96-9fb4-fbe1ff2b6e5a
title: Wrap CJK text in the pane
description: When a paragraph holds Japanese, Chinese or Korean text, the
  extension SHALL wrap it inside the pane at 900 px and 460 px.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Wrap CJK text in the pane

### Normative behavior

When a paragraph holds Japanese, Chinese or Korean text, the extension SHALL wrap it inside the pane at 900 px and 460 px.

### Scenario: Nominal wrap CJK text in the pane

- GIVEN a Japanese paragraph at 900 px
- WHEN it is shown
- THEN it wraps inside the pane

### Scenario: Boundary or refusal of wrap CJK text in the pane

- GIVEN a Korean paragraph at 460 px
- WHEN it is shown
- THEN no horizontal scrolling appears

### Verification notes

- Method: test
- Criteria: CJK paragraphs stay within the pane width.
