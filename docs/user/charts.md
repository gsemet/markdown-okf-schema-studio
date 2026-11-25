# Vega-Lite and Vega Charts

`vega-lite` and `vega` fences are drawn as charts in the preview, in every palette mode. The charts
are drawn by the Vega runtime bundled with the extension: no executable, no server and no network,
so they also work in Restricted Mode. The runtime is loaded only on a page that holds a chart, and
the page keeps its strict Content Security Policy (no `unsafe-eval`: expressions run in the Vega
interpreter). The chart is a live SVG drawing that follows the preview theme (Cream, White, Dark or the
VS Code theme): background, text, axes and marks take the colours of the page, and a theme switch
draws the charts again. The legend, axis and title text follows the size of the page text, so it also
follows the Markdown font size setting and the preview zoom. The syntax is the one of
[Markdown Preview Enhanced](https://shd101wyy.github.io/markdown-preview-enhanced/#/diagrams?id=vega-and-vega-lite).

Hovering a Vega-Lite mark (a bar, a point, a line) shows its fields as key and value rows in a small
box in the page colours; the box follows the text size and the zoom. Put `"tooltip": null` on a mark
to turn it off for that mark. A full `vega` specification shows only the tooltips its marks define.

The specification is JSON or YAML. A first chart, with its data in the document:

````markdown
```vega-lite
{
  "title": "Revenue by region",
  "data": { "values": [
    { "region": "North", "revenue": 28 },
    { "region": "South", "revenue": 55 },
    { "region": "East", "revenue": 43 }
  ] },
  "mark": "bar",
  "encoding": {
    "x": { "field": "region", "type": "nominal" },
    "y": { "field": "revenue", "type": "quantitative" }
  }
}
```
````

The same chart in YAML, with a calculated field and a filter (expressions are supported):

````markdown
```vega-lite
data:
  values:
    - {region: North, revenue: 28}
    - {region: South, revenue: 55}
    - {region: East, revenue: 43}
transform:
  - {calculate: "datum.revenue * 1000", as: dollars}
  - {filter: "datum.dollars > 30000"}
mark: bar
encoding:
  x: {field: region, type: nominal, sort: -y}
  y: {field: dollars, type: quantitative}
```
````

A `vega` fence takes a full Vega specification (scales, axes and marks written out), for charts
Vega-Lite cannot express:

````markdown
```vega
{
  "width": 300, "height": 160, "padding": 5,
  "data": [{ "name": "table", "values": [
    { "category": "A", "amount": 28 }, { "category": "B", "amount": 55 }
  ] }],
  "scales": [
    { "name": "x", "type": "band", "domain": { "data": "table", "field": "category" }, "range": "width", "padding": 0.1 },
    { "name": "y", "domain": { "data": "table", "field": "amount" }, "nice": true, "range": "height" }
  ],
  "axes": [{ "orient": "bottom", "scale": "x" }, { "orient": "left", "scale": "y" }],
  "marks": [{ "type": "rect", "from": { "data": "table" }, "encode": { "enter": {
    "x": { "scale": "x", "field": "category" }, "width": { "scale": "x", "band": 1 },
    "y": { "scale": "y", "field": "amount" }, "y2": { "scale": "y", "value": 0 } } } }]
}
```
````

## Data files

Data is written inline (`values`) or read from a file next to the document with a relative `url`
(`"data": { "url": "data/sales.csv" }`). CSV, TSV and JSON files are read, with the rules of
`{include}`: a path relative to the document, inside the workspace (only the document's folder and
below in Restricted Mode), no link out of it, at most 5 MiB, at most 16 files per chart. The
preview draws the chart again when such a file changes on disk. The chart never loads a remote URL:
`https://...` shows a message instead of the chart, because the preview has no network. Download
the file next to the document, or paste the rows into `values`.

## Errors

A specification that is not valid JSON or YAML, a Vega or Vega-Lite error, or a data file that
cannot be read shows its message in place of the chart (like a Mermaid error). The preview shows no
**Chart source** section under a chart, since the source is the document itself; the HTML export
keeps it, closed, under each chart. The HTML export holds the drawn chart as it was, with no hover
detail and no script. The document is never changed.

## Your own `config`

A specification's own `config`, and the properties of its marks and axes, win over the sizes and
colours Studio gives a chart. For example, `config: { legend: { labelFontSize: 9 } }` draws the legend
labels at 9 px whatever the page text size.

## Insert a chart

The **Full** palette mode adds two commands, in the edition palette and in the slash menu:
**Vega-Lite chart** (`/chart`, `/vega-lite`) and **Vega chart** (`/vega`). Each inserts a small
bar-chart template after the selection, with the title selected. Choose Full in the select at the
start of the palette (or set `editing.defaultPaletteMode` to `full`). Full is MyST plus the
extensions of Studio itself; the charts are its first one. Only the two commands belong to Full:
the charts of a document are drawn in Strict, GFM and MyST too.

## Limits

- Input bindings (`bind`) and links (`href`) are not available, and `image` marks that load a URL
  are not drawn (images given as `data:image/...` URIs are). Selections, zoom and pan defined by
  the specification work.
- Remote data and remote fonts are never loaded.
