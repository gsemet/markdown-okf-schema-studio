---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-022
uuid: ff0e9c2b-6539-4922-a183-47f7bbc15743
title: Each page gets a fresh nonce that every extension script and style
  carries
description: When the extension builds a page, it SHALL draw a nonce of 18
  random bytes encoded as base64url for every page it builds, give it to every
  script and style element it writes except the inert JSON element of the boot
  context, keep the nonce of the loaded page when it applies a render as a
  content patch, and replace the nonce of a patched record by a fresh one before
  it loads the record as a new document.
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
- src/core/preview/contentPatch.ts
- src/core/protocol/bootContext.ts
- src/core/security/csp.ts
- src/session/features/pageDocument.ts
- src/session/webview.ts
tested_in_files:
- test/core/preview/contentPatch.test.ts
- test/page/runtimeScroll.test.ts
- test/security/html-policy.test.ts
- test/security/trustReq.requirements.test.ts
- test/session/previewRuntimeFile.test.ts
default_owner_email: gaetan@xeberon.net
---

## Each page gets a fresh nonce that every extension script and style carries

### Normative behavior

When the extension builds a page, it SHALL draw a nonce of 18 random bytes encoded as base64url for every page it builds, give it to every script and style element it writes except the inert JSON element of the boot context, keep the nonce of the loaded page when it applies a render as a content patch, and replace the nonce of a patched record by a fresh one before it loads the record as a new document.

### Scenario (nominal): Fresh nonce of 18 bytes
| Input | Outcome |
| --- | --- |
| Two builds of the same document, the nonces compared | They differ |
| Any nonce, measured | It is 24 base64url characters, the encoding of 18 bytes |

### Scenario (nominal): Elements that carry the nonce
| Input | Outcome |
| --- | --- |
| A rendered page, built | The runtime script and the accessibility style element carry the page nonce |
| A page with a raw HTML table style and a maths block | Their style elements carry the page nonce, and the JSON context element carries none |

### Scenario (nominal): Boot context as inert JSON
| Input | Outcome |
| --- | --- |
| A document id that contains a closing script tag followed by a script element, the context serialized | The output contains no closing script tag |
| The same context with a less-than sign in a path, parsed by the page as JSON | The original path comes back, because the sign is written as a unicode escape |

### Scenario (nominal): Content patch keeps the nonce
| Input | Outcome |
| --- | --- |
| A loaded page and a new render of the same document, applied as a content patch | The record of the page carries the nonce of the loaded page |
| Two renders of one document type, their page shells compared | The shells are equal although the nonces differ |

### Scenario (refusal): Patched record loaded as a new document
| Input | Outcome |
| --- | --- |
| A page that received content patches and is created again by VS Code, or whose patch is not acknowledged; the host loads its record as a new document | The nonce of the record differs from every earlier nonce of the preview |
| A record that never kept the nonce of a loaded page, loaded by the host | Its nonce is kept |

### Related requirements
- SwRS-MDOKFSTUDIO-LIFE-071: content with a script or a nonce loads a new page
- SwRS-MDOKFSTUDIO-MYST-024: maths load the KaTeX stylesheet from the extension bundle; the link needs no nonce because the webview source is allowed
- SwRS-MDOKFSTUDIO-TRUST-012: the policy that names the nonce

### Verification notes
- Method: test/security/trustReq.requirements.test.ts (each nonce is 18 random bytes as 24 base64url characters, fresh for every page) checks the Fresh nonce of 18 bytes scenario with createNonce in src/core/security/csp.ts and that two status pages carry different nonces.
- Method: test/session/previewRuntimeFile.test.ts (PERF-11: a rendered page loads the runtime as a bundle file and carries its context as inert JSON; PERF-11: the static stylesheet is a bundle file) and test/security/html-policy.test.ts (rewrites sanitized table styles into a nonce-bearing stylesheet) check the Elements that carry the nonce scenario; test/integration/trusted-suite.ts (nonce present) checks it on the rendered page. The Mermaid and PlantUML renderer scripts and the maths style are untested.
- Method: test/page/runtimeScroll.test.ts (the boot context cannot terminate its containing script element) checks the hostile path row of the Boot context as inert JSON scenario; the round trip row is deduced from the code, not run.
- Method: test/core/preview/contentPatch.test.ts (T34: the record of a patched page carries the nonce of the loaded page and keeps its shell; T34: two renders of one document type have equal shell keys despite other text, nonces and identifiers; T34: reuseNonce swaps every occurrence, in the policy tokens and in the attributes) checks the Content patch keeps the nonce scenario. The call sites of freshNonceRecord in src/session/features/rendering.ts and src/session/pageMessages.ts, which the Patched record scenario relies on, are untested.
- Criteria: createNonce returns the base64url text of randomBytes(18). Every executable script and every style element of a rendered page has a nonce attribute equal to the page nonce. serializeRuntimeContext output holds no raw less-than sign. reuseNonce replaces the nonce of the new render by the loaded one in the record. A document loaded from a patched record never reuses the nonce of an earlier document.
