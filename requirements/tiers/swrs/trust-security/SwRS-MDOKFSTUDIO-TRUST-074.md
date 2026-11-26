---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-074
uuid: b9bcebca-dbe5-426b-9fef-251b9e3ed9ea
title: The package declares its 256 pixel PNG icon
description: 'The package SHALL declare images/logo.png, a PNG of 256 by 256 pixels,
  as its extension icon.'
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-012
depends_on: []
scenarios:
- id: S1
  title: Icon
- id: S2
  title: Icon file
- id: S3
  title: Contract broken
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/packageIcon.markers.ts
tested_in_files:
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-080
---

## The package declares its 256 pixel PNG icon

### Normative behavior

The package SHALL declare images/logo.png, a PNG of 256 by 256 pixels, as its extension icon.

### Scenario S1 (nominal): Icon

- GIVEN the icon key of the manifest
- WHEN it is read
- THEN it is images/logo.png

### Scenario S2 (nominal): Icon file

- GIVEN the file images/logo.png
- WHEN its header is read
- THEN it has the PNG signature and the width and height fields are both 256

### Scenario S3 (refusal): Contract broken

| Input | Outcome |
| --- | --- |
| a manifest whose icon key names another file | the package contract test fails |
| an icon file that is not a 256 by 256 PNG | the package contract test fails |

### Verification notes

- Method: Unit test test/security/package-contract.test.ts (extension icon is a 256 pixel PNG and the Sphinx favicon matches the shared logo) covers the icon key and the icon file. The same test also compares the favicon file of the Sphinx fixtures with images/logo.svg; that is not product behaviour and is not specified.
- Method: Unit test test/security/package-contract.test.ts (the icon contract fails for another icon file and for a file that is not a 256 pixel PNG) gives the check of the first test another icon key, a width of 128, a height of 128 and a file that is not a PNG, and expects it to fail.
- Criteria: The icon key equals images/logo.png and the width and height fields of the PNG header are both 256.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-012](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-012.md): Visible text and the icon speak of the product
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-080](../diagrams/SwRS-MDOKFSTUDIO-DIAG-080.md): The built-in engine bundle and licence are packaged
<!-- okf:links:end -->
