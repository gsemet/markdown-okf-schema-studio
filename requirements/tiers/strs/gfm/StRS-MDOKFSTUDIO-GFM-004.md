---
type: StRS
id: StRS-MDOKFSTUDIO-GFM-004
uuid: e6b565e4-f2e9-4628-a8c4-e78a4ec57ddc
title: Small raw HTML subset renders safely
description: When a document uses collapsible details, keyboard keys, HTML
  tables or coloured spans, the Studio SHALL show them while dropping unsafe
  HTML and unsafe colours.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-GFM-002; no marker expected."
derives_from: []
user_need: As a writer, I use the raw HTML that GitHub documents rely on and
  nothing unsafe is rendered.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-GFM-002
---

## Small raw HTML subset renders safely

### Normative behavior

When a document uses collapsible details, keyboard keys, HTML tables or coloured spans, the Studio SHALL show them while dropping unsafe HTML and unsafe colours.

### Preserved stakeholder intent

Writers expect the small raw HTML subset used in GitHub documents to display, and expect unsafe content never to reach the preview.

As a writer, I use the raw HTML that GitHub documents rely on and nothing unsafe is rendered.

### Rationale and constraints

- Scripts, styles, frames and other active content are removed; only hex and rgb colours are kept on coloured text.
