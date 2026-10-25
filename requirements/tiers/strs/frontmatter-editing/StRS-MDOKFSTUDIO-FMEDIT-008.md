---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-008
uuid: 91735d1e-d0c9-4d6e-9c80-607ac7b80020
title: Metadata edits keep the source intact, follow the schema and never lose
  text
description: When a writer edits a metadata field, the Studio SHALL change only
  the lines of that field, refuse with a reason any edit whose result would not
  parse, would alter other keys, does not match the schema, targets a stale
  preview or runs in an untrusted workspace, and save typed text instead of
  dropping it when the writer navigates away.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer or reviewer, I expect a metadata edit to leave comments,
  quoting, line endings and the rest of the document unchanged, with the diff
  containing only the edited field; I am protected from saving metadata that the
  schema rejects or that no longer matches the document, and I do not lose what
  I typed when I follow a link or go back.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-109
- SwRS-MDOKFSTUDIO-BLOCK-193
- SwRS-MDOKFSTUDIO-FMEDIT-002
- SwRS-MDOKFSTUDIO-FMEDIT-016
- SwRS-MDOKFSTUDIO-FMEDIT-018
- SwRS-MDOKFSTUDIO-FMEDIT-024
- SwRS-MDOKFSTUDIO-FMEDIT-025
- SwRS-MDOKFSTUDIO-FMEDIT-029
- SwRS-MDOKFSTUDIO-FMEDIT-030
- SwRS-MDOKFSTUDIO-FMEDIT-032
- SwRS-MDOKFSTUDIO-FMEDIT-039
- SwRS-MDOKFSTUDIO-FMEDIT-043
- SwRS-MDOKFSTUDIO-FMEDIT-044
- SwRS-MDOKFSTUDIO-FMEDIT-045
- SwRS-MDOKFSTUDIO-FMEDIT-046
- SwRS-MDOKFSTUDIO-FMEDIT-047
- SwRS-MDOKFSTUDIO-FMEDIT-048
- SwRS-MDOKFSTUDIO-FMEDIT-049
- SwRS-MDOKFSTUDIO-FMEDIT-051
- SwRS-MDOKFSTUDIO-FMEDIT-052
- SwRS-MDOKFSTUDIO-FMEDIT-053
- SwRS-MDOKFSTUDIO-FMEDIT-054
- SwRS-MDOKFSTUDIO-FMEDIT-058
- SwRS-MDOKFSTUDIO-FMEDIT-059
- SwRS-MDOKFSTUDIO-FMEDIT-060
- SwRS-MDOKFSTUDIO-FMEDIT-061
- SwRS-MDOKFSTUDIO-FMEDIT-062
- SwRS-MDOKFSTUDIO-FMEDIT-063
- SwRS-MDOKFSTUDIO-FMEDIT-064
- SwRS-MDOKFSTUDIO-FMEDIT-067
- SwRS-MDOKFSTUDIO-FMEDIT-068
- SwRS-MDOKFSTUDIO-FMEDIT-069
- SwRS-MDOKFSTUDIO-FMEDIT-070
- SwRS-MDOKFSTUDIO-FMEDIT-071
- SwRS-MDOKFSTUDIO-FMEDIT-072
- SwRS-MDOKFSTUDIO-FMEDIT-073
- SwRS-MDOKFSTUDIO-FMEDIT-079
- SwRS-MDOKFSTUDIO-FMEDIT-080
- SwRS-MDOKFSTUDIO-FMEDIT-083
- SwRS-MDOKFSTUDIO-FMEDIT-085
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
---

## Metadata edits keep the source intact, follow the schema and never lose text

### Normative behavior

When a writer edits a metadata field, the Studio SHALL change only the lines of that field, refuse with a reason any edit whose result would not parse, would alter other keys, does not match the schema, targets a stale preview or runs in an untrusted workspace, and save typed text instead of dropping it when the writer navigates away.

### Preserved stakeholder intent

As a writer or reviewer, I expect a metadata edit to leave comments, quoting, line endings and the rest of the document unchanged, with the diff containing only the edited field; I am protected from saving metadata that the schema rejects or that no longer matches the document, and I do not lose what I typed when I follow a link or go back.

### Rationale and constraints

- Quoting style, folded or literal headers, comments, fences, the body and line endings are preserved; anchored or aliased values fall back to a whole-block rewrite.
- Every edit is re-parsed and refused when it would lose, duplicate or corrupt a key.
- A refusal explains itself and never leaves the document half-edited.
- The schema check covers type, enum, null and conditional rules; link problems do not block a save.
- Malformed page messages are ignored without a reply.
- Known issue: the stale-field message is shared by stale renders and schema mismatches.
- When a writer navigates away or the preview needs to flush an open field editor, the typed text is saved as is instead of being dropped, and a warning shows if it is refused.
- A flush saves the typed text without the type and schema check, so the preview shows any problem.
- A plain save refused by the host is saved again as a flush when a navigation waits for it; a save that gets no result still lets the navigation go after a bounded wait.
- While a field editor is open, refresh, checkbox toggles, block selection and block moves are blocked and the properties table stays out of block selection, movement and navigation: toolbar Refresh is disabled and checkbox toggles are refused with a status message.
- Known issue: a content patch of the page closes an open field editor and drops its text, and the waiting properties update.
- ArrowUp from the first block editor does not step into the properties table.
