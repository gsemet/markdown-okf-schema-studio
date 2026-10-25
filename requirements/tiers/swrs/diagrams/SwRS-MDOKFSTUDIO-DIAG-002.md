---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-002
uuid: 20cd8979-d677-493a-a123-278be04b053d
title: The Mermaid renderer loads only when a Mermaid figure exists
description: "When the rendered content contains a Mermaid figure, the extension SHALL
  add the Mermaid renderer script from its bundle to the page with the page's script
  nonce, and adds no Mermaid script when the content has none."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-001
---

## The Mermaid renderer loads only when a Mermaid figure exists

### Normative behavior

When the rendered content contains a Mermaid figure, the extension SHALL add the Mermaid renderer script from its bundle to the page with the page's script nonce, and adds no Mermaid script when the content has none.

### Scenario: Figure present

- GIVEN rendered content that contains a figure of class myst-mermaid-figure
- WHEN the preview page HTML is built
- THEN the page holds one script tag with the page nonce, the bundle URL of mermaidPreview.js and the attribute data-sphinx-preview-mermaid

### Scenario: No figure

- GIVEN rendered content with a PlantUML figure but no Mermaid figure
- WHEN the preview page HTML is built
- THEN the page holds no Mermaid script tag

### Known issues

- Known issue: Appearing or disappearing Mermaid changes the shell key, so the whole page reloads instead of being patched in place.
- Known issue: No test asserts that the Content Security Policy lets the Mermaid bundle run; only a real VS Code run would show such a regression.

### Verification notes

- Method: Unit test on the page shell and the shell key; integration test that the script tag and the bundle folder resource root exist.
- Criteria: The script tag appears only with a Mermaid figure; the shell key changes when Mermaid appears or disappears.
