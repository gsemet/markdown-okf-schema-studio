---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-011
uuid: 2370766a-3434-409b-a3f3-07432eac8603
title: Document scripts run only when trusted, from the roots, with the page
  nonce
description: "When the extension builds the page of a document, it SHALL have the
  sanitizer remove every script element of the document, inline or with a source,
  in a read-only preview, and in a writable preview remove an inline script and keep
  a script with a source only inside the roots, with the webview address of the file
  and the nonce of the page."
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
tested_in_files:
- test/security/html-policy.test.ts
---

## Document scripts run only when trusted, from the roots, with the page nonce

### Normative behavior

When the extension builds the page of a document, it SHALL have the sanitizer remove every script element of the document, inline or with a source, in a read-only preview, and in a writable preview remove an inline script and keep a script with a source only inside the roots, with the webview address of the file and the nonce of the page.

### Scenario (nominal): Script with a source in a read-only preview
- GIVEN a read-only preview and a document whose HTML holds a script element with a source file inside the roots and an image inside the roots
- WHEN the page is built
- THEN the script element is gone with the diagnostic blocked-script and the image stays

### Scenario (nominal): Script with a source inside the roots of a writable preview
- GIVEN a writable preview and a script element whose source is a file inside the roots
- WHEN the page is sanitized
- THEN the element keeps a webview address and carries the page nonce

### Scenario (refusal): Script with a source outside the roots
- GIVEN a script element whose source is outside the roots
- WHEN the page is sanitized
- THEN the element is removed with the diagnostic blocked-script-resource

### Scenario (refusal): Inline script
| Input | Outcome |
| --- | --- |
| A script element with no src attribute, also inside an SVG that holds a script element with code | The script is gone with the diagnostic blocked-inline-script |
| The same page sanitized for a read-only preview (scripts disallowed) | The script is gone with the diagnostic blocked-script instead |

### Known issues
- Known issue: with a packaged VSIX, VS Code disables the extension in Restricted Mode unless a user setting or the product configuration overrides it (SwRS-MDOKFSTUDIO-TRUST-001); the Restricted Mode case of this requirement is then reached only with that override. Deduced from the VS Code source, not run with a packaged build.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-089: the JAR is disabled in Restricted Mode
- SwRS-MDOKFSTUDIO-DIAG-024: the built-in PlantUML engine starts no process
- SwRS-MDOKFSTUDIO-TRUST-036: the sanitizer removes active content and keeps the rest

### Verification notes
- Method: test/security/html-policy.test.ts (reduced previews remove external scripts while retaining contained media) checks the Script with a source in a read-only preview scenario (the sanitizer option); (rewrites local resources and removes active HTML content) checks the kept script and its nonce and the script removed inside an SVG, where the diagnostic code is not asserted precisely (see SwRS-MDOKFSTUDIO-TRUST-036). The removal of a script outside the roots and its diagnostic blocked-script-resource are untested. The host wiring, which passes the negated read-only flag in src/session/features/rendering.ts, is untested. The renderer already drops raw HTML scripts (SwRS-MDOKFSTUDIO-GFM-029), so this removal is a second wall.
- Criteria: The page of a read-only preview holds no script element written by the document; the diagnostic blocked-script is recorded. No script element without a source remains; the diagnostic blocked-inline-script is recorded. A kept script has a webview address and the nonce of its page; the diagnostic blocked-script-resource is recorded for a removed one.
