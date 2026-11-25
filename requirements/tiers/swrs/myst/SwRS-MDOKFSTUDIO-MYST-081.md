---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-081
uuid: fa172f3f-7804-4283-8c0b-9b8e0ad6b125
title: "A closable banner announces conf.py warnings"
description: "When a render succeeds with conf.py warnings, the extension SHALL show
  a one-line banner N MyST syntax warning(s) from conf.py with a warning icon, an
  Open Problems button and a Close the warning button, as a polite status after the
  status region in Tab order, that takes no layout room and stays closed for that
  document until the set of warning texts changes."
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
scenarios:
- id: S1
  title: The banner shows the count and both buttons
- id: S2
  title: Other statuses show the full list instead
- id: S3
  title: The banner takes no layout room
- id: S4
  title: Open Problems opens the Problems view
- id: S5
  title: A malformed or mismatched previewShowProblems is ignored
- id: S6
  title: Closing dismisses the banner for that document
- id: S7
  title: The banner returns when the warning set changes
- id: S8
  title: The memory of closed banners is bounded
- id: S9
  title: Restricted Mode lists the warnings in the tooltip
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/pageChromeStyles.ts
- src/page/modules/warningBanner.ts
- src/session/features/diagnostics.ts
- src/session/features/viewState.ts
- src/session/workspaceChoices.ts
tested_in_files:
- test/core/preview/previewStylesGutter.test.ts
- test/core/protocol/pageToHost.test.ts
- test/page/modules/warningBanner.test.ts
- test/session/commentAuthorResource.test.ts
- test/session/trustReq.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-082
- SwRS-MDOKFSTUDIO-MYST-083
- SwRS-MDOKFSTUDIO-MYST-084
- SwRS-MDOKFSTUDIO-MYST-085
- SwRS-MDOKFSTUDIO-MYST-086
---

## A closable banner announces conf.py warnings

### Normative behavior

When a render succeeds with conf.py warnings, the extension SHALL show a one-line banner N MyST syntax warning(s) from conf.py with a warning icon, an Open Problems button and a Close the warning button, as a polite status after the status region in Tab order, that takes no layout room and stays closed for that document until the set of warning texts changes.

### Scenario S1 (nominal): The banner shows the count and both buttons
- GIVEN two warnings and a successful render
- WHEN the preview renders
- THEN the banner shows the count (2 MyST syntax warnings from conf.py), the warning icon, an Open Problems button and a Close the warning button, as a polite status after the status region in Tab order

### Scenario S2 (refusal): Other statuses show the full list instead
- GIVEN an error, stale, recovery or pending status
- WHEN the preview renders
- THEN the status region shows the full list instead of the banner

### Scenario S3 (boundary): The banner takes no layout room
| Input | Outcome |
| --- | --- |
| The banner appears or closes | No content or scroll anchor moves |
| The banner shows | It sits in the 40 px gap left of the floating toolbar without covering it and scrolls away with the page top; it keeps 156 px clear at the right (the four-button width of the toolbar main row, its 14 px margin and 8 px of clearance), with the toolbar expanded or collapsed |
| A very narrow pane (460 px) | It stays on one line with an ellipsis and adds no sideways scroll |
| Light, dark and cream themes | It stays readable |

### Scenario S4 (nominal): Open Problems opens the Problems view
| Input (the reader activates Open Problems) | Outcome |
| --- | --- |
| A trusted preview | The host's Problems view opens |
| An untrusted preview (a message already sent) | The host accepts `previewShowProblems` since it edits nothing; in Restricted Mode the banner itself has no Open Problems button |

The message type previewShowProblems (page to host) carries the envelope fields only (documentId, revision, requestId), no further field, and passes the document gate (SwRS-MDOKFSTUDIO-TRUST-052 for the envelope, SwRS-MDOKFSTUDIO-TRUST-065 for the gate).

### Scenario S5 (refusal): A malformed or mismatched previewShowProblems is ignored
| Input | Outcome |
| --- | --- |
| previewShowProblems without the envelope | not a registered message; ignored, no handler runs |
| previewShowProblems whose documentId is not the shown document | dropped by the document gate; the Problems view is not opened |

### Scenario S6 (nominal): Closing dismisses the banner for that document
- GIVEN the banner shown
- WHEN the reader activates the Close the warning button
- THEN the banner is removed at once without moving anything, the warning set key is sent, the host remembers it per document until VS Code restarts and hands it back on reload, so the banner stays closed after a reload and a second preview of the file shares the dismissal

### Scenario S7 (boundary): The banner returns when the warning set changes
| Input (after a dismissal) | Outcome |
| --- | --- |
| A new warning text | The banner shows again |
| Only line numbers change | The banner stays closed |
| Only the order changes | The banner stays closed |

The warnings stay in the status region in every case.

### Scenario S8 (boundary): The memory of closed banners is bounded
| Input | Outcome |
| --- | --- |
| A banner closed for a 201st document in one session | The least recently used dismissal is forgotten (that document shows its banner again) and the memory keeps at most 200 documents |

### Scenario S9 (boundary): Restricted Mode lists the warnings in the tooltip
- GIVEN an untrusted workspace
- WHEN the preview renders
- THEN no warning is published to the Problems view, the banner has no Open Problems button, its tooltip lists the warning lines and the Close the warning button is kept and closes the banner

### Related requirements
- SwRS-MDOKFSTUDIO-MYST-072: the conf.py warnings the banner announces.

### Verification notes
- Method: test/page/modules/warningBanner.test.ts ("CR 050: the banner text is short and counts the warnings": nominal; "CR 050: Open Problems asks the host to open the Problems view": Open Problems; "CR 050: closing removes the banner, tells the host the key and keeps it closed until the set changes": closing; "CR 050: the key names the warning set, whatever the order and the line of each warning": warning set; "CR 050: in Restricted Mode the banner has no Problems button and lists the warnings in its tooltip": Restricted Mode)
- Method: test/core/protocol/pageToHost.test.ts (previewShowProblems registered; the envelope is required)
- Method: test/session/trustReq.requirements.test.ts (previewShowProblems handled for the shown document and dropped for another one)
- Method: test/core/preview/previewStyles.test.ts ("the warning banner keeps clear of the four-button-wide toolbar, expanded or collapsed": the 156 px reserve and no collapsed override)
- Method: test/session/commentAuthorResource.test.ts ("the closed warning banners of a session are bounded to the most recent documents": bounded memory)
- Method: test/visual/scenarioDefinitions2.ts (`myst/v${number}-conf-warning-banner-${mode ?? theme}-900`: nominal and layout in light, dark, cream and 460 px)
- Criteria: The visual family covers the layout checks only visually; the standalone variant has no assertion; other statuses showing the full list have no named test (untested).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-MYST-082](SwRS-MDOKFSTUDIO-MYST-082.md): The banner takes no layout room
  - [SwRS-MDOKFSTUDIO-MYST-083](SwRS-MDOKFSTUDIO-MYST-083.md): Open Problems opens the Problems view
  - [SwRS-MDOKFSTUDIO-MYST-084](SwRS-MDOKFSTUDIO-MYST-084.md): Closing the banner dismisses it for that document
  - [SwRS-MDOKFSTUDIO-MYST-085](SwRS-MDOKFSTUDIO-MYST-085.md): The banner returns when the warning set changes
  - [SwRS-MDOKFSTUDIO-MYST-086](SwRS-MDOKFSTUDIO-MYST-086.md): In Restricted Mode the banner lists warnings in its tooltip
<!-- okf:links:end -->
