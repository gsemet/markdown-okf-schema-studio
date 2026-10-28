---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-042
uuid: 93fd5c9f-508f-479a-bcb8-c62af95684db
title: Typing is autosaved as the smallest single replacement
description: When a writer types in a block editor, the extension SHALL autosave
  the last text 400 milliseconds after the last keystroke, unless it equals the
  text last posted, posting it as one previewEditSave with final false that the
  host writes as the smallest single replacement of the text last written.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/mapping/textDiff.ts
- src/page/features/blockEditor.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/textDiff.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/session/blockReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Typing is autosaved as the smallest single replacement

### Normative behavior

When a writer types in a block editor, the extension SHALL autosave the last text 400 milliseconds after the last keystroke, unless it equals the text last posted, posting it as one previewEditSave with final false that the host writes as the smallest single replacement of the text last written.

### Scenario (nominal): Burst of typing
- GIVEN an open editor
- WHEN the writer types ten characters within 100 ms and stops
- THEN exactly one previewEditSave with final false is posted 400 ms after the last key, carrying the whole text
- GIVEN a pending autosave
- WHEN the writer types before the 400 ms elapse
- THEN the timer restarts and no message is posted yet

### Scenario (boundary): An autosave of unchanged text sends nothing
| Input | Outcome |
| --- | --- |
| The autosave timer fires with the text just posted | No message is posted |
| The text returned to the last posted text before the timer fired | No message is posted |

### Scenario (nominal): The host writes the smallest replacement
- GIVEN a block `Hello world` written to the document and a new text `Hello brave world`
- WHEN the host plans the edit
- THEN the edit replaces the empty range after `Hello ` with `brave `, offset by the start of the block

### Scenario (boundary): Identical text and pair boundaries
| Input | Outcome |
| --- | --- |
| New text equal to the last written text | There is no edit and nothing is written |
| Texts `x\r\n` and `x\n` | The range starts at offset 1, before the CR, never between the CR and the LF |
| Texts `a😀b` and `a😁b`, whose emoji share the high surrogate | The range is 1 to 3 and replaces both halves of the pair with the new emoji |

### Scenario (boundary): One save applied at a time, newest text kept
| Input | Outcome |
| --- | --- |
| A save being applied and two further saves received | When the running edit resolves, only the text of the last save is applied next |
| The pending text equals the text just written | No further edit is applied |

### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (`typing is saved once after the autosave delay, carrying the last text`: burst, restart, same text; `raw Markdown block edits autosave on input without disabling the textarea`: burst); the typed-and-reverted case follows from the code and is not asserted; real-input scenario scenarioParagraphBlurCommit. The delay is AUTOSAVE_DELAY_MS in src/page/pageSettings.ts.
- Method: test/core/mapping/textDiff.test.ts (`identical input yields an empty replacement`, `insertion, deletion and replacement in the middle`, `replacement reproduces the target for 200 seeded random pairs`, `a CRLF pair is never split`, `a surrogate pair is never split`: smallest replacement and pair boundaries).
- Method: test/core/edits/sourceEdits.test.ts (`a block text edit is the smallest replacement, offset by the block start`: smallest replacement, offset by the block start); real-input scenario scenarioTypingUndoGrouping (twenty characters reach the document as at most two small changes).
- Method: test/session/blockReq.requirements.test.ts (`the host applies one edit at a time and keeps only the newest text received meanwhile`: one save at a time).
- Criteria: The delay is 400 ms and the message sequence is as above; postBlockEditSave returns without posting when editedText equals lastPostedText; the replacement reproduces the new text when applied to the old text and no boundary of the replacement lies inside a pair; at most one applyEdits call is in flight per edit and pendingText holds the newest text.
