---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-001
uuid: 689c328e-435b-4127-b966-0216d0ce52fb
title: A reader reads a faithful rendering of any document
description: When a writer opens or edits a Markdown file, the Studio SHALL show
  a rendered preview of its content beside the editor that follows each edit and
  displays text in any script and direction readably inside the preview column.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: Writers need to read their Markdown as formatted text, at any length,
  in any script and direction, while they type.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-001
- SwRS-MDOKFSTUDIO-CORE-002
- SwRS-MDOKFSTUDIO-CORE-003
- SwRS-MDOKFSTUDIO-CORE-004
- SwRS-MDOKFSTUDIO-CORE-005
- SwRS-MDOKFSTUDIO-CORE-006
- SwRS-MDOKFSTUDIO-CORE-007
- SwRS-MDOKFSTUDIO-CORE-008
- SwRS-MDOKFSTUDIO-CORE-010
- SwRS-MDOKFSTUDIO-CORE-011
- SwRS-MDOKFSTUDIO-CORE-020
- SwRS-MDOKFSTUDIO-CORE-021
- SwRS-MDOKFSTUDIO-CORE-027
- SwRS-MDOKFSTUDIO-CORE-028
- SwRS-MDOKFSTUDIO-CORE-029
- SwRS-MDOKFSTUDIO-CORE-030
- SwRS-MDOKFSTUDIO-CORE-031
- SwRS-MDOKFSTUDIO-CORE-032
- SwRS-MDOKFSTUDIO-CORE-033
- SwRS-MDOKFSTUDIO-CORE-034
- SwRS-MDOKFSTUDIO-CORE-035
- SwRS-MDOKFSTUDIO-CORE-037
- SwRS-MDOKFSTUDIO-CORE-038
- SwRS-MDOKFSTUDIO-CORE-039
- SwRS-MDOKFSTUDIO-CORE-040
- SwRS-MDOKFSTUDIO-CORE-041
- SwRS-MDOKFSTUDIO-CORE-042
- SwRS-MDOKFSTUDIO-CORE-043
- SwRS-MDOKFSTUDIO-CORE-044
- SwRS-MDOKFSTUDIO-CORE-046
- SwRS-MDOKFSTUDIO-CORE-048
- SwRS-MDOKFSTUDIO-CORE-049
- SwRS-MDOKFSTUDIO-CORE-050
- SwRS-MDOKFSTUDIO-CORE-051
- SwRS-MDOKFSTUDIO-CORE-052
- SwRS-MDOKFSTUDIO-CORE-053
- SwRS-MDOKFSTUDIO-CORE-065
- SwRS-MDOKFSTUDIO-CORE-066
- SwRS-MDOKFSTUDIO-CORE-068
- SwRS-MDOKFSTUDIO-CORE-070
- SwRS-MDOKFSTUDIO-CORE-071
- SwRS-MDOKFSTUDIO-CORE-072
- SwRS-MDOKFSTUDIO-CORE-073
- SwRS-MDOKFSTUDIO-CORE-074
- SwRS-MDOKFSTUDIO-CORE-075
- SwRS-MDOKFSTUDIO-CORE-076
- SwRS-MDOKFSTUDIO-GFM-029
- SwRS-MDOKFSTUDIO-LIFE-094
- SwRS-MDOKFSTUDIO-TRUST-052
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-CORE-004
---

## A reader reads a faithful rendering of any document

### Normative behavior

When a writer opens or edits a Markdown file, the Studio SHALL show a rendered preview of its content beside the editor that follows each edit and displays text in any script and direction readably inside the preview column.

### Preserved stakeholder intent

Writers need to read their Markdown as formatted text, at any length, while they type, and to read documents in any script and direction without horizontal scrolling.

### Rationale and constraints

- Covers headings, lists, quotes, inline code, images and long documents. The rendering is the same in every palette mode.
- Covers Japanese, Chinese, Korean, Hebrew and Arabic text and long unbreakable words such as long URLs, which wrap inside the preview column instead of scrolling sideways.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-001](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-001.md): The preview renders the unsaved buffer completely, in process
  - [SwRS-MDOKFSTUDIO-CORE-002](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-002.md): Render the CommonMark blocks
  - [SwRS-MDOKFSTUDIO-CORE-003](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-003.md): Every rendered block maps to its absolute source lines
  - [SwRS-MDOKFSTUDIO-CORE-004](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-004.md): Map a multi-line block to its end line
  - [SwRS-MDOKFSTUDIO-CORE-005](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-005.md): Hide leading frontmatter from the body
  - [SwRS-MDOKFSTUDIO-CORE-006](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-006.md): Keep body lines absolute after frontmatter
  - [SwRS-MDOKFSTUDIO-CORE-007](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-007.md): Map image-only blocks
  - [SwRS-MDOKFSTUDIO-CORE-008](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-008.md): Images fit the column, sit on the line and survive a missing file
  - [SwRS-MDOKFSTUDIO-CORE-010](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-010.md): Wikilinks render as links where they are text
  - [SwRS-MDOKFSTUDIO-CORE-011](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-011.md): Leave wikilink syntax untouched where it is not text
  - [SwRS-MDOKFSTUDIO-CORE-020](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-020.md): Render read-only in an untrusted workspace
  - [SwRS-MDOKFSTUDIO-CORE-021](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-021.md): Refuse the render when trust is required
  - [SwRS-MDOKFSTUDIO-CORE-027](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-027.md): Warm the render engine at activation
  - [SwRS-MDOKFSTUDIO-CORE-028](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-028.md): Body text, headings, lists and inline code are typeset readably
  - [SwRS-MDOKFSTUDIO-CORE-029](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-029.md): Style headings
  - [SwRS-MDOKFSTUDIO-CORE-030](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-030.md): Tighten list spacing
  - [SwRS-MDOKFSTUDIO-CORE-031](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-031.md): Style inline code as a pill
  - [SwRS-MDOKFSTUDIO-CORE-032](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-032.md): Keep inline code readable inside links
  - [SwRS-MDOKFSTUDIO-CORE-033](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-033.md): Keep inline code compact in tables
  - [SwRS-MDOKFSTUDIO-CORE-034](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-034.md): Long words, URLs, identifiers and CJK text wrap in the column
  - [SwRS-MDOKFSTUDIO-CORE-035](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-035.md): Scroll wide tables inside their box
  - [SwRS-MDOKFSTUDIO-CORE-037](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-037.md): Reach the end of the document
  - [SwRS-MDOKFSTUDIO-CORE-038](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-038.md): Render a very long document completely
  - [SwRS-MDOKFSTUDIO-CORE-039](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-039.md): Wrap CJK text in the pane
  - [SwRS-MDOKFSTUDIO-CORE-040](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-040.md): Wrap an unbroken word in the column
  - [SwRS-MDOKFSTUDIO-CORE-041](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-041.md): Right-to-left text aligns to the right and blocks get an automatic direction
  - [SwRS-MDOKFSTUDIO-CORE-042](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-042.md): Wrap long URLs in the column
  - [SwRS-MDOKFSTUDIO-CORE-043](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-043.md): Find works in the preview
  - [SwRS-MDOKFSTUDIO-CORE-044](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-044.md): Drop unsupported raw HTML
  - [SwRS-MDOKFSTUDIO-CORE-046](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-046.md): Render identically in every palette mode
  - [SwRS-MDOKFSTUDIO-CORE-048](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-048.md): Glow blocks changed outside the preview
  - [SwRS-MDOKFSTUDIO-CORE-049](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-049.md): Skip the glow when it would mislead
  - [SwRS-MDOKFSTUDIO-CORE-050](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-050.md): Soft appearance and colour transitions honour reduced motion
  - [SwRS-MDOKFSTUDIO-CORE-051](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-051.md): Enable soft appearance after the first input
  - [SwRS-MDOKFSTUDIO-CORE-052](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-052.md): Fade a closed editor back to its block
  - [SwRS-MDOKFSTUDIO-CORE-053](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-053.md): Transition colours once on theme change
  - [SwRS-MDOKFSTUDIO-CORE-065](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-065.md): Place inline images on the text line
  - [SwRS-MDOKFSTUDIO-CORE-066](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-066.md): Ignore invalid page messages
  - [SwRS-MDOKFSTUDIO-CORE-068](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-068.md): Disable soft appearance after a content patch
  - [SwRS-MDOKFSTUDIO-CORE-070](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-070.md): A parse splits the source into lines once, whatever the number of directives
  - [SwRS-MDOKFSTUDIO-CORE-071](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-071.md): README-style HTML renders like GitHub and shows its tag in edit mode
  - [SwRS-MDOKFSTUDIO-CORE-072](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-072.md): A \[TOC\] marker or a contents directive renders the table of contents
  - [SwRS-MDOKFSTUDIO-CORE-073](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-073.md): The writing skill's examples render without error
  - [SwRS-MDOKFSTUDIO-CORE-074](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-074.md): The writing skill is packaged as an installable agent plugin
  - [SwRS-MDOKFSTUDIO-CORE-075](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-075.md): Plugin manifest versions equal the package version
  - [SwRS-MDOKFSTUDIO-CORE-076](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-076.md): CI tags a version change only after a green heavy run of the commit
  - [SwRS-MDOKFSTUDIO-GFM-029](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-029.md): A small raw HTML subset renders and the rest is dropped
  - [SwRS-MDOKFSTUDIO-LIFE-094](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-094.md): Blocks changed by another tool glow briefly
  - [SwRS-MDOKFSTUDIO-TRUST-052](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
- Supersedes:
  - [StRS-MDOKFSTUDIO-CORE-004](StRS-MDOKFSTUDIO-CORE-004.md): Read text in any script and direction
<!-- okf:links:end -->
