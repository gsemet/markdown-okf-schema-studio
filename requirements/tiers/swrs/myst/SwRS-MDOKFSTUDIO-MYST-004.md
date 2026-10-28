---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-004
uuid: 373ffcb8-9475-436a-a871-5be4bc22290e
title: Custom admonitions show their written title and class colour
description: When a document holds an `{admonition}` directive with a title
  argument, the extension SHALL show the title as written with inline Markdown
  rendered and colour the panel by its `:class:` kind.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-001
default_owner_email: gaetan@xeberon.net
---

## Custom admonitions show their written title and class colour

### Normative behavior

When a document holds an `{admonition}` directive with a title argument, the extension SHALL show the title as written with inline Markdown rendered and colour the panel by its `:class:` kind.

### Scenario: Nominal

- GIVEN `{admonition} A *plain* title` with `:class: tip`
- WHEN the preview renders
- THEN the title shows emphasised text and the panel has the tip colour

### Scenario: Boundary or refusal

- GIVEN an `{admonition}` without a `:class:` option
- WHEN the preview renders
- THEN the panel keeps the neutral accent

### Verification notes

- Method: Unit test "custom admonition titles preserve inline Markdown and their class" in test/core/render/mystFeatures.test.ts
- Criteria: Title inline Markdown is rendered; the class selects the accent; no class gives the neutral accent.
