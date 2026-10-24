---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-078
uuid: 6377a8d6-80cb-450b-aaaa-3d8bcdb1c131
title: Extension warnings appear in the Problems view
description: When a live preview shows a document with extension warnings in a
  trusted workspace, the extension SHALL publish them to the Problems view as
  whole-line warnings from Markdown OKF-Schema Studio with code myst-extension,
  the line clamped to the document length.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Extension warnings appear in the Problems view

### Normative behavior

When a live preview shows a document with extension warnings in a trusted workspace, the extension SHALL publish them to the Problems view as whole-line warnings from Markdown OKF-Schema Studio with code myst-extension, the line clamped to the document length.

### Scenario: Nominal

- GIVEN a trusted workspace and a warning on line 3
- WHEN the preview renders
- THEN a Problems entry and an underline appear on line 3

### Scenario: Boundary or refusal

- GIVEN a warning line beyond the document length
- WHEN it is published
- THEN the line is clamped

### Verification notes

- Method: test
- Criteria: Entries are tied to a live preview.
