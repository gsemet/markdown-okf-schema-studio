---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-045
uuid: 959cd84e-23e8-4247-898a-5d006922f1a9
title: Expand alerts in included files and context tags
description: When a GitHub alert sits in an included file or a grouped context
  tag, the extension SHALL expand it as in the host document.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-002
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Expand alerts in included files and context tags

### Normative behavior

When a GitHub alert sits in an included file or a grouped context tag, the extension SHALL expand it as in the host document.

### Scenario: Nominal expand alerts in included files and context tags

- GIVEN an included file with a `> [!NOTE]` alert
- WHEN it is rendered
- THEN the alert renders as a note panel

### Scenario: Boundary or refusal of expand alerts in included files and context tags

- GIVEN an alert in a grouped context tag
- WHEN it is rendered
- THEN the alert renders as a note panel

### Verification notes

- Method: test
- Criteria: Alerts render in these two contexts as at top level.
