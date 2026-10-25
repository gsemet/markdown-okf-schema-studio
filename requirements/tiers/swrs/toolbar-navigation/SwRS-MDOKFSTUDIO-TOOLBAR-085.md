---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-085
uuid: c28f35cf-83ed-432c-8327-66aa68795d89
title: "A link shows its target kind in a tooltip without changing its target"
description: "When the page receives previewLinkTargets, the extension SHALL set on
  every link with a matching request the attribute data-sphinx-preview-link-state
  to the kind and the title to the path, else the reason, else the request, and keep
  the original navigation request and the look of the link unchanged."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/linkNavigation.ts
tested_in_files:
- test/page/modules/linkNavigation.test.ts
- test/page/modules/toolbarReq.requirements.test.ts
- test/page/runtimeContentPatch.test.ts
---

## A link shows its target kind in a tooltip without changing its target

### Normative behavior

When the page receives previewLinkTargets, the extension SHALL set on every link with a matching request the attribute data-sphinx-preview-link-state to the kind and the title to the path, else the reason, else the request, and keep the original navigation request and the look of the link unchanged.

### Scenario (nominal): Kind and tooltip

| Given | Outcome |
| --- | --- |
| a local target with a path | the link has state local and the path as its title |
| a blocked target with a reason | the link has state blocked and the reason as its title |
| a target with neither path nor reason | the link has the request as its title |
| two links with the same request | both are marked |

### Scenario (boundary): The hint never replaces the target

| Given | When | Then |
| --- | --- | --- |
| a link with request ../x.md and a hint with another path | the hint is applied, then the link is clicked | the navigation request is still ../x.md and the click posts it |
| a link with a blocked hint | the link is clicked | the original request is posted and the host shows the refusal |

### Scenario (boundary): A missing or blocked target is shown only in the tooltip

- GIVEN a link to a missing file whose hint is blocked, and a link to an existing file
- WHEN the links are rendered
- THEN the first has the state attribute blocked and its tooltip holds the reason, no stylesheet rule matches that attribute, and it looks the same as the valid link

### Scenario (nominal): Hints survive an in-place content update

| Given | When | Then |
| --- | --- | --- |
| a link with a hint and a content update that keeps the link | the update is applied | the new link element has the same state and title again, without a new request |
| a content update that adds a link | the update is applied | the new link is observed and looked up when it comes into view |

### Known issues

- Known issue: a link to a missing or blocked target looks like a valid link; only the tooltip and the warning after a click tell the difference.

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-079: the lookup that produces previewLinkTargets.
- SwRS-MDOKFSTUDIO-TOOLBAR-077: the click that follows the original request.

### Verification notes

- Method: test/page/modules/linkNavigation.test.ts (kind and tooltip; discovery hints never replace the original target; after a rescan, discovery and target hints apply to the new links; rescan observes only the links that are not observed yet).
- Method: test/page/modules/toolbarReq.requirements.test.ts (a missing or blocked target is shown only in the tooltip; the absence of a rule on data-sphinx-preview-link-state is checked by scanning src/ for a selector).
- Method: test/page/runtimeContentPatch.test.ts (links of the new content keep known target hints and discover new targets).
- Criteria: state = kind, title = path ?? reason ?? request; data-sphinx-preview-navigation is unchanged by applyTargets; no CSS selector uses data-sphinx-preview-link-state; no second discovery for a known request, new requests are discovered.
