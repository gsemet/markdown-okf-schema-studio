---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-010
uuid: 2c47415e-ff9b-4254-92fc-1b075af74ac7
title: Keep typed metadata text when leaving the editor
description: When a writer navigates away or the preview needs to flush an open
  field editor, the Studio SHALL save the typed text as is instead of dropping
  it, and warn if it is refused.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I do not lose what I typed in a metadata field when I
  follow a link or go back.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMEDIT-008
default_owner_email: gaetan@xeberon.net
---

## Keep typed metadata text when leaving the editor

### Normative behavior

When a writer navigates away or the preview needs to flush an open field editor, the Studio SHALL save the typed text as is instead of dropping it, and warn if it is refused.

### Preserved stakeholder intent

Writers expect that following a link or going back never discards a metadata edit in progress.

As a writer, I do not lose what I typed in a metadata field when I follow a link or go back.

### Rationale and constraints

- A flush saves the typed text without the type and schema check, so the preview shows any problem.
- A plain save refused by the host is saved again as a flush when a navigation waits for it; a save that gets no result still lets the navigation go after a bounded wait.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
<!-- okf:links:end -->
