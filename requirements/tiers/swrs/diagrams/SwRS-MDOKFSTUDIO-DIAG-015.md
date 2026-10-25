---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-015
uuid: f7a7bc8b-6e81-4210-8900-db6ff35df630
title: "Invalid Mermaid shows one message with the parser reason"
description: "When Mermaid cannot draw a diagram, the page SHALL show at the top of
  the diagram element exactly one message \"Unable to render Mermaid diagram. Its
  source remains available below.\" followed by one collapsed \"Show the parser error\"\
  \ section holding the parser's reason as plain text, and set data-render-state to
  error."
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
implemented_in_files:
- src/page/modules/mermaidError.ts
tested_in_files:
- test/page/modules/mermaidError.test.ts
- test/visual/scenarioDefinitions2.ts
---

## Invalid Mermaid shows one message with the parser reason

### Normative behavior

When Mermaid cannot draw a diagram, the page SHALL show at the top of the diagram element exactly one message "Unable to render Mermaid diagram. Its source remains available below." followed by one collapsed "Show the parser error" section holding the parser's reason as plain text, and set data-render-state to error.

### Scenario (nominal): Syntax error

- GIVEN a Mermaid diagram with invalid syntax
- WHEN the page draws it
- THEN the diagram element starts with the message "Unable to render Mermaid diagram. Its source remains available below.", then a closed details element titled "Show the parser error" holding the reason, and data-render-state is error; the "Diagram source" disclosure still holds the source

### Scenario (boundary): Reason with markup

- GIVEN a parser reason that contains HTML text such as an image tag with an onerror handler
- WHEN the page shows the error
- THEN the reason is displayed as text, no element is created from it and the details element stays closed

### Scenario (boundary): Theme switches redraw the error

- GIVEN an invalid Mermaid diagram
- WHEN the theme changes through dark, white, cream and the original mode
- THEN after each change the diagram holds one error message and one details section

### Scenario (boundary): Changing reason

- GIVEN an error shown for line 2 and a new error for line 3
- WHEN the page shows the second error
- THEN the earlier error is replaced and the details section holds only the line 3 reason

### Known issues

- Known issue: The diagram text also stays inside the diagram element under the message, so the source shows once there and once in the disclosure.
- Known issue: A failed Mermaid diagram posts no diagnostic to the status line or the Problems list because the drawing happens in the page.
- Known issue: The message uses the theme error colour --studio-errorForeground with the fallback #f14c4c.
- Known issue: The visual check sets the render state to pending before each theme change to force a redraw.

### Verification notes

- Method: test/page/modules/mermaidError.test.ts (syntax error, reason with markup, changing reason: error element, closed details, plain-text reason, one error element and one details section)
- Method: test/visual/scenarioDefinitions2.ts (visual scenarios diagrams v08 and v09: error assertions and the theme switch check)
- Criteria: Message, closed details and plain-text reason are present; no markup is created from the reason; never more than one error element and one details section per diagram.
