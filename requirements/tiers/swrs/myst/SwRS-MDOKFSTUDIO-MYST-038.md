---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-038
uuid: 0bf9bdd0-2e90-4a37-b7d8-1efb9ea673ea
title: "The anchor icon opens a rename field that sends valid names"
description: "When a reader clicks the anchor icon of a label in edit mode, the extension
  SHALL open a Rename label popover with a prefilled, selected, focused Label name
  field before block click handling, send a rename only for a changed valid name and
  show the answer of the host in the field."
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/labelRename.ts
- src/page/modules/labelRename.ts
- src/session/pageMessages.ts
tested_in_files:
- test/core/mapping/labelRename.test.ts
- test/core/protocol/pageToHost.test.ts
- test/page/modules/labelRename.test.ts
- test/page/modules/renderReq.labelRename.requirements.test.ts
- test/session/trustReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The anchor icon opens a rename field that sends valid names

### Normative behavior

When a reader clicks the anchor icon of a label in edit mode, the extension SHALL open a Rename label popover with a prefilled, selected, focused Label name field before block click handling, send a rename only for a changed valid name and show the answer of the host in the field.

### Scenario (nominal): The click opens the rename field
- GIVEN edit mode on and the label `(draft_1)=` before a paragraph, which shows an anchor icon with a pointer cursor
- WHEN the anchor icon is clicked
- THEN a dialog Rename label opens under it with the Label name field prefilled with `draft_1`, selected and focused, and no block editor opens

### Scenario (refusal): Clicks that open no field
| Input | Outcome |
| --- | --- |
| Anchor icon clicked with edit mode off | Nothing opens and the icon stays a link target |

### Scenario (nominal): Enter sends the rename or closes
| Input (Enter pressed in the field) | Outcome |
| --- | --- |
| A changed valid name | One rename with the label line is posted |
| The name left unchanged | The field closes and nothing is posted |

### Scenario (refusal): Invalid names are not sent
| Input (Enter pressed in the field) | Outcome |
| --- | --- |
| `bad name` (a space) | The message is shown and nothing is posted |
| An empty name | The same message is shown and nothing is posted |
| A 101-character name | The same message is shown and nothing is posted |
| A name with characters other than letters, digits and `_ . : -` | The same message is shown and nothing is posted |

The message reads: Use letters, digits and _ . : - only (100 characters at most). The host and the message validator repeat the check.

### Scenario (nominal): Labels starting with a symbol
| Input | Outcome |
| --- | --- |
| Anchor icon of the label `(_draft)=`, `(.hidden)=` or `(-dash)=` clicked in edit mode | The rename field opens prefilled and selected, like for any other label, and no block editor opens |
| `-new` typed for `_draft` and Enter pressed | One rename is posted |

The anchor icon, the field and the host share one name pattern: letters, digits and `_ . : -`, 100 characters at most. Every label that shows an icon can be renamed.

### Scenario (refusal): A rename from a stale render
| Input | Outcome |
| --- | --- |
| A rename sent from an older render | The host answers ok false with The label is no longer on that line. Refresh the preview.; the field shows it and is editable again |

### Scenario (boundary): Escape or an outside press closes the field
| Input (field open) | Outcome |
| --- | --- |
| Escape | The field closes and nothing is sent |
| Pointer press outside the popover and the icon | The field closes and nothing is sent |

### Scenario (nominal): A successful rename reports the remaining uses
| Input (rename succeeds) | Outcome |
| --- | --- |
| Two `{ref}` uses of the old name | The field shows Renamed. 2 uses of "old" remain in this document. |
| No `{ref}` use, or `{doc}` and `{numref}` uses only | The field shows Renamed. No use of the old name remains. |

Only `{ref}` forms are counted. The field closes itself 5 s after the success message; a new rename or Escape within the 5 s makes the field follow the new action and no stale close occurs.

### Scenario (boundary): Progress, refusal and silence of the host
| Input | Outcome |
| --- | --- |
| A posted rename the host has not answered | The field is disabled and reads Renaming... |
| An answer with another edit id | The answer is ignored |
| A refusal with a reason | The reason is shown and the field is editable again |
| No host answer within 6 s | The field is editable again with The editor did not answer. Try again. |
| An answer arriving before 6 s | The answer is matched by edit id, the timer is cleared and no timeout message is shown |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-041: an open editor blocks a rename; see it for the refusal reason.
- SwRS-MDOKFSTUDIO-MYST-045: the host side of the rename.
- SwRS-MDOKFSTUDIO-MYST-051: the message the field posts and the answer it receives.

### Verification notes
- Method: test/page/modules/labelRename.test.ts ("a click on the anchor in edit mode opens a prefilled, selected field before the block handlers": click opens and edit mode off; "Enter posts one rename with the label line; Escape cancels": Enter and Escape; "an invalid or unchanged name is not sent": invalid names and unchanged name; "the result shows how many {ref} uses of the old name remain": remaining uses, progress and refusal)
- Method: test/page/modules/renderReq.labelRename.requirements.test.ts ("without an answer after 6 s the field is editable again with a message; an answer clears the timer": silence of the host; "a successful rename closes the field 5 s later and a new action cancels the stale close": 5 s close; "a label starting with an underscore, dot or hyphen opens the rename field like any other": symbol label)
- Method: test/session/trustReq.requirements.test.ts ("a label rename from an older render is answered with the stale-line refusal": stale render, other document, disposed preview)
- Method: test/core/mapping/labelRename.test.ts ("the renderer, the page and the host share one label name pattern": shared pattern; "label names follow the MyST pattern and the length limit": invalid names; "counts {ref} uses with and without a title, not other roles or names": remaining uses)
- Method: test/core/protocol/pageToHost.test.ts ("previewLabelRename validates the line and both label names": the validator repeats the name check)
- Method: the pointer press outside the popover has no named test (untested)
- Criteria: The icon shows a pointer cursor in edit mode only; no message is posted on a closed field, an invalid name or an unchanged name; page and host both reject invalid names; matching of the answer is by edit id; `{ref}`-only counting and the message texts match.
