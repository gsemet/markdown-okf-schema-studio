---
type: StRS
id: StRS-MDOKFSTUDIO-GFM-002
uuid: d654f329-2a60-4bd7-b7dd-9206a014e8b8
title: GitHub Flavored Markdown renders as on GitHub, safely
description: When a document uses bare http(s) or www URLs, GitHub alerts,
  strikethrough, footnotes, pipe tables or the small raw HTML subset of
  collapsible details, keyboard keys, HTML tables and coloured spans, the Studio
  SHALL show them as GitHub would, in both LF and CRLF files, and drop unsafe
  HTML, unsafe colours and unsafe link schemes.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see GitHub Flavored Markdown the way GitHub shows it,
  with working links and the raw HTML that GitHub documents rely on, and nothing
  unsafe is rendered.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-044
- SwRS-MDOKFSTUDIO-CORE-045
- SwRS-MDOKFSTUDIO-CORE-056
- SwRS-MDOKFSTUDIO-CORE-062
- SwRS-MDOKFSTUDIO-GFM-001
- SwRS-MDOKFSTUDIO-GFM-002
- SwRS-MDOKFSTUDIO-GFM-003
- SwRS-MDOKFSTUDIO-GFM-004
- SwRS-MDOKFSTUDIO-GFM-005
- SwRS-MDOKFSTUDIO-GFM-006
- SwRS-MDOKFSTUDIO-GFM-007
- SwRS-MDOKFSTUDIO-GFM-008
- SwRS-MDOKFSTUDIO-GFM-009
- SwRS-MDOKFSTUDIO-GFM-010
- SwRS-MDOKFSTUDIO-GFM-011
- SwRS-MDOKFSTUDIO-GFM-012
- SwRS-MDOKFSTUDIO-GFM-013
- SwRS-MDOKFSTUDIO-GFM-014
- SwRS-MDOKFSTUDIO-GFM-015
- SwRS-MDOKFSTUDIO-GFM-029
- SwRS-MDOKFSTUDIO-GFM-030
- SwRS-MDOKFSTUDIO-GFM-031
- SwRS-MDOKFSTUDIO-GFM-032
- SwRS-MDOKFSTUDIO-GFM-033
- SwRS-MDOKFSTUDIO-GFM-034
- SwRS-MDOKFSTUDIO-GFM-035
- SwRS-MDOKFSTUDIO-GFM-036
- SwRS-MDOKFSTUDIO-GFM-037
- SwRS-MDOKFSTUDIO-GFM-038
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-GFM-001
- StRS-MDOKFSTUDIO-GFM-004
---

## GitHub Flavored Markdown renders as on GitHub, safely

### Normative behavior

When a document uses bare http(s) or www URLs, GitHub alerts, strikethrough, footnotes, pipe tables or the small raw HTML subset of collapsible details, keyboard keys, HTML tables and coloured spans, the Studio SHALL show them as GitHub would, in both LF and CRLF files, and drop unsafe HTML, unsafe colours and unsafe link schemes.

### Preserved stakeholder intent

Writers expect a pasted address to be clickable as on GitHub, without code samples or existing links being altered. They expect alerts, strikethrough, footnotes and pipe tables to look in the preview as they do on GitHub, whatever the line endings of the file. They also expect the small raw HTML subset used in GitHub documents to display, and expect unsafe content never to reach the preview.

### Rationale and constraints

- Applies to documents using LF or CRLF line endings; alerts inside code fences stay literal.
- Only http(s) and www addresses become links; code, existing links and unsafe schemes stay plain text, trailing sentence punctuation stays outside the link, and editing a paragraph still shows the raw URL text.
- Scripts, styles, frames and other active content are removed; only hex and rgb colours are kept on coloured text.
