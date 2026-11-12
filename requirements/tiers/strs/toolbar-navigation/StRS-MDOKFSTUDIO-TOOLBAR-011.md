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
- In a standalone preview (restricted reads), the folder of the document replaces the workspace.
- Only links that scroll into view are checked, so a long document is not resolved all at once.
- The hint never changes where the link goes.
- Hints already known survive an in-place update of the content.
- A link to a missing or blocked target keeps its text and colour; a small warning icon follows it and its tooltip names the problem.

### Main paths

#### Path 1: See where a link leads and open it

1. A link comes into view
   - SwRS-MDOKFSTUDIO-TOOLBAR-079: the page asks the host for the target of its request, and the host answers with its kind and its path or reason
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-079 (boundary): the same request twice is asked once
2. The target of the link is known
   - SwRS-MDOKFSTUDIO-TOOLBAR-085: the link gets the target as its tooltip, or the reason when it is blocked
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-085 (boundary): a missing or blocked target keeps its link and gains a warning icon
3. The tooltip names where the link leads
   - SwRS-MDOKFSTUDIO-TOOLBAR-077: the reader clicks the link and the host opens the target
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-077 (refusal): the host refuses with a warning
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-090 (refusal): a scheme other than http, https or mailto, or an absolute path, is blocked with a reason
4. The target is open
   - SwRS-MDOKFSTUDIO-TOOLBAR-094: a relative Markdown link opens only a regular file below a workspace root
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-094 (refusal): a path outside every root is blocked
5. The file is open

#### Path 2: Follow an anchor

1. A link comes into view
   - SwRS-MDOKFSTUDIO-TOOLBAR-117: the reader follows an anchor, and the page scrolls to the mapped block to the reading line below the band
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-117 (refusal): an unknown or stale request does not scroll
2. The heading of the anchor is at the reading line

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
  - [SwRS-MDOKFSTUDIO-TRUST-006](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
  - [SwRS-MDOKFSTUDIO-TRUST-007](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-007.md): A page loads local files only from its resource roots
  - [SwRS-MDOKFSTUDIO-TRUST-063](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-063.md): A link targets message needs an array of the current render
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
