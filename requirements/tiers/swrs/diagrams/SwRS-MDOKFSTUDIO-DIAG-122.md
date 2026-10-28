---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-122
uuid: c6976dc3-0663-4a3b-89b8-e1067fe4283a
title: Chart data files are read through the resource policy
description: When a Vega-Lite or Vega chart names a relative data url, the
  extension SHALL read that file under the rules of the include directive
  (inside the document folder or workspace, no symlink escape, at most 5 MiB),
  hand its text to the page with the chart, and refuse every remote url with a
  message.
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
- src/core/render/chartInline.ts
- src/core/render/mystNormalize.ts
- src/core/render/mystRenderer.ts
- src/page/modules/vegaChart.ts
tested_in_files:
- test/core/render/chartData.test.ts
- test/core/render/chartRendering.test.ts
- test/page/chartCsp.test.ts
- test/page/modules/vegaChart.test.ts
---

## Chart data files are read through the resource policy

### Normative behavior

When a Vega-Lite or Vega chart names a relative data url, the extension SHALL read that file under the rules of the include directive (inside the document folder or workspace, no symlink escape, at most 5 MiB), hand its text to the page with the chart, and refuse every remote url with a message.

### Scenario (nominal): A relative data file

- GIVEN a document in a workspace folder and a vega-lite chart with data.url data/rows.csv, a file next to the document
- WHEN the preview renders
- THEN the chart element carries the text of the file in data-myst-chart-files under the url as written, the file is a dependency of the render (the preview renders again when it changes), and the page draws the rows of the file; a CSV or TSV file is parsed by the extension without evaluating code, a JSON file as JSON

### Scenario (refusal): A remote url

- GIVEN a chart whose data url starts with https:, http:, file: or //
- WHEN the preview renders and the page draws the chart
- THEN nothing is read and no request is made (connect-src stays none), and the chart shows the message Remote chart data is not loaded followed by the url

### Scenario (refusal): A file outside the folders, missing, too large or of another format

- GIVEN a data url that leaves the workspace (or the document folder in Restricted Mode), names a missing file, an absolute path or a file larger than 5 MiB, or names a format other than csv, tsv or json
- WHEN the preview renders
- THEN no file text is handed to the page, a warning diagnostic names the refusal, and the chart shows the same message in place of the chart

| Input | Outcome |
| --- | --- |
| data.url with a relative path inside the roots | the text is read, at most 16 files per chart, charged to the include budget |
| a format type of topojson or another unknown type | refused with a message naming the format |
| a csv or tsv file | the first record names the columns; numbers and true or false are typed |

### Verification notes

- Method: test/core/render/chartRendering.test.ts (a relative file is read, a remote url is not, a file outside the folders, a missing file and an absolute path are refused, Restricted Mode)
- Method: test/core/render/chartData.test.ts (the data urls of a specification, remote urls, the CSV reader, the refusal messages)
- Method: test/page/modules/vegaChart.test.ts (a chart draws the rows of a CSV file with new Function refused, the loader serves only what it was given)
- Method: test/page/chartCsp.test.ts (the Vega chart of a real page draws data/series.csv)
- Criteria: A relative data file inside the roots is drawn; every remote url and every refused file shows a message and loads nothing.
