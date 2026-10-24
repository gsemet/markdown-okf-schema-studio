---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-083
uuid: 0856f288-e093-48e3-8080-26948a720fe8
title: Open Problems opens the Problems view
description: When the reader activates Open Problems on the banner, the
  extension SHALL open the host's Problems view, also for read-only and
  untrusted previews.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Open Problems opens the Problems view

### Normative behavior

When the reader activates Open Problems on the banner, the extension SHALL open the host's Problems view, also for read-only and untrusted previews.

### Scenario: Nominal

- GIVEN a trusted preview
- WHEN the button is activated
- THEN the Problems view opens

### Scenario: Boundary or refusal

- GIVEN a read-only or untrusted preview
- WHEN the button is activated
- THEN the request is allowed since it edits nothing

### Verification notes

- Method: test
- Criteria: The message carries only the envelope and passes the document gate.
