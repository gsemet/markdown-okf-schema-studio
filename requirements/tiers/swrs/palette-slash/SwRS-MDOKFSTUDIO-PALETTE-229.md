---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-229
uuid: 4dc25dab-e677-4fb3-9b65-7cb7cf56f4e6
title: Pasted HTML never brings active content
description: When the clipboard HTML of a paste is converted, the extension
  SHALL drop script, style, embedded, form control, media and template elements,
  comments and hidden content, read only a short list of attributes, and keep
  only the text of a link or image whose address is not safe.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-018
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/paste/htmlToMarkdown.ts
tested_in_files:
- test/core/paste/htmlToMarkdown.test.ts
default_owner_email: gaetan@xeberon.net
---

## Pasted HTML never brings active content

### Normative behavior

When the clipboard HTML of a paste is converted, the extension SHALL drop script, style, embedded, form control, media and template elements, comments and hidden content, read only a short list of attributes, and keep only the text of a link or image whose address is not safe.

### Scenario (nominal): Scripts, styles, comments and hidden content are dropped
- GIVEN a script, a style and a paragraph with an onclick attribute, and a span with display none
- WHEN the HTML is converted
- THEN only the text of the paragraph is kept and the text of the hidden span is dropped

| Input | Outcome |
| --- | --- |
| script, style, head, iframe, object, embed, svg, math, form control, media or template element | dropped from the Markdown |
| comment | dropped from the Markdown |
| content hidden by the hidden attribute | dropped from the Markdown |
| content hidden by the style display none, visibility hidden or mso-hide all | dropped from the Markdown |

### Scenario (nominal): Only a few attributes are read
- GIVEN a link with an href and a title, and a paragraph with an onclick attribute
- WHEN the HTML is converted
- THEN the href is used, the title is dropped and the onclick attribute has no effect on the Markdown

| Input | Outcome |
| --- | --- |
| attribute href, src, alt, class, style, colspan, rowspan, type, checked or start | read |
| any other attribute (an event attribute such as onclick, title) | dropped; no other attribute reaches the output |

### Scenario (refusal): An unsafe address keeps only the text
- GIVEN a link to javascript:alert(1) with the text click, and an image with a data: address and alt text pic
- WHEN the HTML is converted
- THEN the text is click without a link, and the text is pic

| Address of the link or image | Outcome |
| --- | --- |
| http, https, mailto or tel address | accepted |
| fragment | accepted |
| relative path (without a scheme colon before its first slash) | accepted |
| any other scheme, such as javascript: | only the text is kept |
| address that holds a control character | only the text is kept |
| data: image | only its alternative text is kept |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-217: the Markdown written for the elements and addresses that are kept.

### Verification notes
- Method: test/core/paste/htmlToMarkdown.test.ts, data-driven unit test T1 htmlToMarkdown, rows "web page: link, inline code, image as link, blockquote, script and onclick dropped" (script, style and onclick dropped, the href read and the title dropped) and "unsafe link and data image keep only their text, hidden content is dropped" (javascript link, data image, display none); no row checks the hidden attribute, visibility hidden, mso-hide all, the dropped element kinds other than script and style, or the control character.
- Criteria: The hidden rules are the hidden attribute and the styles display none, visibility hidden and mso-hide all. The attribute list is the one read by htmlToMarkdown; no other attribute reaches the output. A relative path without a scheme colon before its first slash is accepted.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-018](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-018.md): A writer pastes screenshots and rich text safely as Markdown
<!-- okf:links:end -->
