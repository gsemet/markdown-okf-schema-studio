---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-015
uuid: f7a7bc8b-6e81-4210-8900-db6ff35df630
title: Invalid Mermaid syntax shows one message with the parser reason
description: When Mermaid cannot draw a diagram, the page SHALL insert at the
  top of the diagram element the message "Unable to render Mermaid diagram. Its
  source remains available below." followed by a collapsed "Show the parser
  error" section holding the parser's reason as plain text, and SHALL set
  data-render-state to error.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Invalid Mermaid syntax shows one message with the parser reason

### Normative behavior

When Mermaid cannot draw a diagram, the page SHALL insert at the top of the diagram element the message "Unable to render Mermaid diagram. Its source remains available below." followed by a collapsed "Show the parser error" section holding the parser's reason as plain text, and SHALL set data-render-state to error.

### Scenario: Syntax error

- GIVEN a Mermaid diagram with invalid syntax
- WHEN the page draws it
- THEN the diagram element starts with the message, then a closed details element titled "Show the parser error" holding the reason, and data-render-state is error; the "Diagram source" disclosure still holds the source

### Scenario: Reason with markup

- GIVEN a parser reason that contains HTML text such as an image tag with an onerror handler
- WHEN the page shows the error
- THEN the reason is displayed as text, no element is created from it and the details element stays closed

### Known issues

- Known issue: The diagram text also stays inside the diagram element under the message, so the source shows once there and once in the disclosure.
- Known issue: A failed Mermaid diagram posts no diagnostic to the status line or the Problems list because the drawing happens in the page.
- Known issue: The message uses the theme error colour --studio-errorForeground with the fallback #f14c4c.

### Verification notes

- Method: Unit tests of the error element; visual scenarios diagrams v08 and v09 (error assertions).
- Criteria: Message, closed details and plain-text reason are present; no markup is created from the reason.
