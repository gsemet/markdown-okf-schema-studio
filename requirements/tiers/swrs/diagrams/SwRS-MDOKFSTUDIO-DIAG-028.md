---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-028
uuid: 7d2238ab-bac1-418a-873f-d7b4f5c1e254
title: The built-in PlantUML script loads only when needed
description: "When the engine is the built-in one and the rendered content contains
  a PlantUML figure, the extension SHALL add the built-in engine script from its bundle
  to the page with the page's script nonce, and adds it in no other case."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-023
default_owner_email: gaetan@xeberon.net
---

## The built-in PlantUML script loads only when needed

### Normative behavior

When the engine is the built-in one and the rendered content contains a PlantUML figure, the extension SHALL add the built-in engine script from its bundle to the page with the page's script nonce, and adds it in no other case.

### Scenario: Built-in with figure

- GIVEN the built-in engine and content with a PlantUML figure
- WHEN the page HTML is built
- THEN the page holds one script tag with the page nonce, the bundle URL of plantumlPreview.js and the attribute data-sphinx-preview-plantuml

### Scenario: Other cases

- GIVEN the built-in engine without a PlantUML figure, or the JAR pipeline with one
- WHEN the page HTML is built
- THEN the page holds no built-in engine script

### Known issues

- Known issue: The engine runs under the unchanged Content Security Policy (no eval, no worker, no WebAssembly, no network); docs/preview-lifecycle.md notes harmless style-src-attr violations in the console.

### Verification notes

- Method: Unit test `the built-in PlantUML script is added once with the page nonce, only for the built-in engine and a figure` in `test/session/diagReq.webview.requirements.test.ts`.
- Criteria: The script tag follows the engine and the figure.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-023](SwRS-MDOKFSTUDIO-DIAG-023.md): PlantUML fences become centred inert pictures drawn by the built-in engine
<!-- okf:links:end -->
