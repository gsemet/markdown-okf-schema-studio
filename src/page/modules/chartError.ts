// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
/** Shows the one error of a chart that could not be drawn, replacing any earlier one. */
export function showChartError(chart: HTMLElement, reason: string): void {
  chart.querySelector(".myst-vega-error")?.remove();

  const doc = chart.ownerDocument;
  const error = doc.createElement("div");
  error.setAttribute("class", "myst-vega-error");

  const message = doc.createElement("p");
  message.textContent = "Unable to render the chart. Its source remains available below.";
  error.appendChild(message);

  const details = doc.createElement("details");
  details.setAttribute("class", "myst-vega-error-details");
  details.setAttribute("open", "");
  const summary = doc.createElement("summary");
  summary.textContent = "Show the error";
  const text = doc.createElement("pre");
  text.textContent = reason;
  details.appendChild(summary);
  details.appendChild(text);
  error.appendChild(details);

  chart.textContent = "";
  chart.appendChild(error);
}
