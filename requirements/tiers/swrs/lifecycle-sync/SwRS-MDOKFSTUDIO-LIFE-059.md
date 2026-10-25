---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-059
uuid: 40e3fb26-3aba-495b-a13a-d97a56b0796c
title: The status region is a polite live region of plain text
description: When the extension writes a status, it SHALL write an aside with
  role status and aria-live polite that holds the label in bold, the message in
  its own element and the diagnostics as a list, with every text as plain text
  and never as markup.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
- StRS-MDOKFSTUDIO-LIFE-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewStatus.ts
- src/page/features/statusRegion.ts
- src/session/webview.ts
tested_in_files:
- test/integration/stockCoexistence.test.ts
- test/page/runtimeContentPatch.test.ts
---

## The status region is a polite live region of plain text

### Normative behavior

When the extension writes a status, it SHALL write an aside with role status and aria-live polite that holds the label in bold, the message in its own element and the diagnostics as a list, with every text as plain text and never as markup.

### Scenario (nominal): Status with diagnostics

- GIVEN a stale render with two diagnostics
- WHEN the status region is written
- THEN the aside holds a strong label, a message span and a list with one item per diagnostic carrying its severity, and a code attribute when the diagnostic has a code

### Scenario (nominal): Pending notice

- GIVEN a pending notice shown over a ready page
- WHEN the notice is written
- THEN it is also an aside with role status and aria-live polite, so assistive technology announces it politely

### Scenario (refusal): Markup in a message

- GIVEN an error message that contains an img element with an onerror attribute
- WHEN it is shown in the status region
- THEN the characters appear as text and no element is created

### Scenario (boundary): Quote in a code

- GIVEN a diagnostic code that contains a double quote
- WHEN the attribute is written
- THEN the quote is escaped in the attribute value

### Scenario (nominal): Status page

| Input | Outcome |
| --- | --- |
| a preview with no render yet, its page is built | the body carries data-sphinx-preview-status-page, the status markup follows and the style reads the neutral editor tokens (the nonce is SwRS-MDOKFSTUDIO-TRUST-012) |
| a preview whose first render failed, its page is built | the same structure shows Preview unavailable |

### Scenario (nominal): Patch rebuilds the status region

| Input | Outcome |
| --- | --- |
| a page with a Preview ready region and a patch carrying Preview is stale with two lines | the region shows the new label and two list items |
| a page that was loaded without a status region and a patch arrives | the new region becomes the first child of the body |
| a patch whose status lines carry codes | each line keeps its code attribute |
| a patch whose status line carries a code that is not a string | the patch is refused and the page content stays as it was |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-012: the nonce of the status page.

### Verification notes

- Method: test/integration/stockCoexistence.test.ts builds pending and error status pages and asserts the strong label followed by the message span, the body marker, the neutral editor tokens and the nonce in style-src.
- Method: test/page/runtimeContentPatch.test.ts "T34: the patch rebuilds the status region from plain text" (status with diagnostics, markup in a message, region replaced), "T34: a page loaded without a status region gets one as the first child of the body" and "CR 050: a patch keeps the code of each status line and refuses a malformed one" (code attribute); the host markup escaping (escapeHtml in statusMarkup, the quote in a code) has no direct test.
- Method: test/page/pageMessages.test.ts (host message previewPendingOverlay: pending notice).
- Criteria: the aside has the two ARIA attributes and the three kinds of child; no element is created from message text; the page html matches the body marker, the token definitions and the nonce; document.body.firstChild is the new aside.
