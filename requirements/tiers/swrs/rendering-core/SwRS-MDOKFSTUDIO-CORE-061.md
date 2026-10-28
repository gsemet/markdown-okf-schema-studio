---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-061
uuid: 6cbbd657-7e9d-4513-87b8-06aaf36b0543
title: Render version admonitions
description: When a document holds `{versionadded}`, `{versionchanged}` or
  `{deprecated}`, the extension SHALL render an admonition titled "Added in
  version X", "Changed in version X" or "Deprecated since version X" with its
  Markdown body parsed.
project: markdown-okf-schema-studio
scope: rendering-core
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
superseded_by: SwRS-MDOKFSTUDIO-MYST-001
default_owner_email: gaetan@xeberon.net
---

## Render version admonitions

### Normative behavior

When a document holds `{versionadded}`, `{versionchanged}` or `{deprecated}`, the extension SHALL render an admonition titled "Added in version X", "Changed in version X" or "Deprecated since version X" with its Markdown body parsed.

### Scenario: Nominal render version admonitions

- GIVEN `{versionadded} 1.2`
- WHEN it is rendered
- THEN the title is "Added in version 1.2"

### Scenario: Boundary or refusal of render version admonitions

- GIVEN a body with emphasis
- WHEN it is rendered
- THEN the emphasis is rendered

### Verification notes

- Method: Unit test "Sphinx version admonitions render generated titles and Markdown bodies" in test/core/render/mystFeatures.test.ts
- Criteria: Title text and parsed body match.
