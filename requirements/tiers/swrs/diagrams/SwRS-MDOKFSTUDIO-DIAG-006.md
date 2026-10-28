---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-006
uuid: b1b9598c-75b5-49f3-b1a2-384c04ddf6d9
title: "Mermaid diagrams are drawn again when the theme changes"
description: "When the data-sphinx-preview-theme-mode, data-sphinx-preview-theme,
  class or style attribute of the html element, or the class or style attribute of
  the body element, changes, the page SHALL check every Mermaid diagram and draw again
  each one whose theme colours differ from those it was drawn with, keeping the labels."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-005
default_owner_email: gaetan@xeberon.net
---

## Mermaid diagrams are drawn again when the theme changes

### Normative behavior

When the data-sphinx-preview-theme-mode, data-sphinx-preview-theme, class or style attribute of the html element, or the class or style attribute of the body element, changes, the page SHALL check every Mermaid diagram and draw again each one whose theme colours differ from those it was drawn with, keeping the labels.

### Scenario: Theme mode switch

- GIVEN a drawn Mermaid diagram on a dark preview
- WHEN the theme mode changes to white
- THEN the diagram is drawn again with the white theme colours and keeps its node labels

### Scenario: Same colours

- GIVEN a drawn Mermaid diagram
- WHEN an observed attribute changes and leaves the theme colours as they were
- THEN the diagram is not drawn again and keeps its picture

### Known issues

- Known issue: The redraw evidence covers dark, white and cream; the light mode relies on the same observer.

### Verification notes

- Method: Visual scenario diagrams v01 (theme switch check over dark, white, cream and the original mode).
- Criteria: Node fills follow the theme after each switch and the label count is unchanged.
