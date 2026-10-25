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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/pageChromeStyles.ts
- src/page/modules/warningBanner.ts
- src/session/features/diagnostics.ts
- src/session/features/viewState.ts
tested_in_files:
- test/integration/mystDiagnostics.test.ts
- test/page/modules/warningBanner.test.ts
- test/visual/scenarioDefinitions2.ts
---

## A closable banner announces conf.py warnings

### Normative behavior

When a render succeeds with conf.py warnings, the extension SHALL show a one-line banner N MyST syntax warning(s) from conf.py with a warning icon, an Open Problems button and a Close the warning button, as a polite status after the status region in Tab order, that takes no layout room and stays closed for that document until the set of warning texts changes.

### Scenario (nominal): The banner shows the count and both buttons
- GIVEN two warnings and a successful render
- WHEN the preview renders
- THEN the banner shows the count (2 MyST syntax warnings from conf.py), the warning icon, an Open Problems button and a Close the warning button, as a polite status after the status region in Tab order

### Scenario (refusal): Other statuses show the full list instead
- GIVEN an error, stale, recovery or pending status
- WHEN the preview renders
- THEN the status region shows the full list instead of the banner

### Scenario (boundary): The banner takes no layout room
| Input | Outcome |
| --- | --- |
| The banner appears or closes | No content or scroll anchor moves |
| The banner shows | It sits in the 40 px gap left of the floating toolbar without covering it and scrolls away with the page top |
| A very narrow pane (460 px) | It stays on one line with an ellipsis and adds no sideways scroll |
| Light, dark and cream themes | It stays readable |

### Scenario (nominal): Open Problems opens the Problems view
| Input (the reader activates Open Problems) | Outcome |
| --- | --- |
| A trusted preview | The host's Problems view opens |
| A read-only or untrusted preview (a message already sent) | The host accepts `previewShowProblems` since it edits nothing; in Restricted Mode the banner itself has no Open Problems button |

The message carries only the envelope and passes the document gate.

### Scenario (nominal): Closing dismisses the banner for that document
- GIVEN the banner shown
- WHEN the reader activates the Close the warning button
- THEN the banner is removed at once without moving anything, the warning set key is sent, the host remembers it per document until VS Code restarts and hands it back on reload, so the banner stays closed after a reload and a second preview of the file shares the dismissal

### Scenario (boundary): The banner returns when the warning set changes
| Input (after a dismissal) | Outcome |
| --- | --- |
| A new warning text | The banner shows again |
| Only line numbers change | The banner stays closed |
| Only the order changes | The banner stays closed |

The warnings stay in the status region in every case.

### Scenario (boundary): Restricted Mode lists the warnings in the tooltip
- GIVEN an untrusted workspace
- WHEN the preview renders
- THEN no warning is published to the Problems view, the banner has no Open Problems button, its tooltip lists the warning lines and the Close the warning button is kept and closes the banner

### Related requirements
- SwRS-MDOKFSTUDIO-MYST-072: the conf.py warnings the banner announces.

### Verification notes
- Method: test/page/modules/warningBanner.test.ts ("CR 050: the banner text is short and counts the warnings": nominal; "CR 050: Open Problems asks the host to open the Problems view": Open Problems; "CR 050: closing removes the banner, tells the host the key and keeps it closed until the set changes": closing; "CR 050: the key names the warning set, whatever the order and the line of each warning": warning set; "CR 050: in Restricted Mode the banner has no Problems button and lists the warnings in its tooltip": Restricted Mode)
- Method: test/integration/mystDiagnostics.test.ts (run(): Restricted Mode publishes no warning to the Problems view)
- Method: test/visual/scenarioDefinitions2.ts (`myst/v${number}-conf-warning-banner-${mode ?? theme}-900`: nominal and layout in light, dark, cream and 460 px)
- Criteria: The visual family covers the layout checks only visually; the standalone variant has no assertion; other statuses showing the full list have no named test (untested).
