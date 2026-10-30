---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-073
uuid: 03632cdf-88c6-4ead-a01e-ef69bfe63a9e
title: A setting description has at most 700 characters
description: The package SHALL limit the markdownDescription of every
  contributed setting to 700 characters and give it no plain description.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-021
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A setting description has at most 700 characters

### Normative behavior

The package SHALL limit the markdownDescription of every contributed setting to 700 characters and give it no plain description.

### Scenario: Descriptions

- GIVEN the 18 contributed settings
- WHEN they are read
- THEN each markdownDescription has at most 700 characters and no setting has a plain description

### Scenario: Over the limit

- GIVEN a setting whose markdownDescription has 701 characters
- WHEN the package contract test runs
- THEN it fails

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-157: every setting has a description and a unique position

### Verification notes

- Method: Unit test test/security/package-contract.test.ts (every contributed setting is explained with a markdownDescription and a unique order).
- Criteria: The count of 18 is that of the test, which also lists the exact setting keys. That every setting has a description and a unique order is SwRS-MDOKFSTUDIO-LIFE-157.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-021](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-021.md): The settings editor lists the Studio settings in clear groups
<!-- okf:links:end -->
