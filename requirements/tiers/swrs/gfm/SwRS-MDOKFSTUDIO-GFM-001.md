---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-001
uuid: 08ce96d2-5a64-426d-a802-35be3f1faecb
title: Bare URLs become safe links
description: When prose contains a bare http://, https:// or www. URL, the
  extension SHALL render it as a link that follows the Markdown link policy,
  opening www. URLs as https://, leaving trailing sentence punctuation and
  unbalanced closing parentheses outside the link, and leaving unlinked any text
  that has another meaning or another scheme.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystInlineTransforms.ts
tested_in_files:
- test/core/render/bareUrlAutolink.test.ts
default_owner_email: gaetan@xeberon.net
---

## Bare URLs become safe links

### Normative behavior

When prose contains a bare http://, https:// or www. URL, the extension SHALL render it as a link that follows the Markdown link policy, opening www. URLs as https://, leaving trailing sentence punctuation and unbalanced closing parentheses outside the link, and leaving unlinked any text that has another meaning or another scheme.

### Scenario (nominal): Bare URLs in prose, lists and tables

- GIVEN a paragraph, a list item and a table cell each containing https://example.com and www.example.com
- WHEN the preview is rendered
- THEN each URL is a link and the www. link targets https://www.example.com

### Scenario (boundary): Trailing punctuation stays outside the link

| Input | Outcome |
| --- | --- |
| `see https://example.com/a.` | the link ends before the final period |
| `(https://example.com/a_(b))` | the link keeps the balanced parentheses of a_(b) and ends before the last closing parenthesis |
| `(see https://example.com/a)` | the closing parenthesis is outside the link |

### Scenario (refusal): Text with a meaning is not autolinked

| Input | Outcome |
| --- | --- |
| inline code, a fenced block and a Markdown link each containing https://example.com | no additional link is created and the code text is unchanged |
| https://example.com in math, raw HTML, an image, a reference or an e-mail address | no link is created |
| a directive option line containing https://example.com | the option text stays literal and no link is created |
| `abchttps://example.com` (glued to a word character) | not a link |
| `a@example.com` | not a link |

### Scenario (refusal): Only http, https and www hosts are autolinked

| Input | Outcome |
| --- | --- |
| `javascript:alert(1)` | stays plain text |
| `ftp://example.com` | stays plain text |
| `data:` and `vbscript:` text | no link is created |
| `www.` and `www.localhost` (no dotted host) | no link is created |

### Scenario (nominal): Autolinks follow the Markdown link policy

- GIVEN a bare https://example.com URL, and a bare URL whose generated link the sanitizer would reject
- WHEN the rendered HTML is sanitized
- THEN the first link carries the same attributes and navigation routing as [x](https://example.com), and the rejected link is removed exactly as for a Markdown link

### Scenario (nominal): The block editor shows the raw URL

- GIVEN a paragraph 'visit https://example.com now', and a paragraph with www.example.com
- WHEN the block editor source is requested
- THEN the text equals the original source, so the www.example.com paragraph still reads www.example.com and not an https:// link

### Scenario (boundary): Pathological URLs render in linear time

| Input | Outcome |
| --- | --- |
| a 100 000-character URL | rendering completes in under 1 s |
| a URL followed by 50 000 closing parentheses | rendering completes in under 1 s and the link ends at the balanced position |

### Verification notes

- Method: test/core/render/bareUrlAutolink.test.ts (all scenarios: unit tests on the render pipeline output, the sanitized output and the block editor source; the pathological inputs with a timing bound of 1 s).
- Criteria: Link elements exist for every bare URL in prose contexts and none in directive options, code, links, math, raw HTML, images, references, e-mail addresses or unsafe schemes; the link text equals the URL without trailing punctuation; autolink and Markdown link outputs are identical after sanitizing; the editor source text is byte-identical to the document source; both pathological inputs render in under 1 s.
