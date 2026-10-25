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
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMEDIT-008; no marker expected."
derives_from: []
user_need: As a writer, I do not lose what I typed in a metadata field when I
  follow a link or go back.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMEDIT-008
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
