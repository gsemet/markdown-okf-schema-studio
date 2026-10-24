---
type: StRS
id: StRS-MDOKFSTUDIO-GFM-001
uuid: d92719ba-f472-44ff-a3e4-efec9d347cdd
title: Bare URLs become safe links
description: When a writer types a bare http(s) or www URL in prose, the Studio
  SHALL show it as a working link, leaving code, existing links and unsafe
  schemes as plain text.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I paste plain URLs and get working links without
  breaking code or existing links.
derived_by:
- SwRS-MDOKFSTUDIO-GFM-001
- SwRS-MDOKFSTUDIO-GFM-002
- SwRS-MDOKFSTUDIO-GFM-003
- SwRS-MDOKFSTUDIO-GFM-004
- SwRS-MDOKFSTUDIO-GFM-005
- SwRS-MDOKFSTUDIO-GFM-006
- SwRS-MDOKFSTUDIO-GFM-007
---

## Bare URLs become safe links

### Normative behavior

When a writer types a bare http(s) or www URL in prose, the Studio SHALL show it as a working link, leaving code, existing links and unsafe schemes as plain text.

### Preserved stakeholder intent

Writers expect a pasted address to be clickable as on GitHub, without code samples or existing links being altered.

As a writer, I paste plain URLs and get working links without breaking code or existing links.

### Rationale and constraints

- Only http(s) and www addresses become links; trailing sentence punctuation stays outside the link, and editing a paragraph still shows the raw URL text.
