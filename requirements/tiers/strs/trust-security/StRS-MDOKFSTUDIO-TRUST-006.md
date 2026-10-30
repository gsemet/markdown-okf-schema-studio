---
type: StRS
id: StRS-MDOKFSTUDIO-TRUST-006
uuid: 08f067df-3fff-406c-83d1-b9557623dfad
title: The preview runs no foreign code and unsafe HTML is made inert
description: When a reader previews any document, the Studio SHALL keep the
  preview page from running scripts the Studio did not write, from loading
  anything from the network and from reading files outside the allowed folders,
  running no script that an untrusted workspace document carries and removing or
  neutralising unsafe raw HTML before the page shows it.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, and as a reviewer of an untrusted repository, I open any
  Markdown file, even one with hostile HTML, knowing that its preview cannot run
  its code, call out to the network or read my other files.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-013
- SwRS-MDOKFSTUDIO-CORE-041
- SwRS-MDOKFSTUDIO-TRUST-007
- SwRS-MDOKFSTUDIO-TRUST-011
- SwRS-MDOKFSTUDIO-TRUST-012
- SwRS-MDOKFSTUDIO-TRUST-022
- SwRS-MDOKFSTUDIO-TRUST-036
- SwRS-MDOKFSTUDIO-TRUST-042
- SwRS-MDOKFSTUDIO-TRUST-050
default_owner_email: gaetan@xeberon.net
---

## The preview runs no foreign code and unsafe HTML is made inert

### Normative behavior

When a reader previews any document, the Studio SHALL keep the preview page from running scripts the Studio did not write, from loading anything from the network and from reading files outside the allowed folders, running no script that an untrusted workspace document carries and removing or neutralising unsafe raw HTML before the page shows it.

### Preserved stakeholder intent

As a reader, and as a reviewer of an untrusted repository, I open any Markdown file, even one with hostile HTML, knowing that its preview cannot run its code, call out to the network or read my other files.

### Rationale and constraints

- The page is protected by a content security policy with a one-time token and by the folders the page may load from.
- The token is drawn again for every page and shared by every script and style the Studio writes.
- The PlantUML jar, the schema search and the Problems entries are limited in Restricted Mode by the diagrams, frontmatter-schema and myst scopes.
- Raw HTML with scripts, frames, event handlers, styles or unsafe links is removed or neutralised before the page shows it.
- Only a small subset of raw HTML is rendered at all (rendering-core and gfm scopes); this record covers what the page-building step does to the HTML that remains.
- The step removes known dangerous elements and attributes and rewrites links and resource addresses; it does not keep a short list of allowed elements.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-013](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-013.md): Includes are bounded by depth, budget, size and allowed roots
  - [SwRS-MDOKFSTUDIO-CORE-041](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-041.md): Right-to-left text aligns to the right and blocks get an automatic direction
  - [SwRS-MDOKFSTUDIO-TRUST-007](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-007.md): A page loads local files only from its resource roots
  - [SwRS-MDOKFSTUDIO-TRUST-011](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-011.md): No script of a document reaches the preview
  - [SwRS-MDOKFSTUDIO-TRUST-012](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-012.md): Every page carries a deny-by-default content security policy
  - [SwRS-MDOKFSTUDIO-TRUST-022](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-022.md): Each page gets a fresh nonce that every extension script and style carries
  - [SwRS-MDOKFSTUDIO-TRUST-036](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-036.md): The sanitizer removes active content and keeps the rest
  - [SwRS-MDOKFSTUDIO-TRUST-042](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-042.md): The sanitizer rewrites links and records each removal
  - [SwRS-MDOKFSTUDIO-TRUST-050](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-050.md): The sanitizer adds source-mapping attributes to mapped elements
<!-- okf:links:end -->
