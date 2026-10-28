---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-036
uuid: c5ba50ee-7caf-4af9-9702-6a94aeb77495
title: Style placeholders as inert
description: 'When the preview shows a placeholder for an unresolved directive, a
  citation, a notebook output or a bibliography, the extension SHALL style it as inert:
  muted text, a dashed box for a directive, a dotted underline and help cursor for
  a citation.'
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-022
default_owner_email: gaetan@xeberon.net
---

## Style placeholders as inert

### Normative behavior

When the preview shows a placeholder for an unresolved directive, a citation, a notebook output or a bibliography, the extension SHALL style it as inert: muted text, a dashed box for a directive, a dotted underline and help cursor for a citation.

### Scenario: Nominal style placeholders as inert

- GIVEN an unresolved directive
- WHEN it is shown
- THEN it has a dashed box and muted text

### Scenario: Boundary or refusal of style placeholders as inert

- GIVEN a citation
- WHEN it is shown
- THEN it has a dotted underline and a help cursor

### Verification notes

- Method: Unit test "MyST table alignment and notebook output placeholders are styled" in test/core/preview/previewStyles.test.ts
- Criteria: Placeholder classes carry the muted, dashed and dotted styles.
