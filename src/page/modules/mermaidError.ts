/** Shows the one error of a diagram that Mermaid could not render, replacing any earlier one. */
export function showMermaidError(diagram: HTMLElement, reason: string): void {
  diagram.querySelector(".myst-mermaid-error")?.remove();

  const doc = diagram.ownerDocument;
  const error = doc.createElement("div");
  error.setAttribute("class", "myst-mermaid-error");

  const message = doc.createElement("p");
  message.textContent = "Unable to render Mermaid diagram. Its source remains available below.";
  error.appendChild(message);

  const details = doc.createElement("details");
  details.setAttribute("class", "myst-mermaid-error-details");
  const summary = doc.createElement("summary");
  summary.textContent = "Show the parser error";
  const text = doc.createElement("pre");
  text.textContent = reason;
  details.appendChild(summary);
  details.appendChild(text);
  error.appendChild(details);

  diagram.insertBefore(error, diagram.firstChild);
}
