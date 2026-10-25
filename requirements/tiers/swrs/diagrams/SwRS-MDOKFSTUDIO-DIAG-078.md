---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-078
uuid: e8888923-8ad1-49fd-9151-aa7356739e26
title: The PlantUML settings form their own category
description: When the Settings editor lists the extension's settings, the
  extension SHALL group the two PlantUML settings in a category titled PlantUML
  at position 5.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-024
---

## The PlantUML settings form their own category

### Normative behavior

When the Settings editor lists the extension's settings, the extension SHALL group the two PlantUML settings in a category titled PlantUML at position 5.

### Scenario: Category

- GIVEN the settings registry
- WHEN the categories are listed
- THEN PlantUML is the fifth category and holds useJar and jarPath

### Scenario: Order

- GIVEN the manifest categories
- WHEN they are compared with the registry
- THEN titles and orders are equal

### Verification notes

- Method: Unit tests of the settings registry and the package contract.
- Criteria: Category title and order match the manifest.
