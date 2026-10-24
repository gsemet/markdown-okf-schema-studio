---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-028
uuid: 7d2238ab-bac1-418a-873f-d7b4f5c1e254
title: The built-in PlantUML script loads only when needed
description: When the engine is the built-in one and the rendered content
  contains a PlantUML figure, the extension SHALL add the built-in engine script
  from its bundle to the page with the page's script nonce, and SHALL add it in
  no other case.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The built-in PlantUML script loads only when needed

### Normative behavior

When the engine is the built-in one and the rendered content contains a PlantUML figure, the extension SHALL add the built-in engine script from its bundle to the page with the page's script nonce, and SHALL add it in no other case.

### Scenario: Built-in with figure

- GIVEN the built-in engine and content with a PlantUML figure
- WHEN the page HTML is built
- THEN the page holds one script tag with the page nonce, the bundle URL of plantumlPreview.js and the attribute data-sphinx-preview-plantuml

### Scenario: Other cases

- GIVEN the built-in engine without a PlantUML figure, or the JAR pipeline with one
- WHEN the page HTML is built
- THEN the page holds no built-in engine script

### Known issues

- Known issue: Untested: no test asserts the script tag, the host variant or the absence of a script without a figure.
- Known issue: The engine runs under the unchanged Content Security Policy (no eval, no worker, no WebAssembly, no network); docs/preview-lifecycle.md notes harmless style-src-attr violations in the console.

### Verification notes

- Method: Visual campaign only (the pictures exist); no unit test of the script tag.
- Criteria: The script tag follows the engine and the figure.
