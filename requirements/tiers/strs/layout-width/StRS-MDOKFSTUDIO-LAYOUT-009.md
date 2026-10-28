---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-009
uuid: 79e3435d-0dce-43a1-ba61-7be5bc2fc794
title: Layout measurements stay trustworthy for maintainers
description: When a maintainer runs the layout checks on a rendered preview, the
  Studio SHALL report overlay overlap, overlay clipping, split identifiers and
  two-line statuses, and pass when the page has no matching content.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-LAYOUT-001; no marker expected."
derives_from: []
user_need: As a maintainer, I can run machine layout checks on any preview and
  trust that they flag real layout defects and stay quiet on pages where they do
  not apply.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-LAYOUT-001
default_owner_email: gaetan@xeberon.net
---

## Layout measurements stay trustworthy for maintainers

### Normative behavior

When a maintainer runs the layout checks on a rendered preview, the Studio SHALL report overlay overlap, overlay clipping, split identifiers and two-line statuses, and pass when the page has no matching content.

### Preserved stakeholder intent

As a maintainer, I can run machine layout checks on any preview and trust that they flag real layout defects and stay quiet on pages where they do not apply.

### Rationale and constraints

- The checks are tooling (`studioGeometryChecks` in `test/shared/geometry-checks.js`) and have no user-visible effect; they report four ids: `overlay-covers-text`, `overlay-clipped`, `identifier-split` and `status-two-lines`.
- Each check is not applicable, hence passing, when the page has no matching DOM; `identifier-split` flags only a cell whose own text node wraps over several lines.
- Known issue: this behaviour is undocumented outside its unit test.
