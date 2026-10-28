---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-012
uuid: ed79bfa4-41a0-4fea-bc9f-b1b85ab1de33
title: Alert markers inside fences stay literal
description: When an alert marker appears inside a fenced code block, the
  extension SHALL keep it as literal code.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-009; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-009
default_owner_email: gaetan@xeberon.net
---

## Alert markers inside fences stay literal

### Normative behavior

When an alert marker appears inside a fenced code block, the extension SHALL keep it as literal code.

### Scenario: Marker inside a fence

- GIVEN '> [!NOTE]' within a fenced code block
- WHEN the preview is rendered
- THEN the marker stays literal code and no admonition is produced

### Scenario: Fence closes before an alert

- GIVEN a fenced block followed by a real alert
- WHEN the preview is rendered
- THEN the fence content is literal and the alert after it is an admonition

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: No admonition inside a fence; alerts outside are unaffected.
