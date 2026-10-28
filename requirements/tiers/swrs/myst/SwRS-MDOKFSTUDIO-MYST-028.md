---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-028
uuid: bdf7cb0c-5df6-4289-81be-e80c868ca165
title: Sphinx-style math delimiters are typeset
description: When the rendered page holds `\(x^2\)` in a math span or `\[...\]`
  in a math block, the extension SHALL typeset it, leave `$...$` outside math
  nodes and code alone, and change nothing when typesetting twice.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-024
default_owner_email: gaetan@xeberon.net
---

## Sphinx-style math delimiters are typeset

### Normative behavior

When the rendered page holds `\(x^2\)` in a math span or `\[...\]` in a math block, the extension SHALL typeset it, leave `$...$` outside math nodes and code alone, and change nothing when typesetting twice.

### Scenario: Nominal

- GIVEN a math span `\(x^2\)` and a math block `\[...\]`
- WHEN the preview renders
- THEN both are typeset

### Scenario: Boundary or refusal

- GIVEN plain text with `$...$` outside math nodes, or code, and a second typesetting pass
- WHEN the preview renders
- THEN text and code are unchanged and the second pass changes nothing

### Verification notes

- Method: Unit test "supports Sphinx math delimiters and leaves ordinary text and code alone" in test/core/render/mathRenderer.test.ts
- Criteria: Typesetting is idempotent.
