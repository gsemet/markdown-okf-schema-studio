---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-148
uuid: 3bace65b-fb1d-4958-9d49-2a057769e3ea
title: Document link picks a Markdown file and writes a doc role
description: When the writer presses Document link, the extension SHALL ask the
  host through previewPickDocument for a native file dialog on md and markdown
  files, keep the editor open while it is shown, and write {doc} with the picked
  path, relative to the document and without its extension, in place of the
  selection, or nothing when the dialog is cancelled.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-PALETTE-039
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editPalette.ts
- src/page/modules/inlineEditActions.ts
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/mapping/mystTargets.test.ts
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimePaletteActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Document link picks a Markdown file and writes a doc role

### Normative behavior

When the writer presses Document link, the extension SHALL ask the host through previewPickDocument for a native file dialog on md and markdown files, keep the editor open while it is shown, and write {doc} with the picked path, relative to the document and without its extension, in place of the selection, or nothing when the dialog is cancelled.

### Scenario (nominal): Picked

- GIVEN an open editor and the path ../guide/setup picked
- WHEN the host answers
- THEN the text is {doc}`../guide/setup` and the editor stayed open during the dialog

### Scenario (nominal): Dialog and path of the host

- GIVEN a trusted, saved document docs/a.md, previewPickDocument with a valid editId and the file docs/guide/setup.md picked
- WHEN the host handles it
- THEN the path is guide/setup; a native dialog opens in the folder of the document, filtered to md and markdown files, with the label Link document, and the answer is the picked file as a path relative to the document with forward slashes and without the md or markdown extension

### Scenario (refusal): Cancelled

- GIVEN the dialog cancelled
- WHEN the host answers
- THEN the answer is ok true with cancelled true, nothing is inserted, the text box has the focus and the next blur saves again

### Scenario (refusal): Refused answers

| Input | Outcome |
| --- | --- |
| a path on another Windows drive, or a name with a backtick, an angle bracket or a line break | ok false with the reason That file name cannot be written in a {doc} link. |
| a read-only preview | ok false with the read-only reason (SwRS-MDOKFSTUDIO-TRUST-005) |
| a document that is out of date or is not a file | ok false with the reason The preview is out of date, or the document is not a file. |
| a failed dialog | ok false with the message of the error (a value that is not an Error as its string) |
| a previewPickDocument message without a non-empty editId of at most 100 characters | ignored by the envelope check |

See SwRS-MDOKFSTUDIO-TRUST-052, SwRS-MDOKFSTUDIO-TRUST-005, SwRS-MDOKFSTUDIO-TRUST-065 and SwRS-MDOKFSTUDIO-TRUST-090.

### Scenario (boundary): Selection and path forms in the page

| Input | Outcome |
| --- | --- |
| a one-line selection | the role is written with the selected text and the path in angle brackets |
| a picked path with a backtick or an angle bracket | no edit |

### Verification notes

- Method: test/page/modules/editPalette.test.ts (T30: Document asks the host for a file and inserts the path; a cancelled pick inserts nothing; checks the picked and cancelled scenarios)
- Method: test/page/modules/editActions.test.ts, with its markers in test/page/modules/editActions.test.ts (T30: doc inserts {doc} with the picked path; checks the picked and boundary scenarios)
- Method: test/page/runtimePaletteActions.test.ts (T30: the editor stays open while the host's file dialog has the focus and the answer is inserted; a cancelled file dialog inserts nothing and the blur saves again; checks the picked and cancelled scenarios)
- Method: test/core/mapping/mystTargets.test.ts (docReference gives a POSIX path relative to the document, without the extension; checks the dialog and path scenario)
- Criteria: The dialog options and the answers of the host are deduced from the code (handlePickDocument); no integration test opens this dialog, so the dialog scenario and the refused answers are untested beyond docReference.
