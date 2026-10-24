---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-031
uuid: 6fab5721-e6ce-402c-b04b-7e09350e2136
title: Figures render with image, caption and label
description: When a document holds a `{figure}` directive with colon or backtick
  fences, the extension SHALL render a figure with its image, `:alt:`, caption,
  `:name:` as id, mapped as one block from opening line to closing fence.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Figures render with image, caption and label

### Normative behavior

When a document holds a `{figure}` directive with colon or backtick fences, the extension SHALL render a figure with its image, `:alt:`, caption, `:name:` as id, mapped as one block from opening line to closing fence.

### Scenario: Nominal

- GIVEN a `{figure}` with alt, name and a caption body
- WHEN the preview renders
- THEN the figure shows image, alt, caption and id

### Scenario: Boundary or refusal

- GIVEN the same figure with backtick fences
- WHEN the preview renders
- THEN it maps from opening to closing fence as one block

### Verification notes

- Method: test
- Criteria: Both fence forms render alike.
