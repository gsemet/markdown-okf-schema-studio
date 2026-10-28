---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-003
uuid: 7cfe3884-e384-4de4-9b17-39af3d02ad1e
title: Mermaid diagrams stay in place while typing
description: When the preview content changes, the Studio SHALL keep unchanged
  Mermaid diagrams drawn and draw only new or changed ones.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derives_from: []
user_need: As a writer, I type in the document and the diagrams I did not touch
  do not flicker or disappear.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-DIAG-001
default_owner_email: gaetan@xeberon.net
---

## Mermaid diagrams stay in place while typing

### Normative behavior

When the preview content changes, the Studio SHALL keep unchanged Mermaid diagrams drawn and draw only new or changed ones.

### Preserved stakeholder intent

Writers expect typing, saving or an outside change not to make every diagram flash or vanish while the preview updates.

As a writer, I type in the document and the diagrams I did not touch do not flicker or disappear.

### Rationale and constraints

- Unchanged diagrams stay drawn after a content patch; new or changed ones are drawn after it. A diagram whose node was replaced but whose source and theme colours are the same reuses the earlier drawing; the 64 most recent drawings are kept.
- Diagrams are drawn one pass at a time in document order, and a late result for a theme that was replaced meanwhile is dropped.
