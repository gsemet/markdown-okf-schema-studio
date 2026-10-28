---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-124
uuid: 17299267-0a7c-4c3b-924c-02b78d3ade83
title: The chart runtime loads only with a chart and needs no eval
description: When the rendered content contains a chart figure, the extension
  SHALL add the chart runtime script to the page, and the runtime SHALL evaluate
  chart expressions with the Vega interpreter so that the page content security
  policy keeps no unsafe-eval and no network access.
project: MDOKFSTUDIO
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/vegaChart.ts
- src/session/webview.ts
tested_in_files:
- test/core/preview/contentPatch.test.ts
- test/page/chartCsp.test.ts
- test/page/modules/vegaChart.test.ts
- test/security/package-contract.test.ts
- test/session/diagReq.chart.requirements.test.ts
---

## The chart runtime loads only with a chart and needs no eval

### Normative behavior

When the rendered content contains a chart figure, the extension SHALL add the chart runtime script to the page, and the runtime SHALL evaluate chart expressions with the Vega interpreter so that the page content security policy keeps no unsafe-eval and no network access.

### Scenario (nominal): The runtime is added only with a chart

- GIVEN rendered content with a chart figure, and another page with only a Mermaid figure
- WHEN the page is built
- THEN the first page carries one script with the page nonce, the attribute data-sphinx-preview-vega and the source vegaPreview.js of the extension bundle, once however many charts the page holds, and the second page carries none; a page with both loads both runtimes, and a chart appearing in or leaving a page is a different page shell

### Scenario (nominal): No eval and no network

- GIVEN a page with a Vega-Lite chart and a Vega chart whose expressions (calculate, filter, signals, formulas) need evaluating
- WHEN the page is opened under its content security policy
- THEN the policy has no unsafe-eval, no unsafe-inline and connect-src none, both charts are drawn, no policy violation and no console error is reported, and the chart code builds no function from a string (the specification is parsed with ast true and evaluated by the Vega interpreter)

### Scenario (refusal): The policy is unchanged

- GIVEN the page policy of a page with charts
- WHEN it is compared with a page without charts
- THEN the directives are the same

### Verification notes

- Method: test/session/diagReq.chart.requirements.test.ts (the script is added once with the nonce and only with a chart, the policy of a chart page)
- Method: test/core/preview/contentPatch.test.ts (the shell key differs when a chart appears or disappears)
- Method: test/page/chartCsp.test.ts (headless Chromium, the real page builder and policy: two charts drawn, no violation, the control that the policy refuses code from strings)
- Method: test/page/modules/vegaChart.test.ts (charts with expressions draw with eval and new Function refused)
- Criteria: The chart runtime loads only on a page with a chart, and charts draw under a policy without eval and without network.
