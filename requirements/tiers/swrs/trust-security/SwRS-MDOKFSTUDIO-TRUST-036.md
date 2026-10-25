---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-036
uuid: fdd1ee87-2d3a-4cc3-b3cf-9142710a7fb6
title: The sanitizer removes active content and keeps the rest
description: When the sanitizer processes a page, it SHALL remove every embed,
  foreignObject, form, iframe, object and style element, every meta element
  whose http-equiv is refresh, and every attribute whose name starts with on or
  is srcdoc or style (except the style of a span and the table style attribute
  that other rules handle), give an img without an alt attribute an empty alt,
  and leave every element and attribute it has no rule for unchanged.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/security/html-policy.test.ts
- test/security/trustReq.requirements.test.ts
---

## The sanitizer removes active content and keeps the rest

### Normative behavior

When the sanitizer processes a page, it SHALL remove every embed, foreignObject, form, iframe, object and style element, every meta element whose http-equiv is refresh, and every attribute whose name starts with on or is srcdoc or style (except the style of a span and the table style attribute that other rules handle), give an img without an alt attribute an empty alt, and leave every element and attribute it has no rule for unchanged.

### Scenario (nominal): Active elements are removed with their content

| Input | Outcome |
| --- | --- |
| an iframe | removed with its content; the diagnostic blocked-active-element is recorded |
| an SVG foreignObject | removed with its content; the diagnostic blocked-active-element is recorded |
| an embed, an object, a form | removed with their content (the five names embed, foreignObject, form, iframe and object are covered; embed, object and form are untested) |
| an image and a link beside the iframe and the foreignObject | the image and the link stay |

### Scenario (nominal): Style elements are removed

- GIVEN a page with a style element in the content
- WHEN the page is sanitized
- THEN the element is gone and the diagnostic blocked-inline-style is recorded
- GIVEN a raw table with a data-myst-table-style attribute
- WHEN the page is sanitized
- THEN the style survives only as the nonce stylesheet of SwRS-MDOKFSTUDIO-GFM-031

### Scenario (boundary): Automatic refresh

| Input | Outcome |
| --- | --- |
| a meta element with http-equiv set to Refresh, with surrounding spaces | removed; the diagnostic blocked-refresh is recorded |
| a meta element whose http-equiv is refresh in any other letter case | removed |
| a meta element that sets the viewport | stays |

### Scenario (refusal): Event, srcdoc and style attributes

| Input | Outcome |
| --- | --- |
| onload on the body | the attribute is removed |
| onclick on an image | the attribute is removed |
| style color red on a paragraph | the attribute is removed |
| srcdoc on an element | the attribute is removed |
| the style of a span, the table style attribute | not removed here; handled by SwRS-MDOKFSTUDIO-GFM-034 and SwRS-MDOKFSTUDIO-GFM-031 |

The diagnostic blocked-event-attribute is recorded for each removal.

### Scenario (boundary): Alternative text of an image

| Input | Outcome |
| --- | --- |
| an img element with no alt attribute | it carries alt with an empty value |
| an img element with alt set to image | the alt text is kept |

### Scenario (boundary): Elements and attributes without a rule

| Input | Outcome |
| --- | --- |
| a page with a base element | the element stays |
| a paragraph with a data-example attribute | the attribute stays |

### Known issues

- Known issue: the sanitizer is a deny-list, not an allow-list. An element outside its list, such as base or a link that is not a stylesheet, passes untouched, and an unknown attribute stays; the content security policy (base-uri, form-action, frame-src, object-src set to none) and the renderer, which drops raw HTML outside a small subset, are the other walls. Read from the code.

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-029: raw HTML outside the subset is dropped
- SwRS-MDOKFSTUDIO-GFM-031: raw HTML tables are rebuilt from an allow-list and keep a sanitised subset of styles
- SwRS-MDOKFSTUDIO-GFM-034: colour spans keep safe colours only, and a removed span style records a diagnostic
- SwRS-MDOKFSTUDIO-LAYOUT-023: the auto width rules also rewrite attributes

### Verification notes

- Method: Unit test test/security/html-policy.test.ts (rewrites local resources and removes active HTML content; removes refresh metadata with surrounding whitespace; rewrites sanitized table styles into a nonce-bearing stylesheet; keeps deferred relative navigation inert and host-routable; reduced previews remove external scripts while retaining contained media) covers the iframe and foreignObject with their neighbours, the refresh with spaces, the event handlers, the style of a paragraph, the empty alt and the kept alt. Embed, object and form are untested. The diagnostic assertion of the removal test accepts the codes blocked-inline-script or blocked-svg-content, and blocked-svg-content does not exist in the code, so the code blocked-active-element is not asserted.
- Method: Unit test test/security/trustReq.requirements.test.ts (the sanitizer removes style elements and records blocked-inline-style; the sanitizer leaves elements and attributes it has no rule for, Known issue: deny-list) covers the style element and the elements and attributes without a rule (a base element and a data-example attribute stay). The table-style branch (data-myst-table-style) is covered by the tests of SwRS-MDOKFSTUDIO-GFM-031.
- Criteria: No element of the removed names remains in the sanitized page, no meta refresh remains, and no element keeps an on* attribute, srcdoc or a style attribute, except the data-okf values of SwRS-MDOKFSTUDIO-GFM-034. No style element written by the document remains; the stylesheet the extension appends has the page nonce. Every img of the sanitized page has an alt attribute. The code blocked-event-attribute is also recorded when a plain style attribute is removed and when a colour span style is cleaned, so the code does not tell the cases apart (visible to the test hook only). An element or attribute is removed or rewritten only by a rule of SwRS-MDOKFSTUDIO-TRUST-011, SwRS-MDOKFSTUDIO-TRUST-025 or SwRS-MDOKFSTUDIO-TRUST-042, or by SwRS-MDOKFSTUDIO-GFM-031, SwRS-MDOKFSTUDIO-GFM-034 or SwRS-MDOKFSTUDIO-LAYOUT-023.
