---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-011
uuid: 35ffdc89-f8ce-46f6-96bc-0397713d2106
title: Version admonitions show their version title
description: 'When a document holds `{versionadded}`, `{versionchanged}` or `{deprecated}`,
  the extension SHALL render an admonition titled Added in version X:, Changed in
  version X: or Deprecated since version X: followed by the body.'
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Version admonitions show their version title

### Normative behavior

When a document holds `{versionadded}`, `{versionchanged}` or `{deprecated}`, the extension SHALL render an admonition titled Added in version X:, Changed in version X: or Deprecated since version X: followed by the body.

### Scenario: Nominal

- GIVEN `{versionadded} 2.1` with a body
- WHEN the preview renders
- THEN the panel title reads Added in version 2.1: and the body follows

### Scenario: Boundary or refusal

- GIVEN `{deprecated}` and `{versionchanged}` with versions
- WHEN the preview renders
- THEN titles read Deprecated since version and Changed in version with the given version

### Verification notes

- Method: test
- Criteria: Three directives, three titles.
