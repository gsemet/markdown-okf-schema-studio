---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-003
uuid: 83a744eb-0750-4ec2-ba44-c6b5c3b53122
title: Text with a meaning is not autolinked
description: When a URL-like string sits in code, math, raw HTML, an existing
  link, image, reference, directive option or e-mail address, or is glued to a
  preceding word character, the extension SHALL leave it unlinked.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-001
default_owner_email: gaetan@xeberon.net
---

## Text with a meaning is not autolinked

### Normative behavior

When a URL-like string sits in code, math, raw HTML, an existing link, image, reference, directive option or e-mail address, or is glued to a preceding word character, the extension SHALL leave it unlinked.

### Scenario: Code and links keep their text

- GIVEN inline code, a fenced block and a Markdown link each containing https://example.com
- WHEN the preview is rendered
- THEN no additional link is created and the code text is unchanged

### Scenario: URL glued to a word character

- GIVEN the text 'abchttps://example.com' and 'a@example.com'
- WHEN the preview is rendered
- THEN neither string becomes a link

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: No nested or extra link element appears in any excluded context.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-GFM-001](SwRS-MDOKFSTUDIO-GFM-001.md): Bare URLs become safe links
<!-- okf:links:end -->
