---
type: StRS
id: StRS-MDOKFSTUDIO-THEME-002
uuid: 299e0141-ab36-4423-ada2-3d696de951b4
title: A reader chooses a preview theme that paints the whole page readably
description: When the reader presses the Theme button, the Studio SHALL switch
  the preview to the next theme mode of Current, Dark, White and Cream, show
  which mode is active and which comes next, and paint the whole page in the
  colours of that mode.
project: markdown-okf-schema-studio
scope: theme-zoom
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I click one Theme button to go through Current, Dark,
  White and Cream, and I can tell from the icon, the label and the tooltip which
  theme I am in and which one the next click gives; the preview follows the
  colours of my VS Code theme in Current mode, every part of the page uses the
  palette of Dark, White or Cream with no leftover dark bar over a white page, I
  read Cream without straining, and I see no animation when my system asks for
  reduced motion. As a maintainer, I can give the preview the palette of another
  host by mapping one list of named colours.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-028
- SwRS-MDOKFSTUDIO-CORE-050
- SwRS-MDOKFSTUDIO-THEME-001
- SwRS-MDOKFSTUDIO-THEME-016
- SwRS-MDOKFSTUDIO-THEME-018
- SwRS-MDOKFSTUDIO-THEME-024
- SwRS-MDOKFSTUDIO-THEME-025
- SwRS-MDOKFSTUDIO-THEME-031
- SwRS-MDOKFSTUDIO-THEME-034
- SwRS-MDOKFSTUDIO-THEME-056
default_owner_email: gaetan@xeberon.net
---

## A reader chooses a preview theme that paints the whole page readably

### Normative behavior

When the reader presses the Theme button, the Studio SHALL switch the preview to the next theme mode of Current, Dark, White and Cream, show which mode is active and which comes next, and paint the whole page in the colours of that mode.

### Preserved stakeholder intent

As a reader, I click one Theme button to go through Current, Dark, White and Cream, and I can tell from the icon, the label and the tooltip which theme I am in and which one the next click gives; the preview follows the colours of my VS Code theme in Current mode, every part of the page uses the palette of Dark, White or Cream with no leftover dark bar over a white page, I read Cream without straining, and I see no animation when my system asks for reduced motion. As a maintainer, I can give the preview the palette of another host by mapping one list of named colours.

### Rationale and constraints

- The button sits on the third toolbar row, so it is visible once the reader expands the toolbar.
- The order is Current, Dark, White, Cream and back to Current.
- Current is one of four theme modes; in Current mode the page takes the colours of the VS Code theme and is re-coloured when that theme changes. The built-in default of a new workspace is Cream, so a reader who wants the VS Code colours picks Current once with the Theme button.
- A theme change also draws the document again with the new theme; the draw waits while a block editor is open so that no edit is lost.
- No style rule is specific to high-contrast themes for the page palette: the colours simply come from the host.
- Forced Dark, White or Cream paints the page, the text, the panels, the code, the sticky heading band and the toolbar with the colours of that mode, whatever the VS Code theme is; the three forced modes override exactly the same set of colour variables, the toolbar ones included, and a forced mode looks the same on a dark and on a light host.
- Code and YAML colours in the forced White and Cream themes belong to the code-blocks requirements; the Mermaid redraw on a theme change is SwRS-MDOKFSTUDIO-DIAG-005.
- Cream gives every text colour at least a 4.5 to 1 contrast on every Cream surface it is drawn on; only Cream is checked for contrast, White and Dark are not.
- Notes in Cream use a panel colour distinct from the page and keep the body text colour for the text that follows.
- When the system prefers reduced motion, the theme changes without animation; the colour fade of a theme switch and the general rule of no motion under reduced motion are SwRS-MDOKFSTUDIO-CORE-050; this scope records the reduced-motion preference on the page.
- Every page colour comes from one named list that the host can map to its own palette; each colour has a name that matches the host's own colour name, so the mapping is mechanical; SwRS-MDOKFSTUDIO-THEME-034 gives the names.
- The forced modes set their colours directly and never read the host's.
- A colour the host does not set leaves the fallback written in each rule in force.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-028](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-028.md): Body text, headings, lists and inline code are typeset readably
  - [SwRS-MDOKFSTUDIO-CORE-050](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-050.md): Soft appearance and colour transitions honour reduced motion
  - [SwRS-MDOKFSTUDIO-THEME-001](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-001.md): The Theme button cycles Current, Dark, White and Cream
  - [SwRS-MDOKFSTUDIO-THEME-016](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-016.md): Current mode follows the VS Code theme and redraws on change
  - [SwRS-MDOKFSTUDIO-THEME-018](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-018.md): A high-contrast VS Code theme is followed like any other
  - [SwRS-MDOKFSTUDIO-THEME-024](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-024.md): A theme switch starts no colour transition under reduced motion
  - [SwRS-MDOKFSTUDIO-THEME-025](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-025.md): Dark, White and Cream paint the whole page the same on any VS Code theme
  - [SwRS-MDOKFSTUDIO-THEME-031](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-031.md): Cream text meets a 4.5 to 1 contrast and keeps the body colour after an admonition
  - [SwRS-MDOKFSTUDIO-THEME-034](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-034.md): Page colours go through one token map of VS Code variables
  - [SwRS-MDOKFSTUDIO-THEME-056](../../swrs/theme-zoom/SwRS-MDOKFSTUDIO-THEME-056.md): The toolbar takes the forced mode colours
<!-- okf:links:end -->
