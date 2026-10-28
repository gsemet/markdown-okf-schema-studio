---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-004
uuid: 21e6a5b4-5733-4cda-b276-9ef2a53c2a31
title: Understand why a Mermaid diagram failed
description: When a Mermaid diagram has invalid syntax, the Studio SHALL show
  one visible message with the parser reason on demand and keep the source
  readable.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derives_from: []
user_need: As a writer, I see at once that my Mermaid diagram does not parse and
  why, without losing the source.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-DIAG-001
default_owner_email: gaetan@xeberon.net
---

## Understand why a Mermaid diagram failed

### Normative behavior

When a Mermaid diagram has invalid syntax, the Studio SHALL show one visible message with the parser reason on demand and keep the source readable.

### Preserved stakeholder intent

Writers expect a clear, non-destructive signal when a diagram does not parse, so they can fix it.

As a writer, I see at once that my Mermaid diagram does not parse and why, without losing the source.

### Rationale and constraints

- The message reads "Unable to render Mermaid diagram. Its source remains available below." and sits above the diagram; a collapsed "Show the parser error" section holds the parser's reason as plain text, never HTML; the message uses the theme error colour.
- However many times the theme changes, the invalid diagram keeps exactly one message and one details section; the earlier one is replaced.
- Known issue: a failed Mermaid diagram posts no diagnostic to the status line or the Problems list, because the drawing happens in the page.
