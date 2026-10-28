---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-011
uuid: 2370766a-3434-409b-a3f3-07432eac8603
title: No script of a document reaches the preview
description: "When the extension builds the page of a document, it SHALL have the
  sanitizer remove every script element of the document, inline or with a source,
  in every preview mode, and never keep a nonce attribute written by the document."
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: proposed
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
default_owner_email: gaetan@xeberon.net
---

## Document scripts run only when trusted, from the roots, with the page nonce

### Normative behavior

When the extension builds the page of a document, it SHALL have the sanitizer remove every script element of the document, inline or with a source, in every preview mode, writable or read-only, and never keep a nonce attribute written by the document. The scripts of the preview itself are added by the host after sanitizing.

### Scenario (nominal): Script with a source in any preview

- GIVEN a script element whose source is a file inside the roots, in a read-only or a writable preview, and an image inside the roots
- WHEN the page is built
- THEN the script element is gone with the diagnostic blocked-script and the image stays

### Scenario (refusal): Inline script and nonce attribute

| Input | Outcome |
| --- | --- |
| A script element with no src attribute, also inside an SVG that holds a script element with code | The script is gone with the diagnostic blocked-inline-script |
| A script element with a source outside the roots | The script is gone with the diagnostic blocked-script |
| An element of the document that carries a nonce attribute | The attribute is removed with the diagnostic blocked-attribute |

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-089: the JAR is disabled in Restricted Mode
- SwRS-MDOKFSTUDIO-DIAG-024: the built-in PlantUML engine starts no process
- SwRS-MDOKFSTUDIO-TRUST-036: the sanitizer removes active content and keeps the rest

### Verification notes
- Method: test/security/html-policy.test.ts (reduced previews remove external scripts while retaining contained media; trusted previews also remove scripts and the nonce attribute of the document) checks the scenarios. The host wiring in src/session/features/rendering.ts still passes the negated read-only flag, which the sanitizer now ignores. The renderer already drops raw HTML scripts (SwRS-MDOKFSTUDIO-GFM-029), so this removal is a second wall.
- Criteria: The page holds no script element written by the document, in any mode; the diagnostic blocked-script or blocked-inline-script is recorded; no nonce attribute written by the document remains.
