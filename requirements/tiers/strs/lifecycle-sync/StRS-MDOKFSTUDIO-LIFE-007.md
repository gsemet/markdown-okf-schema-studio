---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-007
uuid: 9f060b5a-48a4-453f-8ba3-652c55267975
title: The reader knows the render state and why a preview has no source
description: While a preview waits for a render, shows a render that failed,
  recovers from one or has no usable source file, the Studio SHALL say so in the
  preview and, for a missing source, say why.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I can tell whether the preview is current, still
  rendering, stale after an error or recovered, and I am told whether the file
  was deleted, renamed, is not a Markdown file or could not be restored.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-018
- SwRS-MDOKFSTUDIO-LIFE-049
- SwRS-MDOKFSTUDIO-LIFE-055
- SwRS-MDOKFSTUDIO-LIFE-059
- SwRS-MDOKFSTUDIO-LIFE-062
- SwRS-MDOKFSTUDIO-LIFE-069
- SwRS-MDOKFSTUDIO-LIFE-127
default_owner_email: gaetan@xeberon.net
---

## The reader knows the render state and why a preview has no source

### Normative behavior

While a preview waits for a render, shows a render that failed, recovers from one or has no usable source file, the Studio SHALL say so in the preview and, for a missing source, say why.

### Preserved stakeholder intent

As a reader, I can tell whether the preview is current, still rendering, stale after an error or recovered, and I am told whether the file was deleted, renamed, is not a Markdown file or could not be restored.

### Rationale and constraints

- A failed render keeps the last good page on screen and marks it stale.
- A slow render over a shown page announces itself in a small notice that does not move the page.
- The states are announced politely to assistive technology.
- The preview comes back by itself when the file is created again.

### Main paths

#### Path 1: Wait for a render

1. A new preview waits for its render
   - SwRS-MDOKFSTUDIO-LIFE-049: the status reads Preview pending, with a pending notice for a slow render
   - Option SwRS-MDOKFSTUDIO-LIFE-055 (refusal): a pending notice that is oversized or malformed is ignored
2. The status reads Preview ready
   - Option SwRS-MDOKFSTUDIO-LIFE-049 (refusal): a failed render is labelled in the status

#### Path 2: The source is gone

1. The Markdown file of a preview is missing
   - SwRS-MDOKFSTUDIO-LIFE-062: the page is replaced by the status Preview source missing with the reason of the case
   - Option SwRS-MDOKFSTUDIO-LIFE-127 (refusal): a saved state that cannot be restored shows the same status with its reason
2. The status says Preview source missing
   - SwRS-MDOKFSTUDIO-LIFE-062: the file is created and the source is rendered again
   - Option SwRS-MDOKFSTUDIO-LIFE-062 (refusal): a created file that is not the source changes nothing
3. The preview shows the file again

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-018](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-018.md): The Open With editor shows its own Markdown file
  - [SwRS-MDOKFSTUDIO-LIFE-049](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-049.md): The status names the render state and shows pending, failed and recovered notices
  - [SwRS-MDOKFSTUDIO-LIFE-055](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-055.md): The page ignores a pending notice with an oversized or malformed field
  - [SwRS-MDOKFSTUDIO-LIFE-059](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-059.md): The status region is a polite live region of plain text
  - [SwRS-MDOKFSTUDIO-LIFE-062](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-062.md): A preview without a source says why and recovers when it returns
  - [SwRS-MDOKFSTUDIO-LIFE-069](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-069.md): A render of the loaded document updates the page in place
  - [SwRS-MDOKFSTUDIO-LIFE-127](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-127.md): A restored panel reopens its document or explains why it cannot
<!-- okf:links:end -->
