---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-016
uuid: ad70ad13-36b5-4b1c-b1d1-49c5feaf7765
title: Context tags group inside containers and split raw HTML blocks
description: When a context tag pair sits inside a block quote, list item,
  definition list or directive container, or forms a raw HTML block kept whole
  by the parser, the extension SHALL group it as a panel and parse its Markdown.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-013; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-013
default_owner_email: gaetan@xeberon.net
---

## Context tags group inside containers and split raw HTML blocks

### Normative behavior

When a context tag pair sits inside a block quote, list item, definition list or directive container, or forms a raw HTML block kept whole by the parser, the extension SHALL group it as a panel and parse its Markdown.

### Scenario: Nominal

- GIVEN a context tag pair inside a list item
- WHEN the preview renders
- THEN the panel appears inside the list item

### Scenario: Boundary or refusal

- GIVEN a raw HTML block with tags and Markdown without blank lines holding a GitHub alert
- WHEN the preview renders
- THEN the block is split and the alert is rendered

### Verification notes

- Method: Visual scenario `context-tags-${theme}-wide` in test/visual/scenarioDefinitions1.ts
- Criteria: Grouping works in all listed containers.
