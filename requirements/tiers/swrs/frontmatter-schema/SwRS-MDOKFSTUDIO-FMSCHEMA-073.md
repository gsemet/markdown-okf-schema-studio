---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-073
uuid: 79fa8d77-0296-4b3b-be82-3d980dfb8f40
title: A resolving frontmatter link opens its target, others are refused with a
  warning
description: "When a writer activates a frontmatter link (click or Enter in read mode,
  Cmd or Ctrl and click in edit mode), the extension SHALL open a resolving target
  in the editor at the marker line when the annotation has a `basename_marker`, keeping
  the query and fragment and recording the jump in the Back and Next history, and
  otherwise open nothing and show the warning \"Markdown OKF-Schema Studio could not
  follow the link: {reason}\" with the problem message as the reason."
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-FMSCHEMA-063
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/links.ts
tested_in_files:
- test/integration/previewEditing.test.ts
- test/session/links.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-074
- SwRS-MDOKFSTUDIO-FMSCHEMA-082
---
## A resolving frontmatter link opens its target, others are refused with a warning

### Normative behavior

When a writer activates a frontmatter link (click or Enter in read mode, Cmd or Ctrl and click in edit mode), the extension SHALL open a resolving target in the editor at the marker line when the annotation has a `basename_marker`, keeping the query and fragment and recording the jump in the Back and Next history, and otherwise open nothing and show the warning "Markdown OKF-Schema Studio could not follow the link: {reason}" with the problem message as the reason.

### Scenario (nominal): Follow with a marker

- GIVEN a valid link whose annotation has a basename_marker found at line 10 of the target
- WHEN the writer presses Enter on it in read mode
- THEN the target opens in the editor at line 10 and the history gains an entry

### Scenario (nominal): Follow without a marker line

| Input | Outcome |
| --- | --- |
| A valid link whose marker is carried by no line of the target | The target still opens, at the top |
| A filename-stem link | Re-resolved at click time, then opened |

### Scenario (nominal): Edit mode

- GIVEN the preview is in edit mode and the link sits in an editable value cell
- WHEN the writer clicks the link without a modifier
- THEN the field editor opens and the link is not followed; Cmd or Ctrl and click follows it

### Scenario (refusal): Unusable link

| Input | Outcome |
| --- | --- |
| A link whose target does not exist, activated through its navigation request | No editor is opened and the history is unchanged; VS Code shows the warning with the E10 message as the reason |
| A document-relative link outside the workspace with allowOutsideWorkspaceLinks false | No editor is opened |
| An invalid or unavailable link | Not followed |

### Scenario (boundary): Link result without a message

- GIVEN a link result without a message
- WHEN the request is handled
- THEN the reason reads The frontmatter link is unavailable.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-063: the link, its status and its tooltip.
- SwRS-MDOKFSTUDIO-FMSCHEMA-050: the resolution that decides whether the link is usable.

### Verification notes

- Method: test/integration/previewEditing.test.ts (follow with a marker, edit mode, broken link, outside link, warning with its reason, no message), test/session/links.test.ts (the marker line is found with the identity of the text the link was analysed from).
- Criteria: Filename-stem links are re-resolved at click time. When no line carries the marker, the target still opens, at the top. The refusal opens nothing: no editor is opened and the history is unchanged. The warning is shown once per activation.
