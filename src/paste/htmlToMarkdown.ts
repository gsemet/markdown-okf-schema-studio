import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

/**
 * Converts the `text/html` of a clipboard (Google Docs, Word, a web page, a VS Code copy) to
 * Markdown. Only headings, bold, italic, strikethrough, links, nested lists, inline code, code
 * blocks, blockquotes, simple tables and images (as links) are kept; every other element
 * contributes its text only. Scripts, styles, comments, hidden content and every attribute but
 * the few read here (href, src, alt, class, style, colspan, rowspan, type, checked) are dropped.
 */
type Node = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;

const SKIPPED = new Set(["script", "style", "head", "title", "meta", "link", "noscript", "template",
  "iframe", "object", "embed", "svg", "math", "button", "select", "textarea", "canvas", "audio", "video"]);
const BLOCKS = new Set(["p", "div", "section", "article", "header", "footer", "main", "nav", "aside",
  "figure", "figcaption", "ul", "ol", "li", "blockquote", "pre", "table", "hr", "dl", "dt", "dd",
  "details", "summary", "address", "fieldset", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "thead", "tbody", "tfoot", "tr", "caption"]);
const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/|\.\.?\/|[^:/?#]*(?:[/?#]|$))/iu;

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function attr(element: Element, name: string): string {
  return element.attrs.find((entry) => entry.name === name)?.value ?? "";
}

function style(element: Element): string {
  return attr(element, "style").toLowerCase().replace(/\s+/gu, "");
}

function hidden(element: Element): boolean {
  return element.attrs.some((entry) => entry.name === "hidden")
    || /display:none|visibility:hidden|mso-hide:all/u.test(style(element));
}

function hasBlock(node: Node): boolean {
  if (!isElement(node)) return false;
  if (SKIPPED.has(node.tagName)) return false;
  return BLOCKS.has(node.tagName) || node.childNodes.some(hasBlock);
}

function weightIsBold(css: string): boolean {
  const match = /font-weight:(\w+)/u.exec(css);
  if (!match) return false;
  const value = match[1];
  return value === "bold" || value === "bolder" || (Number(value) >= 600);
}

function isMonospaceBlock(element: Element): boolean {
  const css = style(element);
  return /white-space:pre/u.test(css) && /monospace|consolas|menlo|courier/u.test(css);
}

function safeUrl(value: string): string | undefined {
  const url = value.trim();
  if (url === "" || /[\u0000-\u001f]/u.test(url)) return undefined;
  if (!SAFE_URL.test(url)) return undefined;
  return url;
}

function destination(url: string): string {
  if (/[\s<>]/u.test(url)) return "<" + url.replace(/[<>]/gu, encodeURIComponent).replace(/\s/gu, "%20") + ">";
  return url.replace(/\(/gu, "%28").replace(/\)/gu, "%29");
}

function escapeText(text: string): string {
  return text
    .replace(/[\\`*[\]]/gu, "\\$&")
    .replace(/(^|[^\p{L}\p{N}])_|_(?=[^\p{L}\p{N}]|$)/gu, (match) => match.replace("_", "\\_"))
    .replace(/</gu, "\\<");
}

function escapeLineStart(line: string): string {
  return line
    .replace(/^(\s*)(#{1,6})(\s|$)/u, "$1\\$2$3")
    .replace(/^(\s*)([>+-])(\s)/u, "$1\\$2$3")
    .replace(/^(\s*)(\d+)([.)])(\s)/u, "$1$2\\$3$4");
}

function codeSpan(text: string): string {
  const runs = text.match(/`+/gu) ?? [];
  const length = runs.reduce((max, run) => Math.max(max, run.length), 0) + 1;
  const fence = "`".repeat(length);
  const padded = /^`|`$/u.test(text) || (/^ .* $/u.test(text) && text.trim() !== "") ? " " + text + " " : text;
  return fence + padded + fence;
}

interface InlineState {
  /** Bold and italic markers are left out (a heading is bold already). */
  plain: boolean;
}

function wrap(marker: string, content: string): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/u.exec(content);
  if (!match || match[2] === "") return content;
  return match[1] + marker + match[2] + marker + match[3];
}

function textContent(node: Node, preserve = false): string {
  if ("value" in node && node.nodeName === "#text") {
    return preserve ? node.value : node.value.replace(/\s+/gu, " ");
  }
  if (!isElement(node) || SKIPPED.has(node.tagName) || hidden(node)) return "";
  if (node.tagName === "br") return preserve ? "\n" : " ";
  const children = node.childNodes.map((child) => textContent(child, preserve)).join("");
  return BLOCKS.has(node.tagName) && !preserve ? " " + children + " " : children;
}

function inline(node: Node, state: InlineState): string {
  if (node.nodeName === "#text") return escapeText((node as DefaultTreeAdapterTypes.TextNode).value.replace(/\s+/gu, " "));
  if (!isElement(node) || SKIPPED.has(node.tagName) || hidden(node)) return "";
  const tag = node.tagName;
  const css = style(node);
  const children = (): string => node.childNodes.map((child) => inline(child, state)).join("");
  switch (tag) {
    case "br":
      return "\\\n";
    case "code":
    case "kbd":
    case "samp":
    case "tt":
      return codeSpan(textContent(node, true).replace(/\n/gu, " ")).replace(/^`\s+`$/u, "");
    case "img": {
      const url = safeUrl(attr(node, "src"));
      const alt = attr(node, "alt").replace(/\s+/gu, " ").trim();
      if (url === undefined || /^data:/iu.test(url)) return escapeText(alt);
      return "[" + escapeText(alt === "" ? "image" : alt) + "](" + destination(url) + ")";
    }
    case "input":
      return attr(node, "type") === "checkbox" ? (node.attrs.some((entry) => entry.name === "checked") ? "[x] " : "[ ] ") : "";
    case "a": {
      const url = safeUrl(attr(node, "href"));
      const text = children();
      if (url === undefined) return text;
      if (text.trim() === "") return "";
      return "[" + text.trim().replace(/\\\n/gu, " ") + "](" + destination(url) + ")";
    }
    default:
      break;
  }
  let result = children();
  if (state.plain) return result;
  const bold = tag === "strong" || tag === "b" ? !/font-weight:(?:normal|400|lighter)/u.test(css) : weightIsBold(css);
  const italic = tag === "em" || tag === "i" || tag === "cite" || tag === "dfn" || /font-style:italic/u.test(css);
  const strike = tag === "del" || tag === "s" || tag === "strike" || /text-decoration[^;]*line-through/u.test(css);
  if (strike) result = wrap("~~", result);
  if (italic) result = wrap("*", result);
  if (bold) result = wrap("**", result);
  return result;
}

function cleanParagraph(text: string): string {
  return text
    .replace(/[ \t]*\\\n[ \t]*/gu, "\\\n")
    .replace(/(?:\\\n)+$/u, "")
    .replace(/^(?:\\\n)+/u, "")
    .replace(/ /gu, " ")
    .trim()
    .replace(/^(\[[ x]\])\s+/u, "$1 ")
    .split("\n").map(escapeLineStart).join("\n");
}

function fence(code: string, language: string): string {
  const runs = code.match(/`{3,}/gu) ?? [];
  const length = Math.max(3, runs.reduce((max, run) => Math.max(max, run.length + 1), 0));
  const marker = "`".repeat(length);
  return marker + language + "\n" + code.replace(/\n+$/u, "") + "\n" + marker;
}

function languageOf(...elements: Array<Element | undefined>): string {
  for (const element of elements) {
    if (!element) continue;
    const match = /(?:^|\s)(?:language|lang|highlight-source|highlight-text)-([\w+#.-]+)/u.exec(attr(element, "class"));
    if (match) return match[1];
  }
  return "";
}

function indentBlock(text: string, indent: string): string {
  return text.split("\n").map((line) => (line === "" ? line : indent + line)).join("\n");
}

function listItems(list: Element): Array<{ node: Element; nested: Element[] }> {
  const items: Array<{ node: Element; nested: Element[] }> = [];
  for (const child of list.childNodes) {
    if (!isElement(child)) continue;
    if (child.tagName === "li") items.push({ node: child, nested: [] });
    // Google Docs puts a nested list next to its parent item instead of inside it.
    else if ((child.tagName === "ul" || child.tagName === "ol") && items.length > 0) items.at(-1)!.nested.push(child);
    else if (child.tagName === "ul" || child.tagName === "ol") items.push({ node: child, nested: [] });
  }
  return items;
}

function renderList(list: Element): string {
  const ordered = list.tagName === "ol";
  let number = Number.parseInt(attr(list, "start"), 10);
  if (!Number.isFinite(number)) number = 1;
  const lines: string[] = [];
  for (const item of listItems(list)) {
    const marker = item.node.tagName === "li" ? (ordered ? String(number++) + ". " : "- ") : "- ";
    const blocks = item.node.tagName === "li" ? convertBlocks(item.node.childNodes) : [renderList(item.node)];
    for (const nested of item.nested) blocks.push(renderList(nested));
    const isList = (block: string): boolean => /^(?:-|\d+\.) /u.test(block);
    const body = blocks.reduce((text, block, index) =>
      index === 0 ? block : text + (isList(block) ? "\n" : "\n\n") + block, "");
    lines.push(marker + indentBlock(body, " ".repeat(marker.length)).slice(marker.length));
  }
  return lines.join("\n");
}

function tableRows(table: Element): Element[] {
  const rows: Element[] = [];
  const visit = (node: Element): void => {
    for (const child of node.childNodes) {
      if (!isElement(child)) continue;
      if (child.tagName === "tr") rows.push(child);
      else if (["thead", "tbody", "tfoot"].includes(child.tagName)) visit(child);
    }
  };
  visit(table);
  return rows;
}

function containsTable(node: Node): boolean {
  return isElement(node) && (node.tagName === "table" || node.childNodes.some(containsTable));
}

function renderTable(table: Element): string | undefined {
  const rows = tableRows(table);
  if (rows.length === 0) return undefined;
  const cells = rows.map((row) => row.childNodes.filter((child): child is Element =>
    isElement(child) && (child.tagName === "td" || child.tagName === "th")));
  const simple = cells.every((row) => row.length > 0 && row.every((cell) =>
    Number(attr(cell, "colspan") || 1) <= 1 && Number(attr(cell, "rowspan") || 1) <= 1
    && !cell.childNodes.some(containsTable)));
  const text = (cell: Element): string => cleanParagraph(
    cell.childNodes.map((child) => inline(child, { plain: false })).join("").replace(/\\\n/gu, " ").replace(/\s+/gu, " "))
    .replace(/\|/gu, "\\|");
  if (!simple) {
    return cells.map((row) => row.map((cell) => text(cell)).filter((value) => value !== "").join(" "))
      .filter((line) => line !== "").join("\n\n") || undefined;
  }
  const width = Math.max(...cells.map((row) => row.length));
  const lines = cells.map((row) => {
    const values = row.map(text);
    while (values.length < width) values.push("");
    return "| " + values.join(" | ") + " |";
  });
  lines.splice(1, 0, "| " + Array.from({ length: width }, () => "---").join(" | ") + " |");
  return lines.join("\n");
}

/** Word marks list paragraphs with `mso-list` instead of using `<ul>`. */
function wordListItem(element: Element): { level: number; ordered: boolean; text: string } | undefined {
  const css = attr(element, "style").toLowerCase();
  const match = /mso-list:\s*(?!none)[^;]*?level(\d+)/u.exec(css);
  if (!match) return undefined;
  const raw = element.childNodes.map((child) => inline(child, { plain: false })).join("").replace(/ /gu, " ").trim();
  const marker = /^(?:[·•●○▪■§o*-]|\(?\d+[.)]|\(?[a-zA-Z][.)])(?:\s+|$)/u.exec(raw);
  return {
    level: Number(match[1]),
    ordered: marker !== null && /\d|[a-zA-Z]/u.test(marker[0].trim()) && marker[0].trim() !== "o",
    text: cleanParagraph(marker ? raw.slice(marker[0].length) : raw),
  };
}

function convertBlocks(nodes: Node[]): string[] {
  const blocks: string[] = [];
  let run = "";
  const flush = (): void => {
    const text = cleanParagraph(run);
    if (text !== "") blocks.push(text);
    run = "";
  };
  const wordItems: Array<{ level: number; ordered: boolean; text: string }> = [];
  const flushWord = (): void => {
    if (wordItems.length === 0) return;
    blocks.push(wordItems.map((item) =>
      "   ".repeat(Math.max(0, item.level - 1)) + (item.ordered ? "1. " : "- ") + item.text).join("\n"));
    wordItems.length = 0;
  };
  for (const node of nodes) {
    if (isElement(node) && (SKIPPED.has(node.tagName) || hidden(node))) continue;
    if (!isElement(node)) {
      if (node.nodeName === "#text") {
        flushWord();
        run += inline(node, { plain: false });
      }
      continue;
    }
    const tag = node.tagName;
    if (tag === "p") {
      const item = wordListItem(node);
      if (item !== undefined) {
        flush();
        if (item.text !== "") wordItems.push(item);
        continue;
      }
    }
    flushWord();
    if (!BLOCKS.has(tag)) {
      if (hasBlock(node)) {
        flush();
        blocks.push(...convertBlocks(node.childNodes));
      } else {
        run += inline(node, { plain: false });
      }
      continue;
    }
    flush();
    if (/^h[1-6]$/u.test(tag)) {
      const text = cleanParagraph(node.childNodes.map((child) => inline(child, { plain: true })).join("")
        .replace(/\\\n/gu, " ").replace(/\s+/gu, " "));
      if (text !== "") blocks.push("#".repeat(Number(tag[1])) + " " + text);
    } else if (tag === "p" || tag === "summary" || tag === "dt" || tag === "caption" || tag === "figcaption") {
      if (node.childNodes.some(hasBlock)) blocks.push(...convertBlocks(node.childNodes));
      else {
        const text = cleanParagraph(node.childNodes.map((child) => inline(child, { plain: false })).join(""));
        if (text !== "") blocks.push(text);
      }
    } else if (tag === "ul" || tag === "ol") {
      const list = renderList(node);
      if (list !== "") blocks.push(list);
    } else if (tag === "blockquote") {
      const inner = convertBlocks(node.childNodes).join("\n\n");
      if (inner !== "") blocks.push(inner.split("\n").map((line) => (line === "" ? ">" : "> " + line)).join("\n"));
    } else if (tag === "pre") {
      const codeChild = node.childNodes.find((child): child is Element => isElement(child) && child.tagName === "code");
      const code = textContent(node, true).replace(/\r\n?/gu, "\n");
      if (code.trim() !== "") blocks.push(fence(code, languageOf(node, codeChild)));
    } else if (tag === "table") {
      const table = renderTable(node);
      if (table !== undefined) blocks.push(table);
    } else if (tag === "hr") {
      blocks.push("---");
    } else if (tag === "div" && isMonospaceBlock(node)) {
      // A VS Code copy: lines as divs of spans in a monospace block. One line stays plain text.
      const lines = node.childNodes.some((child) => isElement(child) && child.tagName === "div")
        ? node.childNodes.filter(isElement).map((line) => textContent(line, true).replace(/\n/gu, ""))
        : textContent(node, true).split("\n");
      const code = lines.join("\n").replace(/ /gu, " ");
      if (lines.length > 1) blocks.push(fence(code, ""));
      else if (code.trim() !== "") blocks.push(code.trim());
    } else {
      blocks.push(...convertBlocks(node.childNodes));
    }
  }
  flush();
  flushWord();
  return blocks;
}

/** The Markdown of a clipboard `text/html`; an empty string when nothing readable is left. */
export function htmlToMarkdown(html: string): string {
  const tree = parseFragment(html);
  return convertBlocks(tree.childNodes).join("\n\n").replace(/\n{3,}/gu, "\n\n").trim();
}
