---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-090
uuid: ad6d4ab7-0402-4c37-a174-9a4979798228
title: "A link is an anchor, external, local or blocked"
description: "When a link request is followed or looked up, the extension SHALL classify
  it before any file access as an anchor, an external link or a relative or wiki path,
  and block it with a reason when it is an invalid anchor, a query-only target, an
  undecodable path, a scheme other than http, https or mailto, or an absolute path.
  The scheme is read on the raw link, and the host re-checks the parsed URI before
  opening it."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/navigation/previewNavigation.ts
- src/core/security/resource-policy.ts
- src/host-vscode/vscodeHost.ts
tested_in_files:
- test/core/navigation/previewNavigation.test.ts
- test/core/preview/toolbarReq.requirements.test.ts
- test/host-vscode/openExternal.test.ts
- test/session/previewNavigator.test.ts
default_owner_email: gaetan@xeberon.net
---

## A link is an anchor, external, local or blocked

### Normative behavior

When a link request is followed or looked up, the extension SHALL classify it before any file access as an anchor, an external link or a relative or wiki path, and block it with a reason when it is an invalid anchor, a query-only target, an undecodable path, a scheme other than http, https or mailto, or an absolute path.

### Scenario (nominal): Accepted requests

| Request | Class |
| --- | --- |
| #section-2 | anchor with that value (a # followed by at least one character and no space, # or ?) |
| https://example.test/docs | external |
| MAILTO:a@b.c | external (http, https and mailto in any letter case) |
| ../docs/target.md | relative, not blocked at this step |
| tmp/secret.md | relative |
| other.md?view=1 | relative, keeps its query |

### Scenario (refusal): Blocked requests

| Request | Outcome |
| --- | --- |
| #, #not a valid anchor, #a#b | blocked with The preview anchor is invalid. |
| javascript:alert(1), file:///tmp/secret | blocked with The navigation scheme is not allowed in the preview. |
| wiki:https://example.test | blocked, because a wiki link is never external |
| https%3A/../../System/Applications/Calculator.app, mailto%3Aa@b.c | blocked with The navigation scheme is not allowed in the preview. (the scheme is read on the raw link; a percent sign before the first colon is never external) |
| /tmp/secret, //example.test | blocked with Absolute navigation targets are not allowed. |
| ?x=1 | blocked with Query-only navigation targets are not valid file links. |
| %5Csecret, %00.md (backslash or NUL after decoding) | blocked with The navigation target could not be decoded safely. |
| a%zz.md (malformed escape) | blocked with The navigation target could not be decoded safely. |

A blocked request causes no file access.

### Scenario (boundary): Decoding once

| Request | Outcome |
| --- | --- |
| docs%20file.md | relative with the path docs file.md |
| docs%2520file.md | relative with the path docs%20file.md (the escaped percent is a literal percent in the file name, it is not decoded again) |
| 100%25.md | relative with the path 100%.md |
| a%2541.md | relative with the path a%41.md |
| %255Csecret | relative with the path %5Csecret (only a backslash decoded from the link itself is refused) |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-094: a relative path must then be a regular file inside the workspace.
- SwRS-MDOKFSTUDIO-TOOLBAR-077: the follow that shows the reason as a warning.

### Verification notes

- Method: test/session/previewNavigator.test.ts (classifies anchors, external links, relative links without touching the filesystem and workspace-local files; blocks unsafe anchors, schemes and paths including the space anchor, /tmp/secret, //example.test, %00.md and %5Csecret); the # and #a#b anchors, the case-insensitive scheme, the wiki prefix, the percent cases are in previewNavigation.test.ts.
- Method: test/core/navigation/previewNavigation.test.ts (blocked schemes and absolute paths; double-encoded path; unsafe characters); the exact scheme and absolute reason texts are not asserted, and the malformed escape case is untested.
- Method: test/core/preview/toolbarReq.requirements.test.ts (a query-only link is blocked and a file with a query is relative).
- Method: test/core/navigation/previewNavigation.test.ts, test/security/resource-policy.test.ts, test/host-vscode/openExternal.test.ts (the host refuses any parsed scheme but http, https and mailto) and test/integration/previewHistory.test.ts (a percent-encoded scheme never reaches openExternal).
- Criteria: ANCHOR_PATTERN is ^#[^\s#?]+$; schemes are compared in lower case against http:, https:, mailto:; no file access for a blocked request; decoded paths starting with / are blocked; a request starting with ? and an empty path part is blocked; decodePath decodes once and returns undefined for a malformed escape, and a decoded NUL or backslash blocks the request.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
<!-- okf:links:end -->
