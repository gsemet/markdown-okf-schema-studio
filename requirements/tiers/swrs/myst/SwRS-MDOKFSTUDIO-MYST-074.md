---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-074
uuid: fd28d769-9da1-4d23-846f-6c029bc2c1d0
title: Detection ignores code, comments, roles and look-alikes
description: When syntax appears in fenced or indented code, inline code,
  comments or roles, or looks like but is not an extension syntax, the extension
  SHALL report nothing.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-072; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-072
---

## Detection ignores code, comments, roles and look-alikes

### Normative behavior

When syntax appears in fenced or indented code, inline code, comments or roles, or looks like but is not an extension syntax, the extension SHALL report nothing.

### Scenario: Nominal

- GIVEN `$x$` in a fenced block
- WHEN the document is checked
- THEN nothing is reported

### Scenario: Boundary or refusal

- GIVEN `{math}` role, a backtick-fence directive, braces, `{% %}` or `$ 5`
- WHEN the document is checked
- THEN none counts as dollarmath, colon_fence or substitution; a `$$` block with a leading begin align is amsmath-guarded

### Verification notes

- Method: Unit test "nothing is detected inside code fences or inline code" in test/core/render/mystSyntaxDetect.test.ts
- Criteria: Undocumented guards.
