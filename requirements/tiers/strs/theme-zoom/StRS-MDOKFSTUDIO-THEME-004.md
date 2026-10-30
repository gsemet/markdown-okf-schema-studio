---
type: StRS
id: StRS-MDOKFSTUDIO-THEME-004
uuid: 44699f81-f877-4ace-8afa-6d681aafc289
title: The theme choice holds for the workspace and survives slow loads and bad
  values
description: When the reader picks a theme mode, the Studio SHALL remember it
  for the workspace and use it the next time the preview opens, show Cream in a
  workspace where no theme was ever chosen, give a page that finishes loading
  late the colours of the current VS Code theme, and ignore a stored or received
  value that is not a known theme mode.
project: markdown-okf-schema-studio
scope: theme-zoom
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I pick a theme once and every preview of this workspace
  opens in it afterwards, also after a window reload; when I open the preview
  for the first time in a workspace, I see a calm warm paper page without having
  to find the Theme button, whatever my VS Code theme is; I open or restore a
  preview on a slow machine and still see it in the colours of my current VS
  Code theme, not in stale ones; and I never get a broken or unreadable preview
  because a stored theme setting is damaged.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-THEME-001
- SwRS-MDOKFSTUDIO-THEME-013
- SwRS-MDOKFSTUDIO-THEME-016
default_owner_email: gaetan@xeberon.net
---

## The theme choice holds for the workspace and survives slow loads and bad values

### Normative behavior

When the reader picks a theme mode, the Studio SHALL remember it for the workspace and use it the next time the preview opens, show Cream in a workspace where no theme was ever chosen, give a page that finishes loading late the colours of the current VS Code theme, and ignore a stored or received value that is not a known theme mode.

### Preserved stakeholder intent

As a reader, I pick a theme once and every preview of this workspace opens in it afterwards, also after a window reload; when I open the preview for the first time in a workspace, I see a calm warm paper page without having to find the Theme button, whatever my VS Code theme is; I open or restore a preview on a slow machine and still see it in the colours of my current VS Code theme, not in stale ones; and I never get a broken or unreadable preview because a stored theme setting is damaged.

### Rationale and constraints

- The choice is per workspace, not per document; a restored panel also keeps its own last mode.
- Precedence at start: the mode stored for the workspace, then the mode saved with the panel, then Cream.
- If VS Code cannot save the choice, the choice still holds until the window closes and an error is written to the log; the reader sees no message.
- Cream is the built-in default, shown before any click on a light and on a dark VS Code theme; it is not stored as if the reader had chosen it, so a later change of the default reaches readers who never picked a theme.
- A theme the reader picked always wins over the default.
- VS Code can deliver the theme announcement before the page script listens; the page therefore reports that it is ready and the host answers with the live theme.
- The same answer carries the editor pairing, which belongs to the lifecycle-sync requirements.
- A value that is not one of Current, Dark, White and Cream is dropped without any message; the workspace then counts as having no stored choice.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-169](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-THEME-001](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-001.md): The Theme button cycles Current, Dark, White and Cream
  - [SwRS-MDOKFSTUDIO-THEME-013](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-013.md): The host drops a theme-mode message with an unknown mode
  - [SwRS-MDOKFSTUDIO-THEME-016](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-016.md): Current mode follows the VS Code theme and redraws on change
<!-- okf:links:end -->
