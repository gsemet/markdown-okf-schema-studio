---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-007
uuid: cd67c9a8-4598-41bc-a81f-9e19c7e0e14e
title: A longer outer fence keeps inner fences as literal code
description: When an admonition uses a longer fence than an inner `markdown`
  fence or inner admonition, the extension SHALL keep the inner fence as literal
  code in the body.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-006
default_owner_email: gaetan@xeberon.net
---

## A longer outer fence keeps inner fences as literal code

### Normative behavior

When an admonition uses a longer fence than an inner `markdown` fence or inner admonition, the extension SHALL keep the inner fence as literal code in the body.

### Scenario: Nominal

- GIVEN a four-colon admonition holding a literal `markdown` code fence
- WHEN the preview renders
- THEN the inner fence shows as code inside the panel

### Scenario: Boundary or refusal

- GIVEN an outer fence not longer than the inner one
- WHEN the preview renders
- THEN the inner fence closes the outer one as Markdown defines

### Verification notes

- Method: Unit test "nested backtick and colon delimiters preserve their enclosing Markdown" in test/core/render/mystFeatures.test.ts
- Criteria: The fence length decides which fence closes the directive.
