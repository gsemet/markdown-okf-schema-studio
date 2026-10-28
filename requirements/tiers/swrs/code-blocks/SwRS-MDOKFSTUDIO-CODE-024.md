---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-024
uuid: 878def15-a721-4234-a3b1-034668ed9bdf
title: Hide the copy button when a content patch updates the page
description: When a content patch updates the preview in place, the extension
  SHALL hide the copy button.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-017; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-017
default_owner_email: gaetan@xeberon.net
---

## Hide the copy button when a content patch updates the page

### Normative behavior

When a content patch updates the preview in place, the extension SHALL hide the copy button.

### Scenario: nominal behavior

- GIVEN the copy button is shown
- WHEN a content patch is applied
- THEN the button is hidden

### Scenario: boundary or refusal behavior

- GIVEN no button is shown
- WHEN a content patch is applied
- THEN nothing changes and no error occurs

### Verification notes

- Method: Unit test of the patch path.
- Criteria: Hide is called once per applied patch.
