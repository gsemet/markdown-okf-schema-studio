---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-011
uuid: 6687c3d6-6998-46f5-a5f1-8d4a8901c70b
title: "A content patch draws only Mermaid diagrams not yet drawn"
description: "When the preview content is patched in place, the page SHALL draw the
  Mermaid diagrams that have no render state and SHALL leave the diagrams that have
  one untouched."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A content patch draws only Mermaid diagrams not yet drawn

### Normative behavior

When the preview content is patched in place, the page SHALL draw the Mermaid diagrams that have no render state and SHALL leave the diagrams that have one untouched.

### Scenario: New diagram

- GIVEN a patch that adds a Mermaid diagram while another is already drawn
- WHEN the page applies the patch and signals the replaced content
- THEN the new diagram is drawn and the earlier one is not rebuilt

### Scenario: Kept node

- GIVEN a drawn diagram that the keyed morph keeps through the patch
- WHEN the page applies the patch
- THEN the diagram keeps its render state and its picture

### Known issues

- Known issue: The listener in mermaidPreview.ts is covered only by the real VS Code scenario.

### Verification notes

- Method: Unit tests that page events reach the diagram renderers; real VS Code scenario RI-T34 in test/integration/realInput.test.ts (a Mermaid diagram is drawn again in the same frame).
- Criteria: Only diagrams without a render state are drawn after a patch.
