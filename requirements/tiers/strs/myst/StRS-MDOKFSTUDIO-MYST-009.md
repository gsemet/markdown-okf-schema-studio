---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-009
uuid: e2b9b8ec-f062-4284-84fb-ad697268d82f
title: A writer sees, links and renames labels safely
description: When a document defines a label or links to a heading, figure,
  table, equation or label with a reference role, the Studio SHALL show an
  anchor icon next to the label target and a link whose target is visible, and
  apply a rename from the anchor as one undoable edit or explain why it refuses.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to see where each cross-reference points, reuse
  each label and rename it safely, so that cross-references are easy and
  references do not silently break.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-MYST-019
- SwRS-MDOKFSTUDIO-MYST-036
- SwRS-MDOKFSTUDIO-MYST-037
- SwRS-MDOKFSTUDIO-MYST-038
- SwRS-MDOKFSTUDIO-MYST-039
- SwRS-MDOKFSTUDIO-MYST-040
- SwRS-MDOKFSTUDIO-MYST-041
- SwRS-MDOKFSTUDIO-MYST-042
- SwRS-MDOKFSTUDIO-MYST-043
- SwRS-MDOKFSTUDIO-MYST-044
- SwRS-MDOKFSTUDIO-MYST-045
- SwRS-MDOKFSTUDIO-MYST-046
- SwRS-MDOKFSTUDIO-MYST-047
- SwRS-MDOKFSTUDIO-MYST-048
- SwRS-MDOKFSTUDIO-MYST-049
- SwRS-MDOKFSTUDIO-MYST-050
- SwRS-MDOKFSTUDIO-MYST-051
- SwRS-MDOKFSTUDIO-MYST-090
- SwRS-MDOKFSTUDIO-MYST-094
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-MYST-004
- StRS-MDOKFSTUDIO-MYST-010
---

## A writer sees, links and renames labels safely

### Normative behavior

When a document defines a label or links to a heading, figure, table, equation or label with a reference role, the Studio SHALL show an anchor icon next to the label target and a link whose target is visible, and apply a rename from the anchor as one undoable edit or explain why it refuses.

### Preserved stakeholder intent

Writers want to see where each cross-reference points so that they can spot broken links early, to see and reuse each label, and to rename labels without references silently breaking.

### Rationale and constraints

- The anchor is shown only for labels that exist in the document.
- Targets that cannot be resolved without a project build are shown as written rather than hidden.
- A refused rename tells the writer why and leaves the document unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-MYST-019](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-019.md): Reference roles link to in-page targets
  - [SwRS-MDOKFSTUDIO-MYST-036](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-036.md): Labels show an anchor icon on the next block
  - [SwRS-MDOKFSTUDIO-MYST-037](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-037.md): The anchor icon is not a mapped block and carries its source line
  - [SwRS-MDOKFSTUDIO-MYST-038](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-038.md): The anchor icon opens a rename field that sends valid names
  - [SwRS-MDOKFSTUDIO-MYST-039](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-039.md): Enter sends the label rename and an unchanged name sends nothing
  - [SwRS-MDOKFSTUDIO-MYST-040](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-040.md): Escape or an outside press closes the rename field
  - [SwRS-MDOKFSTUDIO-MYST-041](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-041.md): Invalid label names are not sent
  - [SwRS-MDOKFSTUDIO-MYST-042](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-042.md): The host refuses a rename in an untrusted or read-only preview
  - [SwRS-MDOKFSTUDIO-MYST-043](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-043.md): The host refuses a rename while an edit is open
  - [SwRS-MDOKFSTUDIO-MYST-044](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-044.md): The host refuses a rename for an out-of-date preview
  - [SwRS-MDOKFSTUDIO-MYST-045](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-045.md): The host renames only the label text in one undo step
  - [SwRS-MDOKFSTUDIO-MYST-046](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-046.md): A valid rename edits only the label text as one undo step
  - [SwRS-MDOKFSTUDIO-MYST-047](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-047.md): A successful rename reports the remaining uses
  - [SwRS-MDOKFSTUDIO-MYST-048](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-048.md): The rename field shows progress and refusals
  - [SwRS-MDOKFSTUDIO-MYST-049](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-049.md): The rename field times out after 6 seconds
  - [SwRS-MDOKFSTUDIO-MYST-050](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-050.md): Rename is blocked while an editor is open in the page
  - [SwRS-MDOKFSTUDIO-MYST-051](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-051.md): The label rename message is validated and answered
  - [SwRS-MDOKFSTUDIO-MYST-090](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-090.md): The rename field closes itself after 5 seconds
  - [SwRS-MDOKFSTUDIO-MYST-094](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-094.md): A label starting with underscore, dot or hyphen cannot be renamed
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [StRS-MDOKFSTUDIO-MYST-004](StRS-MDOKFSTUDIO-MYST-004.md): Reference roles show where a link goes
  - [StRS-MDOKFSTUDIO-MYST-010](StRS-MDOKFSTUDIO-MYST-010.md): A label can be renamed safely from its anchor
<!-- okf:links:end -->
