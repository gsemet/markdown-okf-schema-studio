---
type: StRS
id: StRS-MDOKFSTUDIO-TRUST-004
uuid: 115057e8-6c8e-4249-9731-0e8986fbdc10
title: Local files load only from the allowed folders
description: When a reader previews a document and it refers to a local image,
  media file or script, the Studio SHALL load it only from the folders the
  preview may read, whatever the spelling of the path, which for a file outside
  every workspace folder is its own folder and nothing else.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I preview a Markdown file from anywhere on my disk and
  see the images and media beside it, without the preview reading the rest of my
  disk, whether the path uses parent paths, encoding or links.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-062
- SwRS-MDOKFSTUDIO-TRUST-002
- SwRS-MDOKFSTUDIO-TRUST-007
- SwRS-MDOKFSTUDIO-TRUST-025
default_owner_email: gaetan@xeberon.net
---

## Local files load only from the allowed folders

### Normative behavior

When a reader previews a document and it refers to a local image, media file or script, the Studio SHALL load it only from the folders the preview may read, whatever the spelling of the path, which for a file outside every workspace folder is its own folder and nothing else.

### Preserved stakeholder intent

As a reader, I preview a Markdown file from anywhere on my disk and see the images and media beside it, without the preview reading the rest of my disk, whether the path uses parent paths, encoding or links.

### Rationale and constraints

- The allowed folders are the folder of the document and the resource root of the preview.
- A document of an untrusted workspace follows the same rule: the folder of the document and nothing wider.
- The frontmatter schema is not searched for such a file (frontmatter-schema scope).
- A missing file is a different outcome from a refused one: it is shown as a missing image or a warning by the rendering scopes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-062](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-062.md): A preview without a source says why and recovers when it returns
  - [SwRS-MDOKFSTUDIO-TRUST-002](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-002.md): A read-only preview reads no home folder and no dot-directory
  - [SwRS-MDOKFSTUDIO-TRUST-007](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-007.md): A page loads local files only from its resource roots
  - [SwRS-MDOKFSTUDIO-TRUST-025](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-025.md): A resource reference resolves only to an existing file inside a root
<!-- okf:links:end -->
