---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-045
uuid: 959cd84e-23e8-4247-898a-5d006922f1a9
title: Expand alerts in included files and context tags
description: When a GitHub alert sits in an included file or a grouped context
  tag, the extension SHALL expand it as in the host document.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-012; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-012
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

- Method: Unit test "a GitHub alert in an included file or in a grouped context tag renders as a note panel" in test/core/render/renderReq.renderingCore.requirements.test.ts
- Criteria: Alerts render in these two contexts as at top level.
