---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-043
uuid: 96ccce36-42ae-4604-bd4e-24629871802f
title: Find works in the preview
description: When the preview panel is created, the extension SHALL enable the
  find widget so that Cmd/Ctrl+F searches the rendered page.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
scenarios:
- id: S1
  title: Preview panel
- id: S2
  title: Custom editor preview
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/host/coreReq.requirements.test.ts
- test/integration/projectFeatures.test.ts
default_owner_email: gaetan@xeberon.net
---

## Find works in the preview

### Normative behavior

When the preview panel is created, the extension SHALL enable the find widget so that Cmd/Ctrl+F searches the rendered page.

### Scenario S1 (nominal): Preview panel
- GIVEN a preview panel
- WHEN it is created
- THEN its options enable find

### Scenario S2 (boundary): Custom editor preview
- GIVEN a custom editor preview
- WHEN it is created
- THEN find is enabled as well

### Verification notes
- Method: test/integration/projectFeatures.test.ts, suite run() (preview panel: the panel options set the find widget on)
- Method: test/host/coreReq.requirements.test.ts, test "the custom editor and the preview panel are created with the find widget enabled" (preview panel and custom editor preview, through the real activation on the fake host)
- Criteria: The panel options and the custom editor registration set the find widget on.
- Note: with the focus in the page, Cmd/Ctrl+F is taken by the extension's own find bar (SwRS-MDOKFSTUDIO-TOOLBAR-009); the widget option stays on for the entry points that do not go through the page.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
