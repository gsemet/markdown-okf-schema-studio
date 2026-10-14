import katex from "katex";
import { parse, parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";

type HtmlNode = DefaultTreeAdapterTypes.Node;
type HtmlElement = DefaultTreeAdapterTypes.Element;

function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((entry) => entry.name === name)?.value;
}

function textContent(node: HtmlNode): string {
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(textContent).join("") : "";
}

export function renderMathHtml(html: string, stylesheetUri: string, nonce: string): string {
  if (!/class="[^"]*\b(?:math-inline|math-display|math)\b/u.test(html)) return html;
  const document = parse(html);
  const styles = new Map<string, string>();
  let rendered = false;

  const extractStyles = (node: HtmlNode): void => {
    if ("tagName" in node) {
      const style = attribute(node, "style");
      if (style) {
        let className = styles.get(style);
        if (!className) {
          className = "studio-math-style-" + styles.size;
          styles.set(style, className);
        }
        node.attrs = node.attrs.filter((entry) => entry.name !== "style");
        const existing = node.attrs.find((entry) => entry.name === "class");
        if (existing) existing.value += " " + className;
        else node.attrs.push({ name: "class", value: className });
      }
    }
    if ("childNodes" in node) node.childNodes.forEach(extractStyles);
  };

  const visit = (node: HtmlNode): void => {
    if ("tagName" in node) {
      const classes = (attribute(node, "class") ?? "").split(/\s+/u);
      const isMath = classes.includes("math-inline") || classes.includes("math-display")
        || classes.includes("math");
      if (isMath && !attribute(node, "data-studio-math-rendered")) {
        const displayMode = classes.includes("math-display") || node.tagName === "div";
        const rawSource = textContent(node).trim();
        const source = rawSource.replace(/^\\\[([\s\S]*)\\\]$|^\\\(([\s\S]*)\\\)$/u,
          (_match, display: string | undefined, inline: string | undefined) => display ?? inline ?? "");
        try {
          const fragment = parseFragment(katex.renderToString(source, {
            displayMode,
            trust: false,
            throwOnError: true,
            maxExpand: 1000,
            maxSize: 100,
          }));
          fragment.childNodes.forEach(extractStyles);
          node.childNodes = fragment.childNodes;
          node.childNodes.forEach((child) => { child.parentNode = node; });
          node.attrs.push({ name: "data-studio-math-rendered", value: "true" });
          rendered = true;
        } catch {
          node.attrs.push({ name: "data-studio-math-error", value: "true" });
          node.attrs.push({ name: "title", value: "This equation could not be rendered by KaTeX." });
        }
        return;
      }
    }
    if ("childNodes" in node) node.childNodes.forEach(visit);
  };
  visit(document);
  if (rendered) {
    const head = document.childNodes.find((node): node is HtmlElement => "tagName" in node && node.tagName === "html")
      ?.childNodes.find((node): node is HtmlElement => "tagName" in node && node.tagName === "head");
    if (head) {
      const assets = parseFragment('<link rel="stylesheet" data-studio-math-stylesheet><style data-studio-math-styles></style>');
      const link = assets.childNodes[0] as HtmlElement;
      link.attrs.push({ name: "href", value: stylesheetUri });
      const style = assets.childNodes[1] as HtmlElement;
      style.attrs.push({ name: "nonce", value: nonce });
      style.childNodes.push({
        nodeName: "#text",
        value: [...styles].map(([declarations, className]) => `.${className}{${declarations}}`).join("\n")
          + '\n.math-display{overflow-x:auto;overflow-y:hidden;}[data-studio-math-error]{text-decoration:underline wavy;}',
        parentNode: style,
      });
      for (const asset of assets.childNodes) {
        asset.parentNode = head;
        head.childNodes.push(asset);
      }
    }
  }
  return serialize(document);
}