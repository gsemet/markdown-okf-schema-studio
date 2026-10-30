---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-007
uuid: 6dc4b21c-8a19-42ee-b55b-d508ae4d265e
title: Sphinx configuration gaps are reported before building
description: When a Sphinx project's configuration does not enable MyST syntax
  used in a document, the Studio SHALL tell the author which syntax is missing
  and where, through a non-intrusive closable banner that opens the Problems
  view, without running the configuration file.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a Sphinx author, I want to learn about unsupported syntax before
  building, through a quiet warning with a path to details, so that I avoid
  failed builds and can act without being interrupted.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-064
- SwRS-MDOKFSTUDIO-MYST-030
- SwRS-MDOKFSTUDIO-MYST-066
- SwRS-MDOKFSTUDIO-MYST-067
- SwRS-MDOKFSTUDIO-MYST-068
- SwRS-MDOKFSTUDIO-MYST-069
- SwRS-MDOKFSTUDIO-MYST-070
- SwRS-MDOKFSTUDIO-MYST-071
- SwRS-MDOKFSTUDIO-MYST-072
- SwRS-MDOKFSTUDIO-MYST-073
- SwRS-MDOKFSTUDIO-MYST-074
- SwRS-MDOKFSTUDIO-MYST-075
- SwRS-MDOKFSTUDIO-MYST-076
- SwRS-MDOKFSTUDIO-MYST-077
- SwRS-MDOKFSTUDIO-MYST-078
- SwRS-MDOKFSTUDIO-MYST-079
- SwRS-MDOKFSTUDIO-MYST-080
- SwRS-MDOKFSTUDIO-MYST-081
- SwRS-MDOKFSTUDIO-MYST-082
- SwRS-MDOKFSTUDIO-MYST-083
- SwRS-MDOKFSTUDIO-MYST-084
- SwRS-MDOKFSTUDIO-MYST-085
- SwRS-MDOKFSTUDIO-MYST-086
- SwRS-MDOKFSTUDIO-MYST-089
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-MYST-014
---

## Sphinx configuration gaps are reported before building

### Normative behavior

When a Sphinx project's configuration does not enable MyST syntax used in a document, the Studio SHALL tell the author which syntax is missing and where, through a non-intrusive closable banner that opens the Problems view, without running the configuration file.

### Preserved stakeholder intent

As a Sphinx author, I want to learn about unsupported syntax before building so that I avoid failed builds, and I want a quiet warning with a path to details so that I can act without being interrupted.

### Rationale and constraints

- The configuration file is read as text and never executed.
- The banner can be closed and does not block editing; it also appears in Restricted Mode.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-064](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-064.md): Warn about MyST syntax of a disabled extension
  - [SwRS-MDOKFSTUDIO-MYST-030](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-030.md): Prices are not reported as missing dollarmath
  - [SwRS-MDOKFSTUDIO-MYST-066](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-066.md): The governing conf.py is found and read as text
  - [SwRS-MDOKFSTUDIO-MYST-067](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-067.md): A single conf-folder candidate governs when no ancestor conf exists
  - [SwRS-MDOKFSTUDIO-MYST-068](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-068.md): conf.py is read as text and the check needs a MyST parser
  - [SwRS-MDOKFSTUDIO-MYST-069](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-069.md): The conf.py reader understands list literal forms
  - [SwRS-MDOKFSTUDIO-MYST-070](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-070.md): Uncertain conf.py lists suppress all warnings
  - [SwRS-MDOKFSTUDIO-MYST-071](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-071.md): conf.py lookups are cached and invalidated
  - [SwRS-MDOKFSTUDIO-MYST-072](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-072.md): MyST syntax of a disabled extension is reported with its line
  - [SwRS-MDOKFSTUDIO-MYST-073](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-073.md): At most 10 extension warnings are kept
  - [SwRS-MDOKFSTUDIO-MYST-074](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-074.md): Detection ignores code, comments, roles and look-alikes
  - [SwRS-MDOKFSTUDIO-MYST-075](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-075.md): Warnings carry the line of the syntax
  - [SwRS-MDOKFSTUDIO-MYST-076](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-076.md): Included files are not checked against conf.py
  - [SwRS-MDOKFSTUDIO-MYST-077](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-077.md): Extension warnings use the fixed wording and status list
  - [SwRS-MDOKFSTUDIO-MYST-078](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-078.md): Extension warnings appear in the Problems view and follow conf.py
  - [SwRS-MDOKFSTUDIO-MYST-079](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-079.md): Problems entries are replaced and removed
  - [SwRS-MDOKFSTUDIO-MYST-080](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-080.md): conf.py changes update the previews they govern
  - [SwRS-MDOKFSTUDIO-MYST-081](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-081.md): A closable banner announces conf.py warnings
  - [SwRS-MDOKFSTUDIO-MYST-082](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-082.md): The banner takes no layout room
  - [SwRS-MDOKFSTUDIO-MYST-083](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-083.md): Open Problems opens the Problems view
  - [SwRS-MDOKFSTUDIO-MYST-084](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-084.md): Closing the banner dismisses it for that document
  - [SwRS-MDOKFSTUDIO-MYST-085](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-085.md): The banner returns when the warning set changes
  - [SwRS-MDOKFSTUDIO-MYST-086](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-086.md): In Restricted Mode the banner lists warnings in its tooltip
  - [SwRS-MDOKFSTUDIO-MYST-089](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-089.md): The conf.py reader applies list mutations in order
- Supersedes:
  - [StRS-MDOKFSTUDIO-MYST-014](StRS-MDOKFSTUDIO-MYST-014.md): A closable banner warns about configuration syntax warnings
<!-- okf:links:end -->
