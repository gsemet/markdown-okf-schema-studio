---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-020
uuid: 63b34ca7-060b-4e70-8fb9-c5811e79565e
title: Unresolved citations show as muted keys
description: 'When a document uses `{cite}`, the extension SHALL show each key as
  muted `[key]` with the tooltip Unresolved citation: key and list no warning.'
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-022
default_owner_email: gaetan@xeberon.net
---

## Unresolved citations show as muted keys

### Normative behavior

When a document uses `{cite}`, the extension SHALL show each key as muted `[key]` with the tooltip Unresolved citation: key and list no warning.

### Scenario: Nominal

- GIVEN `{cite}`smith2020``
- WHEN the preview renders
- THEN `[smith2020]` shows in muted text with the tooltip Unresolved citation: smith2020

### Scenario: Boundary or refusal

- GIVEN `{cite}`a,b,c`` in a paragraph, a list and an admonition
- WHEN the preview renders
- THEN the group stays in its paragraph with every key kept and no warning is listed

### Verification notes

- Method: Unit test "project-scoped roles and directives degrade to labelled placeholders" in test/core/render/mystFeatures.test.ts
- Criteria: The live preview has no bibliography, so every citation is unresolved.
