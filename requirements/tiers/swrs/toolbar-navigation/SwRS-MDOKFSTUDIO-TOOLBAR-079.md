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
lifecycle: draft
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
- test/session/toolbarReq.requirements.test.ts
---

## Links in view are looked up in bounded batches

### Normative behavior

When a link with a navigation request scrolls into view, the extension SHALL ask the host once for the target of its request, in previewLinkDiscover messages of at most 64 requests, and the host answers with previewLinkTargets that lists, for each request in order, its kind and its path or reason.

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

### Known issues

- Known issue: a request is asked once per page (the page never forgets it), so a target file created or deleted later keeps its old tooltip until the page is replaced.

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-083: the bounds of the previewLinkDiscover message the host accepts.
- SwRS-MDOKFSTUDIO-TOOLBAR-085: how the page marks the links with the answer.

### Verification notes

- Method: test/page/modules/linkNavigation.test.ts (link discovery waits for the viewport and deduplicates bounded batches; anchor and external requests are not asked; same request twice; 130 links in batches of 64).
- Method: test/page/modules/toolbarReq.requirements.test.ts (without an intersection observer no link is looked up and clicks still reach the host).
- Method: test/session/toolbarReq.requirements.test.ts (the host answers a discovery with one target per request, in order; a discovery of another render gets no answer; a failed discovery shows a warning and sends no answer).
- Criteria: each request string is sent at most once per page; each message holds at most 64 requests; the skip pattern is the start of the request; one target per request in the order of the request; no previewLinkTargets after the render changed; showWarning is called once per failed batch.
