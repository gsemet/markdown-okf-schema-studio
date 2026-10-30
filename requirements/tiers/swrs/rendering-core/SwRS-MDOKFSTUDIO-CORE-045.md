---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-045
uuid: 959cd84e-23e8-4247-898a-5d006922f1a9
title: Expand alerts in included files and context tags
description: When a GitHub alert sits in an included file or a grouped context
  tag, the extension SHALL expand it as in the host document.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
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
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-012
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-012](SwRS-MDOKFSTUDIO-CORE-012.md): An include is expanded in place and mapped to its directive
<!-- okf:links:end -->
