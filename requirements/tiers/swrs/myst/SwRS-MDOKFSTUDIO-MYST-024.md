---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-024
uuid: f1610295-fdd2-4a96-82c2-db8472ab9c8d
title: Maths is typeset by KaTeX in the preview
description: When a document holds `$...$`, `$$...$$`, the `{math}` role or
  directive, or an align-style environment inside `$$` or `{math}`, the
  extension SHALL typeset it as maths.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Maths is typeset by KaTeX in the preview

### Normative behavior

When a document holds `$...$`, `$$...$$`, the `{math}` role or directive, or an align-style environment inside `$$` or `{math}`, the extension SHALL typeset it as maths.

### Scenario: Nominal

- GIVEN `$x^2$` in a sentence
- WHEN the preview renders
- THEN inline math sits in the text line

### Scenario: Boundary or refusal

- GIVEN `$$ ... $$` and a `\begin{align}` block
- WHEN the preview renders
- THEN display math is typeset in its own block

### Verification notes

- Method: test
- Criteria: Typesetting runs on the host-rendered page.
