---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-004
uuid: 5ea6d847-fda5-4905-b191-925562376c4b
title: Only http, https and www hosts are autolinked
description: 'When prose contains javascript:, data:, ftp: or vbscript: text, or a
  www. candidate without a dotted host, the extension SHALL NOT create a link from
  it.'
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

## Only http, https and www hosts are autolinked

### Normative behavior

When prose contains javascript:, data:, ftp: or vbscript: text, or a www. candidate without a dotted host, the extension SHALL NOT create a link from it.

### Scenario: Unsafe schemes stay text

- GIVEN the text 'javascript:alert(1)' and 'ftp://example.com'
- WHEN the preview is rendered
- THEN both remain plain text

### Scenario: Undotted www host

- GIVEN the text 'www.' and 'www.localhost'
- WHEN the preview is rendered
- THEN no link is created for the undotted candidate

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: No link element exists for non-http(s) text.
