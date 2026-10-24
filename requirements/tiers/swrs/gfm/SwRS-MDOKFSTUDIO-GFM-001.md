---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-001
uuid: 08ce96d2-5a64-426d-a802-35be3f1faecb
title: Bare URLs render as links
description: When prose contains a bare http://, https:// or www. URL, the
  extension SHALL render it as a link, opening www. URLs as https://.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Bare URLs render as links

### Normative behavior

When prose contains a bare http://, https:// or www. URL, the extension SHALL render it as a link, opening www. URLs as https://.

### Scenario: Bare URLs in prose, lists and tables

- GIVEN a paragraph, a list item and a table cell each containing https://example.com and www.example.com
- WHEN the preview is rendered
- THEN each URL is a link and the www. link targets https://www.example.com

### Scenario: Bare URL in a directive option

- GIVEN a directive option line containing https://example.com
- WHEN the preview is rendered
- THEN the option text stays literal and no link is created

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Link elements exist for every bare URL in prose contexts and none in directive options.
