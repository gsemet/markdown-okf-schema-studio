---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-067
uuid: 159b9f46-bc8b-486d-a5ed-9b5e63ff9179
title: A navigation saves the open field editor as an unchecked flush
description: When a navigation or a host flush request occurs while a field or
  key editor is open, the extension SHALL save the typed text as a flush before
  leaving, which the host writes as typed, skipping the type, YAML and schema
  checks.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/frontmatterEdit.ts
- src/page/features/blockEditor.ts
- src/page/features/frontmatterEditor.ts
- src/page/features/frontmatterValueEditor.ts
- src/session/features/frontmatter.ts
tested_in_files:
- test/core/edits/frontmatterEdit.test.ts
- test/core/preview/flushWait.test.ts
- test/page/runtimeEditorFlush.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-068
- SwRS-MDOKFSTUDIO-FMEDIT-069
- SwRS-MDOKFSTUDIO-FMEDIT-070
- SwRS-MDOKFSTUDIO-FMEDIT-071
- SwRS-MDOKFSTUDIO-FMEDIT-085
---

## A navigation saves the open field editor as an unchecked flush

### Normative behavior

When a navigation or a host flush request occurs while a field or key editor is open, the extension SHALL save the typed text as a flush before leaving, which the host writes as typed, skipping the type, YAML and schema checks.

### Scenario (nominal): A navigation saves the typed text as a flush
- GIVEN a YAML field editor holding invalid YAML and a click on a link to another file
- WHEN the page navigates
- THEN a save with flush true and the text as typed is posted before the navigation

### Scenario (boundary): What the flush sends for each editor
| Editor open when the page flushes | Text sent |
| --- | --- |
| a number field with a bad number | the number as typed text |
| a key editor with surrounding spaces | the key trimmed |
| a key editor with an empty key | the old key is kept |

### Scenario (nominal): Hiding or closing the page saves the open editor
| Event | Outcome |
| --- | --- |
| the page receives pagehide, or visibilitychange to hidden, with a field editor open and text typed | one previewFrontmatterSave with flush true and the typed text is posted |
| the page is hidden with no field editor open | no frontmatter save is posted |

### Scenario (nominal): The host writes a flush save as typed
- GIVEN a flush save of the text [ for a YAML field
- WHEN the host plans it
- THEN the text is written as a string and the plan needs no schema check

### Scenario (boundary): A flush skips the type check
- GIVEN a flush save of three for a number field with a schema
- WHEN the host plans it
- THEN the value is written instead of the stale-field refusal

Other refusals (stale field, bad key, YAML that cannot be patched) still apply to a flush save.

### Scenario (refusal): A refused flush warns that the typed text was dropped
| Save refused by the host | Outcome |
| --- | --- |
| a flush save of the field status, with a reason | a warning reads "Markdown OKF-Schema Studio could not save the text you typed in the frontmatter field "status": {reason}. That text was not saved." |
| a normal save | no host warning is shown, only the error in the editor |

### Scenario (boundary): A normal save carries no flush flag
| Save posted | Message |
| --- | --- |
| a field editor committed with Enter or by leaving it | no flush property |
| an editor flushed by a navigation | flush true |

### Scenario (nominal): A refused plain save is saved again as a flush before a navigation
- GIVEN a plain save in flight and a navigation waiting
- WHEN the host refuses the save
- THEN the editor is enabled again, the typed text is posted again as a flush, then the navigation goes on

### Scenario (boundary): Waiting for a plain save
| Pending plain save | Outcome |
| --- | --- |
| gets no result | the navigation goes on after the bounded wait of about 1.5 seconds |
| was accepted before the flush | it is not saved twice |

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-016: the host checks that a flush save skips.
- SwRS-MDOKFSTUDIO-FMEDIT-054: the shape of the frontmatter save message that carries the flush flag.

### Verification notes
- Method: test/page/runtimeEditorFlush.test.ts (scenarios: CR 025 a host flush request saves an open frontmatter field and marks it as a flush, invalid YAML is still sent on a flush, what the flush sends for each editor, pagehide and a hidden page save an open frontmatter editor as a flush, a normal frontmatter save does not carry the flush flag, a blur save refused before a host flush is saved again as a flush, an accepted one is not saved twice, no result still answers after a bounded wait).
- Method: test/core/edits/frontmatterEdit.test.ts (scenarios: the host writes a flush save as typed, a flush skips the type check).
- Method: test/core/preview/flushWait.test.ts and inspection of postEditError (scenario: a refused flush warns that the typed text was dropped).
- Criteria: the page is about to be replaced after a flush, so only a host warning is visible; the preview then shows the validation error of the written text.
