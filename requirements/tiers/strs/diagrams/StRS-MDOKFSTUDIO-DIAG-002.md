---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-002
uuid: eac41f4c-14c1-43e5-a190-32761450ddf1
title: Mermaid diagrams follow the preview theme
description: When a writer switches the preview theme, the Studio SHALL draw
  Mermaid diagrams again in the colours of that theme and stay readable when
  theme colours are unavailable.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derives_from: []
user_need: As a reader, I want Mermaid diagrams to match the dark, white, cream
  or light preview so their labels stay legible.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-DIAG-001
default_owner_email: gaetan@xeberon.net
---

## Mermaid diagrams follow the preview theme

### Normative behavior

When a writer switches the preview theme, the Studio SHALL draw Mermaid diagrams again in the colours of that theme and stay readable when theme colours are unavailable.

### Preserved stakeholder intent

Readers expect diagrams to look like part of the page, in every preview theme, with every label legible.

As a reader, I want Mermaid diagrams to match the dark, white, cream or light preview so their labels stay legible.

### Rationale and constraints

- Node, text, border, line and background colours come from the preview theme variables; the diagrams are drawn again when the theme mode changes (dark, white, cream, light), labels kept.
- When a theme variable is missing or is a CSS system colour keyword such as `Canvas`, built-in fallback colours are used and the diagram stays readable. Edge labels keep a contrast of at least 4.5:1 in the dark, light and fallback themes.
- A theme change that leaves the colours as they were draws nothing again. Evidence for the redraw is limited to dark, white and cream in the visual check; light and custom VS Code themes rely on the same observer.
