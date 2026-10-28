---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-035
uuid: 0567493a-6466-46ef-b683-921a095f38e7
title: Machine geometry checks report four layout defects
description: When a maintainer runs the geometry checks on a rendered preview,
  the extension SHALL report overlay-covers-text, overlay-clipped,
  identifier-split and status-two-lines, each passing when no matching content
  exists.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-001
annotation_exemption: true
exemption_reason: "Test tooling: the geometry checks are test/shared/geometry-checks.js,
  outside the source folders. No implementation marker is possible."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-001
default_owner_email: gaetan@xeberon.net
---

## Machine geometry checks report four layout defects

### Normative behavior

When a maintainer runs the geometry checks on a rendered preview, the extension SHALL report overlay-covers-text, overlay-clipped, identifier-split and status-two-lines, each passing when no matching content exists.

### Scenario: Four check ids

- GIVEN the geometry checks function and a page without any content
- WHEN the checks are run
- THEN four results are reported in the order overlay-covers-text, overlay-clipped, identifier-split, status-two-lines, each not applicable and passing

### Scenario: Identifier split

- GIVEN a cell whose single text node wraps over two lines, then a cell whose text nodes share one line, then list items on separate lines
- WHEN the identifier-split check is run
- THEN only the wrapped text node fails and its text is named in the detail; the other two pass

### Known issues

- Known issue: This is test tooling with no user-visible effect, and it is undocumented outside its unit test; the overlay checks serve other scopes' visual scenarios.

### Verification notes

- Method: Unit tests in geometryChecks.test.ts (four ids, not applicable without DOM, identifier-split cases, nested text node counted once).
- Criteria: Result ids and order are exact and every check passes when it is not applicable.
