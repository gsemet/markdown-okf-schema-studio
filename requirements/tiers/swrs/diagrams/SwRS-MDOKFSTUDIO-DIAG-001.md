---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-001
uuid: d61c8d15-c492-4c29-a582-3c61cd95f0e8
title: "Mermaid fences and directives become diagram figures"
description: "When a document contains a mermaid fence or a {mermaid} directive, the
  extension SHALL render a figure whose diagram element is labelled \"Mermaid diagram\"\
  \ and holds the diagram text for the page to draw, with the same text in a collapsed
  \"Diagram source\" disclosure."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Mermaid fences and directives become diagram figures

### Normative behavior

When a document contains a mermaid fence or a {mermaid} directive, the extension SHALL render a figure whose diagram element is labelled "Mermaid diagram" and holds the diagram text for the page to draw, with the same text in a collapsed "Diagram source" disclosure.

### Scenario: Fence and directive

- GIVEN a document with a mermaid fence and a {mermaid} directive, each holding a flowchart
- WHEN the preview is rendered
- THEN two Mermaid figures appear, each with a diagram element labelled "Mermaid diagram" holding the flowchart text and a collapsed details element whose summary reads "Diagram source" and whose code block holds the same text

### Scenario: Empty diagram

- GIVEN a mermaid fence with no text
- WHEN the preview is rendered
- THEN a figure with an empty diagram element is still produced, the page draws nothing in it and shows no message

### Known issues

- Known issue: The page skips a Mermaid diagram whose text is empty and leaves it blank, with no diagnostic (no test covers it).

### Verification notes

- Method: Unit test on the rendered HTML; visual scenarios diagrams v01 to v03.
- Criteria: Both syntaxes give the same figure structure; an empty fence gives an empty diagram element.
