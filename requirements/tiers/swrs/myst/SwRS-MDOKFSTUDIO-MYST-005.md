---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-005
uuid: 14aecfd1-5204-419e-82c2-cb6cf0aae0d6
title: Untitled admonitions take their title from a leading bold line or heading
description: When an admonition has no title argument and its body starts with a
  bold line or a heading, the extension SHALL use that line as the panel title
  and keep the rest as body.
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

## Untitled admonitions take their title from a leading bold line or heading

### Normative behavior

When an admonition has no title argument and its body starts with a bold line or a heading, the extension SHALL use that line as the panel title and keep the rest as body.

### Scenario: Nominal

- GIVEN an admonition without argument whose body starts with `**A bold title**`
- WHEN the preview renders
- THEN the panel title is A bold title and the remaining lines form the body

### Scenario: Boundary or refusal

- GIVEN an admonition without argument whose body starts with `### Title`
- WHEN the preview renders
- THEN the panel title is Title, shown as a title and not as a heading

### Verification notes

- Method: Unit test "a leading bold paragraph or heading supplies the MyST admonition title" in test/core/render/mystFeatures.test.ts
- Criteria: Both leading forms become the title; the rest stays body.
