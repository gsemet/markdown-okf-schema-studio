---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-042
uuid: 141f2370-4247-4f1f-a75e-0fefc6d917d6
title: The sanitizer rewrites links and records each removal
description: "When the sanitizer finds a link in a page, it SHALL keep an anchor or
  an http, https or mailto address as the href, turn a relative or wiki request into
  the href # that the host routes from data-sphinx-preview-navigation, remove the
  address of a blocked request, rewrite a linked stylesheet to its webview address
  or remove it, and record each removal or rewrite as a diagnostic with a code, a
  message and the value on the record of the page, without showing it in the status
  area of the preview."
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
- src/session/features/rendering.ts
- src/session/webview.ts
tested_in_files:
- test/host/trustReq.requirements.test.ts
- test/security/html-policy.test.ts
- test/security/trustReq.requirements.test.ts
---

## The sanitizer rewrites links and records each removal

### Normative behavior

When the sanitizer finds a link in a page, it SHALL keep an anchor or an http, https or mailto address as the href, turn a relative or wiki request into the href # that the host routes from data-sphinx-preview-navigation, remove the address of a blocked request, rewrite a linked stylesheet to its webview address or remove it, and record each removal or rewrite as a diagnostic with a code, a message and the value on the record of the page, without showing it in the status area of the preview.

### Scenario (nominal): Anchor and external addresses

| Input | Outcome |
| --- | --- |
| a link with href #section | the href is #section and data-sphinx-preview-navigation holds #section |
| https://example.test/docs | the address is kept as the href, with the original request in data-sphinx-preview-navigation |
| mailto:docs@example.test | the address is kept as the href, with the original request in data-sphinx-preview-navigation |

### Scenario (nominal): Relative and wiki links are routed by the host

| Input | Outcome |
| --- | --- |
| a link with href chapter-two.md | the href is # and data-sphinx-preview-navigation is chapter-two.md |
| a link whose request is wiki:Some Page | the href is # and the request is kept in data-sphinx-preview-navigation |

### Scenario (refusal): Blocked links

| Input | Outcome |
| --- | --- |
| a link with href javascript:alert(1) | no href remains; the request is only in data-sphinx-preview-navigation; the diagnostic blocked-navigation is recorded (message Removed navigation outside the preview policy.) |
| a link with href # followed by a space | no href remains; the diagnostic blocked-navigation is recorded |
| an xlink:href the link rules block | the attribute is removed without the navigation attribute |
| an xlink:href the link rules allow | it keeps its address without the navigation attribute |

### Scenario (boundary): Linked stylesheet

| Input | Outcome |
| --- | --- |
| a link element for theme.css inside the roots | the link stays with the webview address of the file |
| a link element for a file outside the roots | the element is removed with the diagnostic blocked-stylesheet (message Removed a stylesheet outside staged output.) |

### Scenario (nominal): Removals are recorded on the record of the page

- GIVEN a document whose HTML holds an iframe
- WHEN the preview renders
- THEN the record of the page holds the diagnostic blocked-active-element with its message
- GIVEN an image whose reference leaves the roots
- WHEN the preview renders
- THEN the record holds the diagnostic blocked-resource with the reference as its value (message Removed a resource outside staged output.)

### Scenario (refusal): Removals are not shown to the reader

- GIVEN a document whose HTML holds an iframe or an image outside the roots
- WHEN the preview renders
- THEN the page and the status area show no trace of the removal
- GIVEN a document with a missing include
- WHEN the preview renders
- THEN the status area lists the render diagnostic

### Known issues

- Known issue: for every stylesheet the policy accepts, the page build records the diagnostic Ignored a linked stylesheet; the preview supplies its own theme., but the link element stays in the page and the policy allows styles from the webview source. A raw HTML link element does not reach this step from a Markdown document, because the renderer drops it (SwRS-MDOKFSTUDIO-GFM-029). Read from src/session/webview.ts and src/core/security/html-sanitizer.ts.

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-090: a link is an anchor (at least one character after the hash and no space, hash or question mark), external, local or blocked; other schemes are blocked
- SwRS-MDOKFSTUDIO-TOOLBAR-094: a relative link must stay below a workspace root
- SwRS-MDOKFSTUDIO-TRUST-036: the other removals of the sanitizer
- SwRS-MDOKFSTUDIO-GFM-029: raw HTML outside the subset is dropped

### Verification notes

- Method: Unit test test/security/trustReq.requirements.test.ts (an anchor or external link keeps its address and the original request; each removal or rewrite is recorded with its code, message and value) covers the anchor and external links, built with buildPreviewWebviewHtml in src/session/webview.ts, which classifies the reference with classifyPreviewReference, and the diagnostics returned for the iframe and the refused image, which updatePreview in src/session/features/rendering.ts stores on the record of the page (the record itself is not reachable in a unit test).
- Method: Unit test test/security/html-policy.test.ts (keeps deferred relative navigation inert and host-routable; rewrites local resources and removes active HTML content) covers the relative link, javascript: and the stylesheet rewrite. The wiki case, the bad anchor, the xlink:href cases, the diagnostic code blocked-navigation, the removal of a stylesheet and the host diagnostic are untested. The policy method resolveNavigation is covered by test/security/resource-policy.test.ts (allows only explicit navigation schemes).
- Method: Host harness test test/host/trustReq.requirements.test.ts (the status area lists render diagnostics and nothing the sanitizer or the policy removed) runs the extension host harness over a document with an image outside the roots and a missing include, and reads the status area of the assigned page (updatePreview in src/session/features/rendering.ts passes only the render diagnostics).
- Criteria: An anchor or external link has the data-sphinx-preview-navigation attribute. A relative or wiki link never navigates by itself; the host follows it after checking it again. No sanitized link holds a blocked address in an href, and no link element of the sanitized page points outside the roots. Every removal or rewrite adds one entry with a code, a message and, where there is one, a value; the status area lists render diagnostics only and the security diagnostics stay on the record of the page.
