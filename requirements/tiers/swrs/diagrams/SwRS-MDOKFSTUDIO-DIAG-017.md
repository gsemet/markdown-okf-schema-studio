---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-017
uuid: 309dea1a-1462-48cf-a653-8f69219c50c4
title: Mermaid inserts a starter flowchart
description: When a writer picks the Mermaid action of the edition palette or
  the Mermaid slash entry, the extension SHALL insert a fenced mermaid block
  with a top-down flowchart from a node labelled Start to a node labelled End,
  set apart from the text around it and placed after the selection, with the
  label Start selected.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Mermaid inserts a starter flowchart

### Normative behavior

When a writer picks the Mermaid action of the edition palette or the Mermaid slash entry, the extension SHALL insert a fenced mermaid block with a top-down flowchart from a node labelled Start to a node labelled End, set apart from the text around it and placed after the selection, with the label Start selected.

### Scenario: Insert after text

- GIVEN the caret at the end of a paragraph
- WHEN the writer picks Mermaid
- THEN a blank line and the fenced mermaid flowchart are inserted after the selection and the word Start is selected

### Scenario: Empty document

- GIVEN an empty document
- WHEN the writer picks Mermaid
- THEN the fence is inserted with no leading blank line and the word Start is selected

### Known issues

- Known issue: The palette and slash registry rows belong to palette-slash; this requirement owns the inserted content.

### Verification notes

- Method: Unit tests of the edit action and of the rendering of the inserted fence.
- Criteria: The inserted text renders as a Mermaid diagram figure.
