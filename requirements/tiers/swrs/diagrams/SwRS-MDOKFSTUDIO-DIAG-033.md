---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-033
uuid: cb33b4e6-2f1f-4075-ac47-d5b1224efcb9
title: The library loaders of the built-in engine refuse every request
description: "When the built-in engine asks for a standard-library bundle or an optional
  script such as emoji, the page SHALL refuse the request with an error without adding
  a script tag or fetching anything."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-032; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-032
default_owner_email: gaetan@xeberon.net
---

## The library loaders of the built-in engine refuse every request

### Normative behavior

When the built-in engine asks for a standard-library bundle or an optional script such as emoji, the page SHALL refuse the request with an error without adding a script tag or fetching anything.

### Scenario: Library bundle

- GIVEN the loaders installed for the engine
- WHEN the engine asks for a library URL
- THEN the loader answers with an error saying it is not available in the built-in PlantUML engine

### Scenario: No remote base

- GIVEN the engine globals after installation
- WHEN they are inspected
- THEN no standard-library base address is set, so no remote server is named

### Known issues

- Known issue: A refused emoji script surfaces as the generic engine failure message.

### Verification notes

- Method: Unit test of the installed loaders.
- Criteria: Every library request ends in an error and nothing is loaded.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-032](SwRS-MDOKFSTUDIO-DIAG-032.md): The built-in engine refuses what needs a URL, a library or more than 1 MiB
<!-- okf:links:end -->
