---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-124
uuid: 17299267-0a7c-4c3b-924c-02b78d3ade83
title: Chart expressions are evaluated without eval under an unchanged policy
description: 'When a page holds a chart figure, the chart runtime SHALL evaluate chart
  expressions with the Vega interpreter so that the page content security policy keeps
  no unsafe-eval and no network access.'
project: MDOKFSTUDIO
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-015
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-129
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/vegaView.ts
tested_in_files:
- test/core/preview/contentPatch.test.ts
- test/page/chartCsp.test.ts
- test/page/modules/vegaChart.test.ts
- test/security/package-contract.test.ts
- test/session/diagReq.chart.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Chart expressions are evaluated without eval under an unchanged policy

### Normative behavior

When a page holds a chart figure, the chart runtime SHALL evaluate chart expressions with the Vega interpreter so that the page content security policy keeps no unsafe-eval and no network access.

### Scenario (nominal): No eval and no network

- GIVEN a page with a Vega-Lite chart and a Vega chart whose expressions (calculate, filter, signals, formulas) need evaluating
- WHEN the page is opened under its content security policy
- THEN the policy has no unsafe-eval, no unsafe-inline and connect-src none, both charts are drawn, no policy violation and no console error is reported, and the chart code builds no function from a string (the specification is parsed with ast true and evaluated by the Vega interpreter)

### Scenario (refusal): The policy is unchanged

- GIVEN the page policy of a page with charts
- WHEN it is compared with a page without charts
- THEN the directives are the same

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-129: the chart runtime script loads only when the page holds a chart

### Verification notes

- Method: test/session/diagReq.chart.requirements.test.ts (the policy of a chart page)
- Method: test/page/chartCsp.test.ts (headless Chromium, the real page builder and policy: two charts drawn, no violation, the control that the policy refuses code from strings)
- Method: test/page/modules/vegaChart.test.ts (charts with expressions draw with eval and new Function refused)
- Criteria: Charts draw under a policy without eval and without network.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-015](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-015.md): A writer reads charts and drawings in the page
- Depends on:
  - [SwRS-MDOKFSTUDIO-DIAG-129](SwRS-MDOKFSTUDIO-DIAG-129.md): A diagram renderer script loads only when the page holds a figure of its engine
<!-- okf:links:end -->
