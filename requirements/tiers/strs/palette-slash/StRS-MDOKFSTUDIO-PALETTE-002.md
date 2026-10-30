---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-002
uuid: 2c3728e5-9234-40d1-a054-256e10cbf1a7
title: A writer chooses which palette buttons are offered
description: When a writer works in a workspace, the Studio SHALL let the writer
  choose between a strict Markdown, a GitHub Flavored Markdown and a MyST set of
  palette buttons, keep the choice for the workspace, show only the buttons of
  the chosen set, start a workspace without a choice in the mode given by the
  settings, and let the writer reach the choice from the keyboard.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I pick the set of buttons that matches the Markdown
  flavour of my project, the next preview remembers it, and I change the mode
  without taking my hands off the keyboard; as a maintainer of a project, I set
  the palette mode that all writers of the workspace start with.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-PALETTE-001
- SwRS-MDOKFSTUDIO-PALETTE-010
- SwRS-MDOKFSTUDIO-PALETTE-017
- SwRS-MDOKFSTUDIO-PALETTE-036
- SwRS-MDOKFSTUDIO-TRUST-001
default_owner_email: gaetan@xeberon.net
---

## A writer chooses which palette buttons are offered

### Normative behavior

When a writer works in a workspace, the Studio SHALL let the writer choose between a strict Markdown, a GitHub Flavored Markdown and a MyST set of palette buttons, keep the choice for the workspace, show only the buttons of the chosen set, start a workspace without a choice in the mode given by the settings, and let the writer reach the choice from the keyboard.

### Preserved stakeholder intent

Writers expect the palette to match the flavour of their project and to remember their choice.

As a writer, I pick the set of buttons that matches the Markdown flavour of my project, the next preview remembers it, and I change the mode without taking my hands off the keyboard; as a maintainer of a project, I set the palette mode that all writers of the workspace start with.

### Rationale and constraints

- The sets add up: the GitHub set holds the strict buttons, and the MyST set holds the GitHub buttons.
- The mode changes the buttons and the slash menu only, never how the preview renders a document.
- A table cell editor offers the inline buttons of the chosen set that make sense in a cell, and has no mode choice.
- When a workspace has not chosen a palette mode yet, its palettes start in the mode given by the settings, and in the GitHub Flavored Markdown mode when the settings give none.
- A mode the writer chose in the workspace always wins over the setting.
- The documented key combination in a block editor moves the focus to the palette mode choice and lets the writer come back to the text from the keyboard; it uses the command key of the platform.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-169](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-PALETTE-001](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-001.md): The palette mode decides the button sets, in registry order
  - [SwRS-MDOKFSTUDIO-PALETTE-010](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-010.md): An unknown palette mode is refused and stores nothing
  - [SwRS-MDOKFSTUDIO-PALETTE-017](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-017.md): Cmd/Ctrl+Shift+M reaches the mode select and Escape or Enter returns to the text
  - [SwRS-MDOKFSTUDIO-PALETTE-036](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-036.md): Leaving the frame from a palette control saves once and a press keeps the text box focus
  - [SwRS-MDOKFSTUDIO-TRUST-001](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A read-only preview offers no editing affordance
<!-- okf:links:end -->
