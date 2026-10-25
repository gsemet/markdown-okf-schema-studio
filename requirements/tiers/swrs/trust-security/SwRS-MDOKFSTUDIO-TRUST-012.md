---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-012
uuid: 53737f49-42b2-488c-a353-a480a43b3973
title: Every page carries a deny-by-default content security policy
description: When the extension builds the policy of a page, it SHALL set its
  default source to none and open only the named kinds of source of the policy
  table (scripts and styles from the webview source or with the page nonce,
  images from the webview source and data URIs, fonts and media from the webview
  source), set connect, frame, object and worker sources, the base address and
  form action to none, put no bare wildcard source, unsafe-inline or unsafe-eval
  in it, and place it as the first meta of the head in place of any policy of
  the document.
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
- src/core/security/csp.ts
- src/core/security/html-sanitizer.ts
- src/session/webview.ts
tested_in_files:
- test/integration/trusted-suite.ts
- test/security/html-policy.test.ts
- test/security/trustReq.requirements.test.ts
- test/session/previewRuntimeFile.test.ts
---

## Every page carries a deny-by-default content security policy

### Normative behavior

When the extension builds the policy of a page, it SHALL set its default source to none and open only the named kinds of source of the policy table (scripts and styles from the webview source or with the page nonce, images from the webview source and data URIs, fonts and media from the webview source), set connect, frame, object and worker sources, the base address and form action to none, put no bare wildcard source, unsafe-inline or unsafe-eval in it, and place it as the first meta of the head in place of any policy of the document.

### Scenario (nominal): Rendered page starts from none
- GIVEN a rendered preview page, or a policy built for any webview source and nonce
- WHEN its policy is read
- THEN it starts with default-src 'none' and every other directive narrows or opens a named kind of source

### Scenario (nominal): Directive table
| Directive | Value | Effect |
| --- | --- | --- |
| script-src | the webview source and 'nonce-' followed by the page nonce, nothing else | A script from the webview source runs without a nonce (an alternative, not both required); a script element with no nonce and a source outside the webview source is not allowed |
| style-src | the webview source and 'nonce-' followed by the page nonce, nothing else | A style element with the nonce loads; an element with a style attribute is not allowed, because there is no unsafe-inline |
| img-src | the webview source followed by data: | A local image loads; an image whose address is on the network is not allowed. The data: source exists for the inline icons that styles load as masks and images |
| font-src | the webview source only | Bundled fonts for maths load; a font on the network is not allowed |
| media-src | the webview source only | A local video loads |
| connect-src, frame-src, object-src, worker-src | 'none' | A fetch call to a network address is blocked |
| base-uri, form-action | 'none' | A base element does not rebase relative addresses and a form cannot submit |

### Scenario (boundary): No wildcard, unsafe-inline or unsafe-eval
| Input | Outcome |
| --- | --- |
| The webview source vscode-webview://unit and a nonce | The policy holds no bare asterisk source, no unsafe-inline and no unsafe-eval |
| The webview source that VS Code supplies, 'self' https://*.vscode-cdn.net | No source is a bare asterisk; the asterisk of the subdomain wildcard stays inside the host name |

### Scenario (refusal): The policy of the document is replaced
| Input | Outcome |
| --- | --- |
| A page whose head holds a meta policy default-src * | One policy remains, the extension's, as the first child of the head, and the weaker text is gone |
| A page with a Content-Security-Policy meta element in its body | The element in the body is not removed; only the policy of the head is replaced |

### Scenario (nominal): Status page
- GIVEN a preview waiting for its first render, or a preview whose render failed (the pending, error and missing-source pages)
- WHEN the status page is built
- THEN it holds the policy meta with a nonce of its own (a fresh nonce for the error page), a style element that carries the nonce, and no script element

### Known issues
- Known issue: the webview source VS Code supplies is 'self' https://*.vscode-cdn.net, a subdomain wildcard of the webview origin, so the policy text of a real page does contain an asterisk (deduced from the VS Code 1.143.1 extension host, not run).

### Related requirements
- SwRS-MDOKFSTUDIO-TRUST-011: a kept script with a source gets the nonce
- SwRS-MDOKFSTUDIO-DIAG-024: the built-in PlantUML engine needs no network
- SwRS-MDOKFSTUDIO-TRUST-036: the sanitizer leaves a form that would escape it; the policy is the second wall
- SwRS-MDOKFSTUDIO-TRUST-022: the nonce of the page

### Verification notes
- Method: test/security/html-policy.test.ts (generates a restrictive nonce-bearing CSP; adds the CSP as a head meta without retaining a weaker policy) checks the starting directive, the script, image and no-wildcard rows and the replacement of the policy of the head; the policy in the body is not asserted.
- Method: test/session/previewRuntimeFile.test.ts (PERF-11: the static stylesheet is a bundle file; the page keeps only the per-render rule inline) checks the policy read back from the rendered page: the style-src nonce and the absence of unsafe-inline.
- Method: test/integration/trusted-suite.ts (the page carries a Content-Security-Policy without unsafe-inline or a wildcard default) checks the rendered page; only the script-src, img-src, no-wildcard and no-unsafe parts are asserted.
- Method: test/security/trustReq.requirements.test.ts (fonts and media load only from the webview source; the page may open no connection, frame, object or worker; the page may not change its base address or submit a form; a status page carries the policy and its own nonce and no script) checks the font-src, media-src, connect-src, frame-src, object-src, worker-src, base-uri and form-action rows one by one and the Status page scenario, built with buildStatusWebviewHtml in src/session/webview.ts. The browser effects of the table (a blocked script, style attribute, remote image, remote font, fetch call, base element) are deduced from the policy, not run in a browser.
- Criteria: The first directive of the policy is default-src 'none'. script-src and style-src each have exactly two sources. img-src is the webview source followed by data:. font-src and media-src each hold the webview source and nothing else. connect-src, frame-src, object-src, worker-src, base-uri and form-action are each 'none'. No source of any directive is a bare *, and the keywords unsafe-inline and unsafe-eval do not appear. Exactly one Content-Security-Policy meta element remains in the head and no earlier policy text survives. The status markup contains a Content-Security-Policy meta and no script element. The base-uri and form-action rows are the second wall for the base element, which the sanitizer leaves in place (SwRS-MDOKFSTUDIO-TRUST-036), and for a form that would escape the sanitizer.
