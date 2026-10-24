---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-005
uuid: 9b7e95ea-422a-4f17-8c63-6566dedbd3a3
title: Autolinks follow the Markdown link policy
description: When a bare URL is rendered as a link, the extension SHALL pass it
  through the same sanitizer and navigation routing as a Markdown link.
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

## Autolinks follow the Markdown link policy

### Normative behavior

When a bare URL is rendered as a link, the extension SHALL pass it through the same sanitizer and navigation routing as a Markdown link.

### Scenario: External autolink routed

- GIVEN a bare https://example.com URL
- WHEN the rendered HTML is sanitized
- THEN the link carries the same attributes and navigation routing as [x](https://example.com)

### Scenario: Disallowed target rejected

- GIVEN a bare URL whose generated link the sanitizer would reject
- WHEN the HTML is sanitized
- THEN the link is removed exactly as for a Markdown link

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Autolink and Markdown link outputs are identical after sanitizing.
