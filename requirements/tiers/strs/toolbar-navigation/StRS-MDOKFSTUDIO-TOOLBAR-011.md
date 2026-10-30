---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-011
uuid: ec095283-a874-4d71-9759-e51e62e091f0
title: Links open the right target, show where they lead, or are refused with a
  reason
description: When a reader clicks a link in the preview, the Studio SHALL open
  its target, or refuse it with a reason, show in the tooltip of a link that
  comes into view the file it leads to or the reason it cannot be followed, and
  never open a file outside the workspace unless the reader enabled the
  frontmatter outside-link setting.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I click a link and land on the right document, line,
  heading or web page; when a link cannot be followed I am told why, I rest the
  pointer on a link and read where it goes or why it is broken before I click,
  and a link cannot take me to a file outside my workspace unless I turned on
  the setting that allows outside links for frontmatter links.
derived_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-077
- SwRS-MDOKFSTUDIO-TOOLBAR-079
- SwRS-MDOKFSTUDIO-TOOLBAR-083
- SwRS-MDOKFSTUDIO-TOOLBAR-085
- SwRS-MDOKFSTUDIO-TOOLBAR-090
- SwRS-MDOKFSTUDIO-TOOLBAR-094
- SwRS-MDOKFSTUDIO-TOOLBAR-098
- SwRS-MDOKFSTUDIO-TOOLBAR-102
- SwRS-MDOKFSTUDIO-TOOLBAR-113
- SwRS-MDOKFSTUDIO-TOOLBAR-117
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-TRUST-007
- SwRS-MDOKFSTUDIO-TRUST-063
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## Links open the right target, show where they lead, or are refused with a reason

### Normative behavior

When a reader clicks a link in the preview, the Studio SHALL open its target, or refuse it with a reason, show in the tooltip of a link that comes into view the file it leads to or the reason it cannot be followed, and never open a file outside the workspace unless the reader enabled the frontmatter outside-link setting.

### Preserved stakeholder intent

As a reader, I click a link and land on the right document, line, heading or web page; when a link cannot be followed I am told why, I rest the pointer on a link and read where it goes before I click, and a small warning icon next to a link tells me before I click that its target is missing or blocked, and a link cannot take me to a file outside my workspace unless I turned on the setting that allows outside links for frontmatter links.

### Rationale and constraints

- Targets: a heading, a block id, a line, a label or a slug of a Markdown file; an external address is handed to the system.
- A wikilink is found by its file name in every workspace folder; an ambiguous name is refused.
- In a standalone (read-only) preview, the folder of the document replaces the workspace.
- Only links that scroll into view are checked, so a long document is not resolved all at once.
- The hint never changes where the link goes.
- Hints already known survive an in-place update of the content.
- A link to a missing or blocked target keeps its text and colour; a small warning icon follows it and its tooltip names the problem.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-077](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-077.md): A click or Enter on a link is routed to the host and opened or refused with a warning
  - [SwRS-MDOKFSTUDIO-TOOLBAR-079](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-079.md): Links in view are looked up in bounded batches
  - [SwRS-MDOKFSTUDIO-TOOLBAR-083](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-083.md): The host accepts discovery messages of bounded size
  - [SwRS-MDOKFSTUDIO-TOOLBAR-085](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-085.md): A link shows its target kind in a tooltip without changing its target
  - [SwRS-MDOKFSTUDIO-TOOLBAR-090](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-090.md): A link is an anchor, external, local or blocked
  - [SwRS-MDOKFSTUDIO-TOOLBAR-094](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-094.md): A local link target must be a regular file inside the workspace
  - [SwRS-MDOKFSTUDIO-TOOLBAR-098](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-098.md): A wikilink is found by file name, or refused when ambiguous or empty
  - [SwRS-MDOKFSTUDIO-TOOLBAR-102](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-102.md): A link fragment selects a source line, block id, label, heading or field
  - [SwRS-MDOKFSTUDIO-TOOLBAR-113](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-113.md): A link message needs a request, else it is ignored or refused
  - [SwRS-MDOKFSTUDIO-TOOLBAR-117](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-117.md): An in-page anchor scrolls the page to its target at the reading line
  - [SwRS-MDOKFSTUDIO-TRUST-006](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
  - [SwRS-MDOKFSTUDIO-TRUST-007](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-007.md): A page loads local files only from its resource roots
  - [SwRS-MDOKFSTUDIO-TRUST-063](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-063.md): A link targets message needs an array of the current render
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
