---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-079
uuid: c5136286-bbe8-4b58-b647-2355a863c436
title: "Links in view are looked up in bounded batches"
description: "When a link with a navigation request scrolls into view, the extension
  SHALL ask the host once for the target of its request, in previewLinkDiscover messages
  of at most 64 requests, and the host answers with previewLinkTargets that lists,
  for each request in order, its kind and its path or reason."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/linkNavigation.ts
- src/session/features/links.ts
tested_in_files:
- test/page/modules/linkNavigation.test.ts
- test/page/modules/toolbarReq.requirements.test.ts
- test/session/eventFanOut.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Links in view are looked up in bounded batches

### Normative behavior

When a link with a navigation request scrolls into view, the extension SHALL ask the host once for the target of its request, in previewLinkDiscover messages of at most 64 requests, and the host answers with previewLinkTargets that lists, for each request in order, its kind and its path or reason. When the host looks for a file by name to answer a request, it SHALL skip the folders node_modules, .git, _build, .venv and venv, SHALL NOT apply the VS Code files.exclude setting (an explicit exclude replaces it, so files hidden by files.exclude can be found), and SHALL stop at 50 matching files per root, so a name matching more files may be truncated before it is resolved or reported as ambiguous.

### Scenario (nominal): Link scrolls in

- GIVEN a long document with a link below the fold
- WHEN the link intersects the viewport
- THEN its request is sent once in a previewLinkDiscover message and the link is no longer observed

### Scenario (boundary): Same request twice

- GIVEN two links with the same request
- WHEN both come into view
- THEN the request is sent once

### Scenario (boundary): Batches of at most 64

| Requests waiting | Outcome |
| --- | --- |
| 130 distinct requests in view | three messages carry 64, 64 and 2 requests |
| three requests | one message carries three requests |

### Scenario (refusal): Requests that are not looked up

| Link request or page | Outcome |
| --- | --- |
| #section | no previewLinkDiscover is sent for it |
| okf-link:... | no previewLinkDiscover is sent for it |
| https://x and http://x | no previewLinkDiscover is sent for them |
| mailto:a@b | no previewLinkDiscover is sent for it |
| other.md (relative link) | its request is sent when it comes into view |
| a page whose window has no IntersectionObserver | no discovery message is sent and clicks still reach the host (see SwRS-MDOKFSTUDIO-TOOLBAR-077) |
| a page with the observer, a link that intersects | its request is sent |

### Scenario (boundary): Search by name

| Given | Outcome |
| --- | --- |
| a target named in a request that exists only below node_modules, .git, _build, .venv or venv | not found |
| a target hidden by the files.exclude setting | found |
| a name matching more than 50 files under one root | the search stops at 50 files; the answer may differ from the full set |

### Scenario (boundary): Content replaced

| Input | Outcome |
| --- | --- |
| The page content is replaced and the rescan finds new links | The new links are observed; a link still in the content is not observed twice |
| Links of the old content are gone from the page | The observer releases them, so they are not kept alive |

### Scenario (nominal): The host answers each request

- GIVEN requests for an existing file, a missing file and a javascript: link
- WHEN the host answers
- THEN previewLinkTargets lists a local target with the real path and two blocked targets with their reasons, in the order of the requests

### Scenario (refusal): No answer for another render

| Given | Outcome |
| --- | --- |
| a discovery of an older request id, or of another document or revision than the host's render | no previewLinkTargets is sent |
| a discovery in flight when a new render is shown | no answer is sent when the resolution ends |

### Scenario (refusal): A failed discovery

| Given | Outcome |
| --- | --- |
| a request whose resolution raises an error | the warning "Preview link discovery failed: {error}" is shown and nothing is answered for the batch |
| a preview closed meanwhile, when the error is raised | no warning is shown |

### Scenario (nominal): Links are asked again when the reader returns

| Given | When | Then |
| --- | --- | --- |
| a link already looked up and a file created or deleted since | the preview window regains focus or the preview becomes visible again | the requests of the links in view are sent again and the tooltip and the warning icon follow the answer |

### Known issues

- Known issue: a link name matching more than 50 files under one root is resolved from the first 50 found, not from all of them.
- Known issue: while the preview stays focused and visible, a file created or deleted meanwhile is not noticed; the links are asked again only when the focus or the visibility comes back, or when the page is replaced.

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-083: the bounds of the previewLinkDiscover message the host accepts.
- SwRS-MDOKFSTUDIO-TOOLBAR-085: how the page marks the links with the answer.

### Verification notes

- Method: test/page/modules/linkNavigation.test.ts (link discovery waits for the viewport and deduplicates bounded batches; anchor and external requests are not asked; same request twice; 130 links in batches of 64).
- Method: test/page/modules/linkNavigation.test.ts ("T22: rescan unobserves the links that the replaced content detached" and "T22: rescan keeps observing the links that are still in the content": content replaced).
- Method: test/page/modules/toolbarReq.requirements.test.ts (without an intersection observer no link is looked up and clicks still reach the host).
- Method: test/session/toolbarReq.requirements.test.ts (the host answers a discovery with one target per request, in order; a discovery of another render gets no answer; a failed discovery shows a warning and sends no answer).
- Method: test/session/eventFanOut.test.ts (the search for a link target skips node_modules, .git, _build, .venv and venv and returns at most 50 files).
- Criteria: each request string is sent at most once per page until the window regains focus or the preview becomes visible, which forgets what was asked; each message holds at most 64 requests; the search passes DISCOVERY_EXCLUDE and MAX_DISCOVERED_FILES (src/session/features/links.ts) to findFiles; the skip pattern is the start of the request; one target per request in the order of the request; no previewLinkTargets after the render changed; showWarning is called once per failed batch.
