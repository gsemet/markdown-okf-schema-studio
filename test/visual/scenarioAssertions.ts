/**
 * The shared parts of the screenshot scenarios (`scenarios.ts`): the content assertions, page
 * messages, viewports and the first-element gap scenarios the definitions use.
 */

import type { ContentAssertion, Scenario } from "./scenarios";

/** A scenario as written below: id (legacy) and group are resolved through `scenarioIds.ts`. */
export type ScenarioDefinition = Omit<Scenario, "group" | "legacyId" | "locks">;

/** P9 B4 assertion lists (see the scenarios at the end of SCENARIO_DEFINITIONS). */
export const MAIN = "#sphinx-myst-preview-content";

export const CJK_RTL_ASSERTIONS: ContentAssertion[] = [
  { message: "the CJK, bidirectional and unbroken-string paragraphs are rendered", selector: `${MAIN} p`, count: 7 },
  { message: "the CJK text is present", selector: MAIN, text: "日本語の段落です" },
  { message: "the Chinese and Korean paragraphs wrap inside the pane", selector: `${MAIN} p:nth-of-type(-n+3)`, insidePane: true },
  {
    message: "the Hebrew and Arabic paragraphs are right-aligned (their text ends at the right edge of the column)",
    selector: MAIN,
    expr: "(() => { const rtl = [...document.querySelectorAll('#sphinx-myst-preview-content p')].filter(p => /[\\u0590-\\u06FF]/.test(p.textContent)); if (rtl.length !== 2) return false; return rtl.every(p => { const range = document.createRange(); range.selectNodeContents(p); const right = Math.max(...[...range.getClientRects()].map(box => box.right)); return p.getBoundingClientRect().right - right < 4; }); })()",
  },
  {
    message: "every paragraph and heading carries dir=auto, and the Hebrew and Arabic paragraphs resolve to right-to-left",
    selector: MAIN,
    expr: "(() => { const blocks = [...document.querySelectorAll('#sphinx-myst-preview-content p, #sphinx-myst-preview-content h1, #sphinx-myst-preview-content h2')]; if (!blocks.every(b => b.getAttribute('dir') === 'auto')) return false; const rtl = blocks.filter(b => /[\\u0590-\\u06FF]/.test(b.textContent)); return rtl.length === 2 && rtl.every(b => getComputedStyle(b).direction === 'rtl'); })()",
  },
  {
    message: "the CJK and Latin paragraphs stay left-to-right and start at the left edge of the column",
    selector: MAIN,
    expr: "(() => { const main = document.querySelector('#sphinx-myst-preview-content'); const ltr = [...main.querySelectorAll('p')].filter(p => !/[\\u0590-\\u06FF]/.test(p.textContent)); return ltr.length === 5 && ltr.every(p => getComputedStyle(p).direction === 'ltr' && getComputedStyle(p).textAlign !== 'right' && getComputedStyle(p).textAlign !== 'end'); })()",
  },
  { message: "the page does not scroll horizontally", selector: MAIN, expr: "document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth" },
  { message: "the unbroken word and the long URL wrap inside their paragraphs", selector: `${MAIN} p:nth-of-type(n+6)`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content p:nth-of-type(n+6)')].every(p => p.scrollWidth <= p.clientWidth + 1)" },
  { message: "the long URL link stays inside the pane", selector: `${MAIN} p:nth-of-type(7) a`, insidePane: true },
];

export const COMMENT_LIST_ASSERTIONS: ContentAssertion[] = [
  { message: "every comment shows as a chip (two gray, one TODO), none as a <!-- label", selector: ".okf-comment > .okf-chip", count: 3, notText: "<!--" },
  { message: "the gray comment chips are labelled comment", selector: ".okf-comment[data-okf-comment-kind='comment'] > .okf-chip", count: 2, text: "comment comment" },
  { message: "the TODO comment is a green TODO chip", selector: ".okf-comment[data-okf-comment-kind='todo'] > .okf-chip--todo", count: 1, text: "TODO" },
  { message: "the list keeps its four items", selector: "ul > li", count: 4 },
  { message: "the toolbar offers the Comments button", selector: "[data-sphinx-preview-comments-toggle]", count: 1, visible: true },
];

export const LONG_WORDS_ASSERTIONS: ContentAssertion[] = [
  { message: "the long words, URLs, list and quote are rendered", selector: `${MAIN} p, ${MAIN} li, ${MAIN} blockquote`, min: 7 },
  { message: "the page does not scroll horizontally", selector: MAIN, expr: "document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth" },
  { message: "no paragraph, list item or quote is wider than its box", selector: MAIN, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content p, #sphinx-myst-preview-content li, #sphinx-myst-preview-content blockquote')].every(e => e.scrollWidth <= e.clientWidth + 1)" },
  { message: "the links stay inside the pane", selector: `${MAIN} a`, min: 3, insidePane: true },
  { message: "the text after them continues", selector: `${MAIN} > p`, text: "continues normally" },
];

export const CODE_BLOCK_CAPTION_ASSERTIONS: ContentAssertion[] = [
  { message: "the two captioned code blocks and the plain fence are rendered", selector: `${MAIN} pre`, count: 3 },
  { message: "each caption is a title bar of its own code figure", selector: `${MAIN} figure > figcaption`, count: 2 },
  { message: "the plain fence keeps its left-aligned code", selector: `${MAIN} > pre`, count: 1, expr: "['left', 'start'].includes(getComputedStyle(document.querySelector('#sphinx-myst-preview-content > pre')).textAlign)" },
  { message: "the code of a captioned block is left-aligned, not centred", selector: `${MAIN} figure > pre`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure > pre')].every(e => ['left', 'start'].includes(getComputedStyle(e).textAlign) && ['left', 'start'].includes(getComputedStyle(e.querySelector('.myst-code-line, code')).textAlign))" },
  { message: "the caption text is left-aligned and upright", selector: `${MAIN} figure > figcaption`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure > figcaption')].every(e => ['left', 'start'].includes(getComputedStyle(e).textAlign) && getComputedStyle(e).fontStyle === 'normal')" },
  { message: "the caption sits above its code and has the same left edge and width", selector: `${MAIN} figure > figcaption`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure')].every(f => { const c = f.querySelector(':scope > figcaption').getBoundingClientRect(); const p = f.querySelector(':scope > pre').getBoundingClientRect(); return c.bottom <= p.top + 1.5 && Math.abs(c.left - p.left) < 1 && Math.abs(c.right - p.right) < 1; })" },
  { message: "the caption and the code join with a square top edge on the code and rounded top corners on the bar", selector: `${MAIN} figure > pre`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content figure')].every(f => { const c = getComputedStyle(f.querySelector(':scope > figcaption')); const p = getComputedStyle(f.querySelector(':scope > pre')); return p.borderTopLeftRadius === '0px' && p.borderTopRightRadius === '0px' && c.borderTopLeftRadius === '4px' && c.borderBottomLeftRadius === '0px'; })" },
  { message: "the numbered block keeps its line numbers and its emphasized line", selector: `${MAIN} figure .myst-code-line[data-line-number]`, min: 6 },
  { message: "the emphasized line is still marked", selector: `${MAIN} figure .myst-code-line-emphasized`, count: 1 },
  { message: "the caption text is present", selector: `${MAIN} figure > figcaption`, text: "src/export.py" },
];

export const MISSING_IMAGE_ASSERTIONS: ContentAssertion[] = [
  { message: "both image elements stay in the page", selector: `${MAIN} img`, count: 2 },
  { message: "the images keep their alt text", selector: `${MAIN} img`, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content img')].map(i => i.alt).join('|') === 'Diagram of the missing depot loop|Second missing picture'" },
  {
    message: "the paragraph after a missing image follows it in the document order",
    selector: `${MAIN} p`,
    expr: "(() => { const texts = [...document.querySelectorAll('#sphinx-myst-preview-content p')].map(p => p.textContent); return texts.findIndex(t => t.includes('Before the image')) < texts.findIndex(t => t.includes('After the image')); })()",
  },
  { message: "the images do not leave the pane", selector: `${MAIN} img`, insidePane: true },
];

export const HUGE_DOCUMENT_ASSERTIONS: ContentAssertion[] = [
  { message: "all 336 sections are rendered", selector: `${MAIN} h2`, count: 336 },
  { message: "the last paragraph is visible after scrolling to the end", selector: `${MAIN} p:last-of-type`, text: "End of the huge document", visible: true },
  {
    message: "the last paragraph lies inside the viewport above its bottom padding",
    selector: `${MAIN} p:last-of-type`,
    expr: "(() => { const box = [...document.querySelectorAll('#sphinx-myst-preview-content p')].pop().getBoundingClientRect(); return box.top >= 0 && box.bottom <= window.innerHeight - 20; })()",
  },
];

export const GFM_GALLERY_ASSERTIONS: ContentAssertion[] = [
  { message: "five alerts with their type titles", selector: `${MAIN} aside.admonition`, count: 5, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content aside.admonition > .admonition-title')].map(t => t.textContent.trim()).join(',') === 'Note,Tip,Important,Warning,Caution'" },
  {
    message: "the Caution alert is red like the danger colour and differs from the Warning amber",
    selector: `${MAIN} aside.admonition.caution`,
    count: 1,
    expr: "(() => { const q = (s) => getComputedStyle(document.querySelector('#sphinx-myst-preview-content aside.admonition.' + s + ' > .admonition-title')).color; const probe = document.createElement('span'); probe.style.color = 'var(--studio-charts-red)'; document.body.append(probe); const red = getComputedStyle(probe).color; probe.remove(); return q('caution') === red && q('caution') !== q('warning'); })()",
  },
  { message: "strikethrough text", selector: `${MAIN} del`, count: 1, text: "struck text" },
  { message: "two footnote references and their texts", selector: `${MAIN} a[data-footnote-ref]`, count: 2, expr: "document.querySelector('#sphinx-myst-preview-content section.footnotes').textContent.includes('Second footnote text.')" },
  { message: "three task list checkboxes, one checked", selector: `${MAIN} input.myst-checkbox`, count: 3, expr: "document.querySelectorAll('#sphinx-myst-preview-content input.myst-checkbox:checked').length === 1" },
  { message: "the table honours column alignment", selector: `${MAIN} table:not(.myst-raw-html-table table) th:nth-child(3)`, css: { textAlign: "right" } },
  { message: "the raw HTML table is rendered", selector: `${MAIN} .myst-raw-html-table`, count: 1, text: "cell two" },
  { message: "the raw details block is rendered", selector: `${MAIN} details`, count: 1, text: "Raw details" },
  { message: "the autolink is a link", selector: `${MAIN} a[data-sphinx-preview-navigation='https://example.com/gfm']`, count: 1 },
];

export const GRID_ASSERTIONS = (columns: number): ContentAssertion[] => [
  { message: "the outer grid has four items: item, linked card, plain card and nested-grid card", selector: `${MAIN} > .myst-grid > .myst-grid-row > .myst-grid-item`, count: 4 },
  { message: `the outer grid shows ${columns} column(s) at this pane width`, selector: `${MAIN} .myst-grid-row.myst-grid-md-2`, expr: `getComputedStyle(document.querySelector('#sphinx-myst-preview-content .myst-grid-row.myst-grid-md-2')).gridTemplateColumns.split(' ').length === ${columns}` },
  { message: "the linked card has header, body, footer and a link to its target", selector: `${MAIN} .myst-grid-card .myst-grid-card-link[data-sphinx-preview-navigation='targets/alpha.md']`, count: 1, text: "Linked card", expr: "(() => { const c = document.querySelector('#sphinx-myst-preview-content .myst-grid-card'); return ['header', 'body', 'footer'].every((p) => c.querySelector('.myst-grid-card-' + p)); })()" },
  { message: "the card text is readable (non-transparent text colour on the card)", selector: `${MAIN} .myst-grid-card-body`, visible: true },
  { message: "the nested grid shows two inner items", selector: `${MAIN} .myst-grid .myst-grid .myst-grid-item`, count: 2 },
  { message: "no grid part leaves the pane", selector: `${MAIN} .myst-grid-card`, insidePane: true },
  { message: "the text after the grid renders", selector: `${MAIN} p`, text: "Text after the grid renders normally." },
];

export const TOCTREE_ASSERTIONS: ContentAssertion[] = [
  { message: "two captions render as headings", selector: `${MAIN} .myst-toctree-caption[role='heading']`, count: 2 },
  { message: "the first tree links the target H1 and the explicit title", selector: `${MAIN} .myst-toctree-link[data-sphinx-preview-navigation='targets/alpha.md']`, min: 1, text: "Alpha target" },
  { message: "the explicit title wins over the target H1", selector: `${MAIN} .myst-toctree-link[data-sphinx-preview-navigation='targets/beta.md']`, min: 1, text: "Custom title" },
  { message: "the missing target shows as a warning entry without a link", selector: `${MAIN} .myst-toctree-missing`, count: 1, text: "targets/missing-chapter", visible: true },
  { message: "the glob lists the two documents of the folder", selector: `${MAIN} .myst-toctree:nth-of-type(2) .myst-toctree-link`, count: 2 },
  { message: "the hidden tree shows nothing", selector: `${MAIN} .myst-toctree-hidden`, count: 1, expr: "getComputedStyle(document.querySelector('#sphinx-myst-preview-content .myst-toctree-hidden')).display === 'none'" },
  { message: "the text after the trees renders", selector: `${MAIN} p`, text: "Text after the trees renders normally." },
];

export const LIST_TABLE_ASSERTIONS: ContentAssertion[] = [
  { message: "the pipe table and the two list-tables are three tables", selector: `${MAIN} table`, count: 3 },
  { message: "the list-table title is the caption of its figure", selector: `${MAIN} figure figcaption`, count: 1, text: "Fruit prices" },
  { message: "the list-table header cells look like the pipe table's", selector: `${MAIN} figure:has(figcaption) table th`, count: 2, css: { fontWeight: "600" } },
  { message: "the list-table keeps one header row and two body rows", selector: `${MAIN} figure:has(figcaption) table`, count: 1, expr: "(() => { const t = document.querySelector('#sphinx-myst-preview-content figure:has(figcaption) table'); return t.querySelectorAll('thead tr').length === 1 && t.querySelectorAll('tbody tr').length === 2; })()" },
  { message: "the list-table cell shows its inline Markdown", selector: `${MAIN} figure:has(figcaption) table td strong`, count: 1, text: "kilo" },
  { message: "the cell paragraph adds no space above or below the text", selector: `${MAIN} figure:has(figcaption) table td > p`, min: 1, css: { marginTop: "0px", marginBottom: "0px" } },
  { message: ":widths: gives the first column a quarter of the table", selector: `${MAIN} figure:has(figcaption) table col`, count: 2, expr: "(() => { const t = document.querySelector('#sphinx-myst-preview-content figure:has(figcaption) table'); const ratio = t.querySelector('th:nth-child(1)').getBoundingClientRect().width / t.getBoundingClientRect().width; return ratio > 0.2 && ratio < 0.3; })()" },
  { message: "the second list-table has two header rows", selector: `${MAIN} table`, min: 3, expr: "(() => { const tables = document.querySelectorAll('#sphinx-myst-preview-content table'); return tables[2].querySelectorAll('thead tr').length === 2 && tables[2].querySelectorAll('tbody tr').length === 2; })()" },
  { message: "every table is inside the pane", selector: `${MAIN} table`, insidePane: true },
];

export const MYST_GALLERY_ASSERTIONS: ContentAssertion[] = [
  { message: "a reference links to its label", selector: `${MAIN} a[data-sphinx-preview-navigation='#gallery-target']`, count: 1, text: "Labels and references" },
  { message: "the dropdown is a closed details block with its summary", selector: `${MAIN} details`, count: 1, text: "Read more", expr: "document.querySelector('#sphinx-myst-preview-content details').open === false" },
  { message: "the definition list has two terms", selector: `${MAIN} dl dt`, count: 2 },
  { message: "subscript and superscript", selector: `${MAIN} sub, ${MAIN} sup:not(.footnote-ref):not([data-footnote-ref])`, min: 2 },
  { message: "the kbd role", selector: `${MAIN} kbd`, count: 1, text: "Ctrl+S" },
  { message: "the abbreviation keeps its expansion", selector: `${MAIN} abbr`, count: 1, attr: { name: "title", value: "Heart Rate" } },
  { message: "the footnote text", selector: `${MAIN} section.footnotes`, text: "The MyST footnote text." },
  { message: "the inline math is typeset", selector: `${MAIN} .katex`, min: 1 },
];

export const MERMAID_ERROR_ASSERTIONS: ContentAssertion[] = [
  { message: "exactly one visible error message replaces the picture", selector: ".myst-mermaid-error", count: 1, visible: true, text: "Unable to render Mermaid diagram" },
  { message: "the error holds one closed details block with the parser message", selector: ".myst-mermaid-error details.myst-mermaid-error-details", count: 1, expr: "(() => { const d = document.querySelector('.myst-mermaid-error details'); return d.open === false && d.querySelector('pre').textContent.trim().length > 0; })()" },
  { message: "no rendered picture", selector: "img.myst-mermaid-image", count: 0 },
  { message: "the source stays available", selector: "details.myst-mermaid-source", count: 1, text: "flowchart TD" },
  { message: "the text after the diagram continues", selector: `${MAIN} > p`, text: "continues normally" },
];

/** The decoded SVG text of the first built-in PlantUML picture (an expression for `expr`). */
export const FIRST_PLANTUML_SVG = "decodeURIComponent(document.querySelector('img.myst-plantuml-image').getAttribute('src').split(',').slice(1).join(','))";

export function plantUmlBuiltinAssertions(dark: boolean): ContentAssertion[] {
  return [
    { message: "both diagrams are rendered by the built-in engine", selector: '.myst-plantuml-diagram[data-plantuml-engine="builtin"][data-render-state="rendered"]', count: 2 },
    { message: "each diagram is one visible picture", selector: "img.myst-plantuml-image", count: 2, visible: true, insidePane: true },
    { message: "no error message", selector: ".myst-plantuml-error", count: 0 },
    { message: `the engine drew the ${dark ? "dark" : "light"} variant`, selector: ".myst-plantuml-diagram", attr: { name: "data-plantuml-dark", value: String(dark) } },
    { message: "the picture holds the diagram labels", selector: "img.myst-plantuml-image", expr: `${FIRST_PLANTUML_SVG}.includes('>Alice<')` },
    { message: `the labels are ${dark ? "light on the dark" : "dark on the light"} page`, selector: "img.myst-plantuml-image", expr: `/<text[^>]*fill="${dark ? "#FFFFFF" : "#000000"}"[^>]*>Alice</.test(${FIRST_PLANTUML_SVG})` },
    { message: "the source stays available", selector: "details.myst-plantuml-source", count: 2, text: "Alice -> Bob" },
    { message: "nothing is fetched from the network", selector: MAIN, expr: "performance.getEntriesByType('resource').every((entry) => entry.name.startsWith('file:'))" },
    { message: "the text after the diagrams continues", selector: `${MAIN} > p`, text: "continues normally" },
  ];
}

export const PLANTUML_UNSUPPORTED_ASSERTIONS: ContentAssertion[] = [
  { message: "the diagram is refused by the built-in engine, not drawn", selector: '.myst-plantuml-diagram[data-plantuml-engine="builtin"][data-render-state="unavailable"]', count: 1 },
  { message: "one visible message names the standard-library include and its line", selector: ".myst-plantuml-error", count: 1, visible: true, text: "!include <C4/C4_Context> (line 2)" },
  { message: "the message hints at the useJar setting", selector: ".myst-plantuml-error", text: "markdownOkfSchemaStudio.plantuml.useJar" },
  { message: "no picture, not even the engine error picture", selector: "img.myst-plantuml-image", count: 0 },
  { message: "the source stays available", selector: "details.myst-plantuml-source", count: 1, text: "!include <C4/C4_Context>" },
  { message: "the host is never asked for a file", selector: MAIN, expr: "!window.visualMessages.some((message) => message.type === 'previewPlantUmlInclude')" },
  { message: "nothing is fetched from the network", selector: MAIN, expr: "performance.getEntriesByType('resource').every((entry) => entry.name.startsWith('file:'))" },
  { message: "the text after the diagram continues", selector: `${MAIN} > p`, text: "continues normally" },
];

/** The decoded SVG text of the built-in PlantUML picture number `index` (an expression for `expr`). */
export function plantUmlSvg(index: number): string {
  return `decodeURIComponent(document.querySelectorAll('img.myst-plantuml-image')[${index}].getAttribute('src').split(',').slice(1).join(','))`;
}

export const NO_NETWORK: ContentAssertion = { message: "nothing is fetched from the network", selector: MAIN, expr: "performance.getEntriesByType('resource').every((entry) => entry.name.startsWith('file:'))" };

export function plantUmlFileAssertions(dark: boolean): ContentAssertion[] {
  return [
    { message: "both diagram files are rendered by the built-in engine", selector: '.myst-plantuml-diagram[data-plantuml-engine="builtin"][data-render-state="rendered"]', count: 2 },
    { message: "the {uml} diagram names its file", selector: '.myst-plantuml-diagram[data-plantuml-file="plantuml/sequence.puml"]', count: 1 },
    { message: "the {plantuml} directive without a body names its file", selector: '.myst-plantuml-diagram[data-plantuml-file="plantuml/classes.puml"]', count: 1 },
    { message: "each diagram is one visible picture", selector: "img.myst-plantuml-image", count: 2, visible: true, insidePane: true },
    { message: "no error message", selector: ".myst-plantuml-error", count: 0 },
    { message: `the engine drew the ${dark ? "dark" : "light"} variant`, selector: ".myst-plantuml-diagram", attr: { name: "data-plantuml-dark", value: String(dark) } },
    { message: "the first picture is the sequence read from the file", selector: "img.myst-plantuml-image", expr: `${plantUmlSvg(0)}.includes('read from sequence.puml')` },
    { message: "the second picture is the class diagram read from the file", selector: "img.myst-plantuml-image", expr: `${plantUmlSvg(1)}.includes('DiagramFile')` },
    { message: "the source of the file stays available", selector: "details.myst-plantuml-source", count: 2, text: "read from sequence.puml" },
    { message: "the diagram files have no include to ask the host for", selector: MAIN, expr: "!window.visualMessages.some((message) => message.type === 'previewPlantUmlInclude')" },
    NO_NETWORK,
    { message: "the text after the diagrams continues", selector: `${MAIN} > p`, text: "continues normally" },
  ];
}

export function plantUmlIncludeAssertions(dark: boolean): ContentAssertion[] {
  const requests = "window.visualMessages.filter((message) => message.type === 'previewPlantUmlInclude')";
  return [
    { message: "the diagram is rendered by the built-in engine", selector: '.myst-plantuml-diagram[data-plantuml-engine="builtin"][data-render-state="rendered"]', count: 1 },
    { message: "the diagram is marked as reading local files", selector: '.myst-plantuml-diagram[data-plantuml-includes="true"]', count: 1 },
    { message: "one visible picture", selector: "img.myst-plantuml-image", count: 1, visible: true, insidePane: true },
    { message: "no error message", selector: ".myst-plantuml-error", count: 0 },
    { message: `the engine drew the ${dark ? "dark" : "light"} variant`, selector: ".myst-plantuml-diagram", attr: { name: "data-plantuml-dark", value: String(dark) } },
    { message: "the picture holds the participant of the nested include", selector: "img.myst-plantuml-image", expr: `${plantUmlSvg(0)}.includes('Included Carol')` },
    { message: "the page asked the host for the include, then for the nested one next to it", selector: MAIN, expr: `${requests}.length === 2 && ${requests}[0].path === 'plantuml/styles/common.puml' && ${requests}[0].from === null && ${requests}[1].path === 'participants.puml' && ${requests}[1].from.endsWith('/plantuml/styles/common.puml')` },
    { message: "the include requests carry the document context and an edit id", selector: MAIN, expr: `${requests}.every((message) => message.documentId && message.requestId === 1 && /^plantuml-\\d+$/u.test(message.editId))` },
    { message: "the source stays available", selector: "details.myst-plantuml-source", count: 1, text: "!include plantuml/styles/common.puml" },
    NO_NETWORK,
    { message: "the text after the diagram continues", selector: `${MAIN} > p`, text: "continues normally" },
  ];
}

export const INVALID_YAML_ASSERTIONS: ContentAssertion[] = [
  { message: "the parse error is shown as an alert row", selector: "[data-okf-properties] tr.okf-error[role=alert], [data-okf-properties] .okf-error [role=alert]", count: 1, text: "Invalid frontmatter YAML" },
  { message: "the badge counts one error", selector: "[data-okf-badge]", count: 1, attr: { name: "data-okf-errors", value: "1" } },
  { message: "the body is still rendered", selector: `${MAIN} h1`, text: "Body after broken frontmatter" },
  { message: "the body paragraph is rendered", selector: `${MAIN} > p`, text: "still rendered below the parse error" },
];

export const STRICT_FIELD_ASSERTIONS: ContentAssertion[] = [
  { message: "the properties table is shown", selector: "[data-okf-properties]", count: 1 },
  { message: "the badge counts one warning", selector: "[data-okf-badge]", count: 1, attr: { name: "data-okf-warnings", value: "1" } },
  { message: "the undeclared field is listed", selector: "[data-okf-properties]", text: "bonus_field" },
];

export const PROPERTIES_HIDDEN_ASSERTIONS: ContentAssertion[] = [
  { message: "no properties table", selector: "[data-okf-properties]", count: 0 },
  { message: "the heading still renders", selector: `${MAIN} h1`, text: "Frontmatter Rendering" },
  { message: "the raw YAML is not shown", selector: MAIN, notText: "Preview Team" },
];

/** P9 B5 assertion lists and mock-host messages (extension states). */
export const BARS = "[data-sphinx-preview-change-layer] > span";
export const NO_HORIZONTAL_SCROLL = "document.documentElement.scrollWidth <= window.innerWidth + 1";

/** Lines of the changed blocks of fixture 44-change-bar.md (heading, paragraph, nested bullet, bullet, number, quotation, table, code, admonition, image). */
export const CHANGE_BAR_LINES: ReadonlyArray<readonly [number, number]> = [[7, 7], [9, 9], [12, 12], [13, 13], [16, 16], [20, 20], [26, 28], [34, 36], [42, 44], [48, 48]];
export const INCOMING_CHANGES_MESSAGE = {
  data: { type: "previewIncomingChanges", enabled: true, ranges: CHANGE_BAR_LINES.map(([start, end]) => ({ start, end })) },
};
/** Three ranges that each cross several blocks: lines 7-13 (heading to bullets), 26-36 (table to code) and 48 (image). */
export const INCOMING_RANGES_MESSAGE = {
  data: { type: "previewIncomingChanges", enabled: true, ranges: [{ start: 7, end: 13 }, { start: 26, end: 36 }, { start: 48, end: 48 }] },
};

/** CR 090: the blocks of `54-readme-showcase` reported as changed since the last commit (intro, one card, admonition, figure). */
export const README_SHOWCASE_CHANGES_MESSAGE = {
  data: { type: "previewIncomingChanges", enabled: true, ranges: [{ start: 16, end: 17 }, { start: 28, end: 32 }, { start: 41, end: 47 }, { start: 49, end: 55 }] },
};

export const INCOMING_BARS_ASSERTIONS: ContentAssertion[] = [
  { message: "every block the ranges meet is marked and the blocks before them are not", selector: `${MAIN} [data-sphinx-preview-changed]`, min: 8,
    expr: "(() => { const marked = [...document.querySelectorAll('#sphinx-myst-preview-content [data-sphinx-preview-changed]')]; const first = document.querySelector('#sphinx-myst-preview-content p'); return marked.every(e => e.getBoundingClientRect().top > first.getBoundingClientRect().bottom) && !first.hasAttribute('data-sphinx-preview-changed') && !document.querySelector('#sphinx-myst-preview-content h2').hasAttribute('data-sphinx-preview-changed'); })()" },
  { message: "one bar is drawn per marked block, 3 px wide with square ends and the added-line green", selector: BARS, min: 8,
    css: { width: "3px", borderTopLeftRadius: "0px", borderBottomRightRadius: "0px", backgroundColor: "rgb(46, 160, 67)" } },
  {
    message: "every bar sits in one column at the left margin of the page, whatever the indentation of its block",
    selector: BARS,
    expr: "(() => { const lefts = [...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')].map(b => Math.round(b.getBoundingClientRect().left * 10)); return new Set(lefts).size === 1 && lefts[0] >= 0 && lefts[0] <= 160; })()",
  },
  {
    message: "every bar spans the top and the full height of its block",
    selector: BARS,
    expr: "(() => { const bars = [...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')]; const blocks = [...document.querySelectorAll('#sphinx-myst-preview-content [data-sphinx-preview-changed]')].map(e => (e.tagName === 'CODE' && e.parentElement.tagName === 'PRE' ? e.parentElement : e)); return bars.length === blocks.length && bars.every((bar, i) => { const a = bar.getBoundingClientRect(); const b = blocks[i].getBoundingClientRect(); return Math.abs(a.top - b.top) <= 1 && Math.abs(a.height - b.height) <= 1; }); })()",
  },
  {
    message: "no bar touches the text of its block",
    selector: BARS,
    expr: "(() => { const bars = [...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')]; const heading = document.querySelector('#sphinx-myst-preview-content h2'); return bars.every(b => b.getBoundingClientRect().right + 4 <= heading.getBoundingClientRect().left + 1); })()",
  },
  { message: "the bars do not make the page scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
  { message: "the Diff toggle is pressed", selector: "[data-sphinx-preview-diff-toggle]", attr: { name: "aria-pressed", value: "true" } },
];

export const INCOMING_DIFF_OFF_ASSERTIONS: ContentAssertion[] = [
  { message: "the view preference is off", selector: "html", attr: { name: "data-sphinx-preview-incoming", value: "off" } },
  { message: "the Diff toggle shows it is not pressed", selector: "[data-sphinx-preview-diff-toggle]", attr: { name: "aria-pressed", value: "false" } },
  { message: "the host still reported ten changed blocks", selector: `${MAIN} [data-sphinx-preview-changed]`, count: 10 },
  { message: "the bar layer is hidden", selector: "[data-sphinx-preview-change-layer]", count: 1, css: { display: "none" } },
  { message: "no bar is visible", selector: BARS, expr: "[...document.querySelectorAll('[data-sphinx-preview-change-layer] > span')].every(b => b.getBoundingClientRect().width === 0)" },
];

export const THREAD_ENTRY_OPEN = {
  id: "thread-open",
  anchor: { line: 3, endLine: 3, quote: "retry budget is exceeded", prefix: "The ", suffix: " when three" },
  resolved: false,
  createdAt: "2 days ago",
  comments: [
    { id: "c1", author: "Marie Dubois", createdAt: "2 days ago", body: "Is three failures the right limit for the batch client?" },
    { id: "c2", author: "Tom Becker", createdAt: "yesterday", body: "Yes for interactive calls; the batch client sets its own budget." },
  ],
};
export const THREAD_ENTRY_RESOLVED = {
  id: "thread-resolved",
  anchor: { line: 5, endLine: 5, quote: "first request never waits", prefix: "so the ", suffix: " for a cold" },
  resolved: true,
  createdAt: "2 days ago",
  comments: [
    { id: "c3", author: "Marie Dubois", createdAt: "2 days ago", body: "Say how long the warm-up takes." },
  ],
};
export const THREAD_ENTRY_ORPHAN_OPEN = {
  id: "thread-orphan-open",
  orphaned: true,
  anchor: { line: 40, endLine: 40, quote: "the paragraph that was deleted in the last edit", prefix: "", suffix: "" },
  resolved: false,
  createdAt: "this morning",
  comments: [{ id: "c4", author: "Tom Becker", createdAt: "this morning", body: "This sentence is gone; was that on purpose?" }],
};
export const THREAD_ENTRY_ORPHAN_RESOLVED = {
  id: "thread-orphan-resolved",
  orphaned: true,
  anchor: { line: 52, endLine: 52, quote: "an old caveat nobody wrote down again", prefix: "", suffix: "" },
  resolved: true,
  createdAt: "2 days ago",
  comments: [
    { id: "c5", author: "Marie Dubois", createdAt: "2 days ago", body: "Covered by the new section." },
    { id: "c6", author: "Tom Becker", createdAt: "yesterday", body: "Agreed, closing it." },
  ],
};
export const THREADS_MESSAGE = { data: { type: "previewComments", threads: [THREAD_ENTRY_OPEN, THREAD_ENTRY_RESOLVED] } };
export const ORPHAN_THREADS_MESSAGE = { data: { type: "previewComments", threads: [THREAD_ENTRY_OPEN, THREAD_ENTRY_ORPHAN_OPEN, THREAD_ENTRY_ORPHAN_RESOLVED] } };

export const POPOVER = "[data-okf-comment-popover]";
export const REVIEW_THREAD_OPEN_ASSERTIONS: ContentAssertion[] = [
  { message: "the two anchored quotes are highlighted in the text", selector: `${MAIN} mark[data-okf-comment-thread]`, count: 2 },
  { message: "only the resolved quote is marked as resolved", selector: `${MAIN} mark[data-okf-comment-resolved="true"]`, count: 1, text: "first request never waits" },
  { message: "the paragraph without a thread has no mark", selector: `${MAIN} p:nth-of-type(4) mark`, count: 0 },
  { message: "clicking the open quote shows its thread, visible, with both comments in order", selector: POPOVER, count: 1, visible: true, text: "Marie Dubois" },
  { message: "the second comment follows the first", selector: `${POPOVER} [data-okf-comment-body]`, count: 2,
    expr: "[...document.querySelectorAll('[data-okf-comment-popover] [data-okf-comment-body]')].map(e => e.textContent).join('|') === 'Is three failures the right limit for the batch client?|Yes for interactive calls; the batch client sets its own budget.'" },
  { message: "an open thread shows no Resolved state", selector: `${POPOVER} [data-okf-comment-state]`, count: 0 },
  { message: "the thread popover stays inside the pane", selector: POPOVER, insidePane: true },
  { message: "no orphan box is shown while every thread is anchored", selector: "[data-okf-orphans]", count: 0 },
];
export const REVIEW_THREAD_RESOLVED_ASSERTIONS: ContentAssertion[] = [
  { message: "the two anchored quotes are highlighted in the text", selector: `${MAIN} mark[data-okf-comment-thread]`, count: 2 },
  { message: "clicking the resolved quote shows its thread, visible", selector: POPOVER, count: 1, visible: true, text: "Say how long the warm-up takes." },
  { message: "the popover is marked resolved and says so", selector: `${POPOVER}[data-okf-comment-resolved="true"] [data-okf-comment-state="resolved"]`, count: 1, text: "Resolved" },
  { message: "the resolved quote is drawn differently from the open one", selector: `${MAIN} mark[data-okf-comment-resolved="true"]`, count: 1,
    expr: "(() => { const open = document.querySelector('#sphinx-myst-preview-content mark[data-okf-comment-thread]:not([data-okf-comment-resolved])'); const done = document.querySelector('#sphinx-myst-preview-content mark[data-okf-comment-resolved=\"true\"]'); const a = getComputedStyle(open); const b = getComputedStyle(done); return a.backgroundColor !== b.backgroundColor || a.textDecorationLine !== b.textDecorationLine || a.opacity !== b.opacity; })()" },
  { message: "the thread popover stays inside the pane", selector: POPOVER, insidePane: true },
];
export const ORPHAN_LIST_ASSERTIONS: ContentAssertion[] = [
  { message: "the anchored thread is highlighted in the text", selector: `${MAIN} mark[data-okf-comment-thread]`, count: 1 },
  { message: "the Orphaned comments box is shown after the content", selector: "[data-okf-orphans]", count: 1, visible: true, text: "Orphaned comments" },
  { message: "the box lists the two threads that lost their place", selector: "[data-okf-orphans] button[data-okf-comment-orphan]", count: 2, visible: true },
  { message: "each entry quotes its text and counts its comments", selector: "[data-okf-orphans]", text: "the paragraph that was deleted in the last edit" },
  { message: "the resolved orphan says it is resolved", selector: "[data-okf-orphans] button[data-okf-comment-resolved=\"true\"]", count: 1, text: "2 comments, resolved" },
  { message: "the box sits after the content element, not inside it", selector: "[data-okf-orphans]", expr: "document.getElementById('sphinx-myst-preview-content').nextElementSibling === document.querySelector('[data-okf-orphans]')" },
  { message: "the box stays inside the pane", selector: "[data-okf-orphans]", insidePane: true },
];
export const CHIPS_HIDDEN_ASSERTIONS: ContentAssertion[] = [
  { message: "the gray comment chips are still in the document", selector: `${MAIN} .okf-comment[data-okf-comment-kind="comment"]`, min: 2 },
  { message: "the setting is off on the page", selector: "html", attr: { name: "data-okf-show-comments", value: "false" } },
  { message: "no gray comment chip is displayed", selector: `${MAIN} .okf-comment[data-okf-comment-kind="comment"]`, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind=\"comment\"]')].every(e => getComputedStyle(e).display === 'none')" },
  { message: "the TODO chips stay visible", selector: `${MAIN} .okf-chip--todo`, min: 1, visible: true },
];

export const FORCED_DARK_ASSERTIONS: ContentAssertion[] = [
  { message: "the toolbar button put the preview in dark mode", selector: "html", attr: { name: "data-sphinx-preview-theme-mode", value: "dark" } },
  { message: "the page is dark although the host is light", selector: "body", css: { backgroundColor: "rgb(30, 30, 30)", color: "rgb(212, 212, 212)" } },
  { message: "the page asks the browser for dark controls", selector: "html", css: { colorScheme: "dark" } },
  { message: "the first admonition is drawn on a dark panel", selector: `${MAIN} .admonition`, min: 1, expr: "(() => { const m = getComputedStyle(document.querySelector('#sphinx-myst-preview-content .admonition')).backgroundColor.match(/[\\d.]+/g).map(Number); return (m[0] + m[1] + m[2]) / 3 < 100; })()" },
  { message: "the headings stay readable on the dark page", selector: `${MAIN} h1`, count: 1, expr: "(() => { const c = getComputedStyle(document.querySelector('#sphinx-myst-preview-content h1')).color.match(/[\\d.]+/g).map(Number); return (c[0] + c[1] + c[2]) / 3 > 150; })()" },
];

/** A fresh workspace: the built-in defaults, checked on the final frame (the first frame is checked by `check_fresh_workspace`). */
export const FRESH_WORKSPACE_ASSERTIONS: ContentAssertion[] = [
  { message: "the preview opens in the cream theme mode", selector: "html", attr: { name: "data-sphinx-preview-theme-mode", value: "cream" } },
  { message: "the theme button shows the cream mode", selector: "[data-sphinx-preview-theme-toggle]", count: 1, attr: { name: "aria-label", value: "Preview theme: Cream theme" } },
  { message: "the page is the light cream paper whatever the host theme", selector: "body", css: { backgroundColor: "rgb(245, 241, 232)", color: "rgb(43, 42, 39)" } },
  { message: "the floating toolbar is collapsed", selector: "html", attr: { name: "data-sphinx-preview-toolbar-state", value: "collapsed" } },
  { message: "the collapse button offers to show the view controls", selector: "[data-sphinx-preview-toolbar-collapse]", count: 1, visible: true, attr: { name: "aria-label", value: "Show view controls" } },
  { message: "rows 2 and 3 of the toolbar are hidden", selector: "[data-sphinx-preview-toolbar-more]", count: 1, expr: "(() => { const more = document.querySelector('[data-sphinx-preview-toolbar-more]'); return more.hidden && more.getBoundingClientRect().height === 0; })()" },
];

export const zoomAssertions = (zoom: number): ContentAssertion[] => [
  { message: `the stored zoom is ${zoom} %`, selector: "html", attr: { name: "data-sphinx-preview-zoom", value: String(zoom) } },
  { message: `the zoom variable is ${zoom / 100}`, selector: "html", expr: `Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sphinx-preview-zoom')) - ${zoom / 100}) < 0.001` },
  { message: `the body text is scaled to ${zoom} % of the base size`, selector: `${MAIN} p`, min: 1,
    expr: `(() => { const base = parseFloat(getComputedStyle(document.body).getPropertyValue('--studio-markdown-font-size')) || 14; const size = parseFloat(getComputedStyle(document.querySelector('#sphinx-myst-preview-content p')).fontSize); return Math.abs(size - base * ${zoom / 100}) <= 0.5; })()` },
  { message: "the content column is the zoomed maximum width or the pane, whichever is smaller", selector: MAIN,
    expr: `(() => { const box = document.querySelector('#sphinx-myst-preview-content').getBoundingClientRect(); const wanted = Math.min(window.innerWidth, 960 * ${zoom / 100}); return Math.abs(box.width - wanted) <= 40; })()` },
  { message: "the page does not scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
  { message: "the text column stays inside the pane", selector: `${MAIN} p`, insidePane: true },
];

export const READ_ONLY_ASSERTIONS: ContentAssertion[] = [
  { message: "the toolbar is shown", selector: "[data-sphinx-preview-toolbar]", count: 1, visible: true },
  { message: "the read-only toolbar has no Edit (pencil) button", selector: "[data-sphinx-preview-edit-toggle]", count: 0 },
  { message: "the Refresh button is still there", selector: "[data-sphinx-preview-refresh]", count: 1 },
  { message: "edit mode is never switched on", selector: "html", expr: "document.documentElement.getAttribute('data-sphinx-preview-edit-mode') !== 'on'" },
  { message: "no frontmatter cell is editable", selector: "[data-okf-edit-cell]", count: 0 },
  { message: "every frontmatter row says it is not editable", selector: "[data-okf-field]", min: 5, expr: "[...document.querySelectorAll('[data-okf-field]')].every(row => row.getAttribute('data-okf-editable') === 'false')" },
  { message: "the document itself is still rendered", selector: `${MAIN} h1`, count: 1, text: "Brake pedal release detection" },
];
export const READ_ONLY_NO_HOVER_ASSERTIONS: ContentAssertion[] = [
  { message: "no block is marked as an edit target after the pointer rested on a paragraph", selector: "[data-sphinx-preview-edit-hover]", count: 0 },
  { message: "the paragraph under the pointer has no outline", selector: `${MAIN} p`, min: 1, expr: "(() => { const hovered = [...document.querySelectorAll('#sphinx-myst-preview-content p')].find(p => p.matches(':hover')); if (!hovered) return 'no paragraph under the pointer'; const style = getComputedStyle(hovered); return style.outlineStyle === 'none' || style.outlineWidth === '0px'; })()" },
  { message: "clicking the paragraph opened no editor", selector: "[data-sphinx-preview-block-editor], .sphinx-preview-block-editor", count: 0 },
  { message: "the pointer is a normal text cursor, not an edit affordance", selector: `${MAIN} p`, min: 1, expr: "(() => { const hovered = [...document.querySelectorAll('#sphinx-myst-preview-content p')].find(p => p.matches(':hover')); return hovered !== undefined && getComputedStyle(hovered).cursor !== 'pointer'; })()" },
  { message: "there is no Edit button", selector: "[data-sphinx-preview-edit-toggle]", count: 0 },
];

export const MARK_EDITOR_SELECTION_ASSERTIONS: ContentAssertion[] = [
  { message: "exactly one block carries the editor-selection marker", selector: "[data-sphinx-preview-current=\"true\"]", count: 1, visible: true },
  { message: "the marked block is the one at the editor's selection line", selector: "[data-sphinx-preview-current=\"true\"]", text: "The dispatch path is the only component",
    attr: { name: "aria-current", value: "location" } },
  { message: "the marker is an outline in the find-match colour", selector: "[data-sphinx-preview-current=\"true\"]", css: { outlineStyle: "solid", outlineWidth: "2px" } },
];

export const STICKY_SHADOW_ASSERTIONS: ContentAssertion[] = [
  { message: "the band is marked as having content scrolled under it", selector: "[data-sphinx-preview-sticky-headings]", count: 1, visible: true,
    attr: { name: "data-scrolled-under", value: "" } },
  { message: "the band casts a soft shadow below it, offset downward and blurred",
    selector: "[data-sphinx-preview-sticky-headings]",
    expr: "(() => { const shadow = getComputedStyle(document.querySelector('[data-sphinx-preview-sticky-headings]')).boxShadow; const parts = shadow.match(/-?\\d+(?:\\.\\d+)?px/g) || []; return shadow !== 'none' && parts.length >= 3 && Number.parseFloat(parts[1]) > 0 && Number.parseFloat(parts[2]) > 0; })()" },
  { message: "the band stays fixed at the top of the pane, so the shadow shifts nothing",
    selector: "[data-sphinx-preview-sticky-headings]",
    expr: "getComputedStyle(document.querySelector('[data-sphinx-preview-sticky-headings]')).position === 'fixed' && document.querySelector('[data-sphinx-preview-sticky-headings]').getBoundingClientRect().top === 0" },
  { message: "the toolbar is stacked above the band", selector: "[data-sphinx-preview-toolbar]",
    expr: "Number.parseInt(getComputedStyle(document.querySelector('[data-sphinx-preview-toolbar]')).zIndex, 10) > Number.parseInt(getComputedStyle(document.querySelector('[data-sphinx-preview-sticky-headings]')).zIndex, 10)" },
];

export const BACK_ENABLED_ASSERTIONS: ContentAssertion[] = [
  { message: "Back is enabled once the host reports a place to go back to", selector: "[data-sphinx-preview-back]", count: 1, expr: "document.querySelector('[data-sphinx-preview-back]').disabled === false" },
  { message: "Next stays disabled", selector: "[data-sphinx-preview-next]", count: 1, expr: "document.querySelector('[data-sphinx-preview-next]').disabled === true" },
  { message: "the in-page jump scrolled the target heading into view", selector: `${MAIN} h2`, min: 1, expr: "window.scrollY > 100" },
];

export const BLOCK_SELECTION_ASSERTIONS: ContentAssertion[] = [
  { message: "two blocks are selected", selector: "[data-sphinx-preview-block-selected=\"true\"]", count: 2, visible: true },
  { message: "the selected blocks are outlined in the focus colour", selector: "[data-sphinx-preview-block-selected=\"true\"]", css: { outlineStyle: "solid", outlineWidth: "2px" } },
  { message: "the selection is announced", selector: ".sphinx-preview-selection-status", count: 1, text: "2 blocks selected" },
  { message: "no editor is open", selector: ".sphinx-preview-block-editor", count: 0 },
];

export const MAX_WIDTH_ASSERTIONS: ContentAssertion[] = [
  { message: "the content column is 1400 px wide, the configured maximum", selector: MAIN,
    expr: "Math.abs(document.querySelector('#sphinx-myst-preview-content').getBoundingClientRect().width - 1400) <= 1" },
  { message: "the column is centred in the 2000 px pane", selector: MAIN,
    expr: "(() => { const box = document.querySelector('#sphinx-myst-preview-content').getBoundingClientRect(); return Math.abs(box.left - (window.innerWidth - box.width) / 2) <= 1; })()" },
  { message: "the page does not scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
];

/** CR 050: WCAG contrast of two computed colours (resolved through a canvas, so color-mix() works). */
export const CONTRAST_JS = `(() => { const rgb = (color) => { const context = document.createElement('canvas').getContext('2d'); context.fillStyle = '#000'; context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); }; const luminance = (color) => { const [r, g, b] = rgb(color).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; return (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); }; })()`;

export const BANNER = "[data-sphinx-preview-warning-banner]";

/** CR 050: the conf.py warning banner of a successful render, open. */
export const WARNING_BANNER_ASSERTIONS: ContentAssertion[] = [
  { message: "one warning banner is shown, as a status", selector: BANNER, count: 1, visible: true, attr: { name: "role", value: "status" } },
  { message: "the banner counts the two conf.py warnings of the page", selector: `${BANNER} [data-sphinx-preview-warning-text]`, text: "2 MyST syntax warnings from conf.py" },
  { message: "the banner has its warning icon", selector: `${BANNER} [data-sphinx-preview-warning-icon]`, count: 1, visible: true },
  { message: "the Open Problems button is offered", selector: `${BANNER} button[data-sphinx-preview-warning-problems]`, count: 1, visible: true, text: "Open Problems" },
  { message: "the close button is a labelled, focusable button", selector: `${BANNER} button[data-sphinx-preview-warning-close]`, count: 1, visible: true, attr: { name: "aria-label", value: "Close the warning" },
    expr: "(() => { const close = document.querySelector('[data-sphinx-preview-warning-close]'); close.focus(); const focused = document.activeElement === close; close.blur(); return focused; })()" },
  { message: "the banner takes no room in the flow (absolute), so the content and the scroll-sync anchors do not move", selector: BANNER, css: { position: "absolute" },
    expr: "Math.abs(document.querySelector('#sphinx-myst-preview-content > h1').getBoundingClientRect().top + scrollY - 40) <= 1" },
  { message: "the banner stays clear of the floating toolbar", selector: BANNER,
    expr: "(() => { const a = document.querySelector('[data-sphinx-preview-warning-banner]').getBoundingClientRect(); const b = document.querySelector('[data-sphinx-preview-toolbar]').getBoundingClientRect(); return a.right <= b.left - 4 || a.bottom <= b.top || a.top >= b.bottom; })()" },
  { message: "the banner sits above the first heading without covering it", selector: BANNER,
    expr: "document.querySelector('[data-sphinx-preview-warning-banner]').getBoundingClientRect().bottom <= document.querySelector('#sphinx-myst-preview-content > h1').getBoundingClientRect().top + 1" },
  { message: "the banner text and its buttons are readable on the banner (4.5:1) and the icon stands out (3:1)", selector: BANNER,
    expr: `(() => { const contrast = ${CONTRAST_JS}; const banner = document.querySelector('[data-sphinx-preview-warning-banner]'); const bg = getComputedStyle(banner).backgroundColor; const text = getComputedStyle(banner.querySelector('[data-sphinx-preview-warning-text]')).color; const link = getComputedStyle(banner.querySelector('[data-sphinx-preview-warning-problems]')).color; const close = getComputedStyle(banner.querySelector('[data-sphinx-preview-warning-close]')).color; const icon = getComputedStyle(banner.querySelector('[data-sphinx-preview-warning-icon]')).backgroundColor; return contrast(text, bg) >= 4.5 && contrast(link, bg) >= 4.5 && contrast(close, bg) >= 4.5 && contrast(icon, bg) >= 3; })()` },
  { message: "the page does not scroll sideways", selector: "html", expr: NO_HORIZONTAL_SCROLL },
];

/** CR 050: the banner after a click on its close button. */
export const WARNING_BANNER_CLOSED_ASSERTIONS: ContentAssertion[] = [
  { message: "the closed banner is gone", selector: BANNER, count: 0 },
  { message: "the page told the host which warning set was closed", selector: "html",
    expr: "window.visualMessages.filter((m) => m.type === 'previewWarningBannerClosed').length === 1 && /^[0-9a-z]+-[0-9a-f]{8}$/.test(window.visualMessages.find((m) => m.type === 'previewWarningBannerClosed').key)" },
  { message: "closing moved no content", selector: "html",
    expr: "Math.abs(document.querySelector('#sphinx-myst-preview-content > h1').getBoundingClientRect().top + scrollY - 40) <= 1" },
  { message: "the warnings stay in the status region for assistive technology", selector: "[data-sphinx-preview-status=\"success\"] li[data-sphinx-preview-diagnostic-code=\"myst-extension\"]", count: 2 },
];

/** CR 050: an image written inside a paragraph, then a standalone image. */
export const INLINE_IMAGE_ASSERTIONS: ContentAssertion[] = [
  { message: "the inline image is an inline element of its paragraph", selector: `${MAIN} p:not([data-sphinx-preview-figure]) > img`, count: 1, css: { display: "inline" } },
  { message: "the inline image sits on the text line, after the text before it and before the text after it", selector: `${MAIN} p:not([data-sphinx-preview-figure]) > img`,
    expr: "(() => { const image = document.querySelector('#sphinx-myst-preview-content p:not([data-sphinx-preview-figure]) > img'); const box = image.getBoundingClientRect(); const range = document.createRange(); const before = image.previousSibling; const after = image.nextSibling; range.selectNodeContents(before); const b = [...range.getClientRects()].pop(); range.selectNodeContents(after); const a = range.getClientRects()[0]; return b.right <= box.left + 1 && a.left >= box.right - 1 && b.bottom > box.top && b.top < box.bottom && a.bottom > box.top && a.top < box.bottom; })()" },
  { message: "the text line runs through the middle of the image, so the image reads as part of the line and not as a picture above the text", selector: `${MAIN} p:not([data-sphinx-preview-figure]) > img`,
    expr: "(() => { const image = document.querySelector('#sphinx-myst-preview-content p:not([data-sphinx-preview-figure]) > img'); const box = image.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(image.previousSibling); const text = [...range.getClientRects()].pop(); return Math.abs((text.top + text.bottom) / 2 - (box.top + box.bottom) / 2) <= Math.max(6, box.height * 0.2); })()" },
  { message: "the standalone image keeps its figure behaviour (a centred block of its own)", selector: `${MAIN} p[data-sphinx-preview-figure] > img`, count: 1,
    expr: "getComputedStyle(document.querySelector('#sphinx-myst-preview-content p[data-sphinx-preview-figure]')).textAlign === 'center'" },
  { message: "both images loaded", selector: `${MAIN} img`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content img')].every((image) => image.complete && image.naturalWidth > 0)" },
];

export const WIDE = { width: 900, height: 1000 };
export const NARROW = { width: 460, height: 900 };
export const XLARGE = { width: 1600, height: 1100 };

export const NARROW360 = { width: 360, height: 800 };

/**
 * P3: the same 40 px gap above the first element in every case. One scenario per case, state and
 * pane width; each writes its measurements to out/reports/visual/first-gap/<id>.json.
 */
export const FIRST_GAP_CASES = [
  ["paragraph", "23-first-paragraph", "element"],
  ["h1", "17-wrapped-editing", "element"],
  ["h2", "24-first-h2", "element"],
  ["h3", "25-first-h3", "element"],
  ["table", "26-first-table", "table"],
  ["image", "27-first-image", "element"],
  ["admonition", "28-first-admonition", "element"],
  ["properties", "07-frontmatter", "properties"],
  ["properties-docs", "08-okf-schema", "properties"],
  ["properties-issues", "09-okf-schema-missing-required", "properties"],
  ["empty", "20-empty-document", "empty"],
] as const;

export const FIRST_GAP_SCENARIOS: ScenarioDefinition[] = [
  // Edit mode (first block editor open, Start writing) in the three pane widths.
  // (h3 at 460 px renders exactly like h2: the harness rejects identical screenshots.)
  ...FIRST_GAP_CASES.flatMap(([name, fixture, kind]) => [WIDE, NARROW, XLARGE]
    .filter((viewport) => !(name === "h3" && viewport.width === NARROW.width)).map((viewport) => ({
    // @tests_req StRS-MDOKFSTUDIO-LAYOUT-004
    id: `first-element-gap-${name}-${viewport.width}`,
    fixture,
    theme: (name === "empty" ? "dark" : "light") as "light" | "dark",
    ...viewport,
    scroll: { kind: "top" as const },
    firstElementGap: (viewport.width === 1600 && kind === "element" ? "wide-margin" : kind) as Scenario["firstElementGap"],
    description: `First element: ${name}, edit mode, ${viewport.width}px pane. It starts 40 px below the top `
      + "(preview, edit mode and the open first-block editor with its palette); only a pane of 460 px or "
      + "less may push an interactive element below the toolbar.",
  }))),
  // Read mode, 900 px.
  // (The 07 and 09 read-mode screenshots already exist as frontmatter-light and okf-schema-missing-required-light.)
  ...FIRST_GAP_CASES.filter(([name, , kind]) => kind !== "empty" && !["properties", "properties-issues"].includes(name)).map(([name, fixture, kind]) => ({
    id: `first-element-gap-${name}-read-900`,
    fixture,
    theme: "light" as const,
    ...WIDE,
    scroll: { kind: "top" as const },
    firstElementGap: kind as Scenario["firstElementGap"],
    firstElementGapState: "read" as const,
    description: `Read mode, first element: ${name}. It starts exactly 40 px below the top.`,
  })),
  // A 360 px pane.
  ...FIRST_GAP_CASES.filter(([name]) => ["paragraph", "h1", "table", "properties", "empty"].includes(name))
    .map(([name, fixture, kind]) => ({
      id: `first-element-gap-${name}-360`,
      fixture,
      theme: (name === "empty" ? "dark" : "light") as "light" | "dark",
      ...NARROW360,
      scroll: { kind: "top" as const },
      firstElementGap: kind as Scenario["firstElementGap"],
      description: `First element: ${name}, edit mode, 360 px pane.`,
    })),
  // P8: the floating toolbar on three rows, expanded and collapsed, in every preview theme, wide
  // and at 360 px. The expanded 360 px captures also prove the rows never overlap the text.
  ...(([
    ["light", undefined],
    ["dark", undefined],
    ["light", "white" as const],
    ["light", "cream" as const],
  ] as const).flatMap(([theme, mode]) => ([
    ["expanded", WIDE, "900"],
    ["collapsed", WIDE, "900"],
    ["expanded", NARROW360, "360"],
    ["collapsed", NARROW360, "360"],
  ] as const).map(([state, viewport, label]) => ({
    // @tests_req StRS-MDOKFSTUDIO-TOOLBAR-001
    id: `toolbar-rows-${state}-${mode ?? theme}-${label}`,
    fixture: "32-readme-margin-break",
    theme,
    ...(mode ? { previewThemeMode: mode } : {}),
    ...viewport,
    scroll: { kind: "top" as const },
    ...(state === "collapsed" ? { toolbarState: "collapsed" as const } : {}),
    description: `Floating toolbar, ${state}, ${mode ?? theme} theme, ${viewport.width} px pane: row 1 Refresh, `
      + "Anchor, Edit and the collapse button; row 2 Back, Next, Zoom -, Zoom +; row 3 Theme, Width, TOC, Diff. "
      + (state === "collapsed" ? "Rows 2 and 3 are hidden." : "No row overlaps the text or another row."),
  })))),
  // Collapsed toolbar: the first element clears the shorter toolbar (P3) at 360 px.
  ...FIRST_GAP_CASES.filter(([name]) => ["paragraph", "table"].includes(name))
    .map(([name, fixture, kind]) => ({
      // @tests_req SwRS-MDOKFSTUDIO-LAYOUT-018
      id: `first-element-gap-${name}-360-collapsed`,
      fixture,
      theme: "light" as const,
      ...NARROW360,
      scroll: { kind: "top" as const },
      toolbarState: "collapsed" as const,
      firstElementGap: kind as Scenario["firstElementGap"],
      description: `First element: ${name}, edit mode, 360 px pane, toolbar collapsed.`,
    })),
  // Auto and Full width modes at 900 px.
  ...(["auto", "full"] as const).flatMap((widthMode) => FIRST_GAP_CASES
    .filter(([name]) => ["paragraph", "properties", "empty"].includes(name))
    .map(([name, fixture, kind]) => ({
      id: `first-element-gap-${name}-${widthMode}-900`,
      fixture,
      theme: (name === "empty" ? "dark" : "light") as "light" | "dark",
      ...WIDE,
      scroll: { kind: "top" as const },
      firstElementGap: kind as Scenario["firstElementGap"],
      firstElementGapWidth: widthMode,
      description: `First element: ${name}, ${widthMode} width mode, 900 px pane: the same 40 px gap.`,
    }))),
  // Dark theme.
  ...(["paragraph", "properties", "table"] as const).map((name) => {
    const [, fixture, kind] = FIRST_GAP_CASES.find(([candidate]) => candidate === name)!;
    return {
      id: `first-element-gap-${name}-dark-900`,
      fixture,
      theme: "dark" as const,
      ...WIDE,
      scroll: { kind: "top" as const },
      firstElementGap: kind as Scenario["firstElementGap"],
      description: `First element: ${name}, dark theme, edit mode, 900 px pane: the same 40 px gap.`,
    };
  }),
];

export const DOLLAR_PRICES_ASSERTIONS: ContentAssertion[] = [
  { message: "the real $x$ span is typeset as maths", selector: `${MAIN} p:last-of-type .katex`, count: 1 },
  { message: "only the real span is typeset, the price sentences hold no maths", selector: `${MAIN} .katex`, count: 1 },
  { message: "every price sentence keeps its dollar signs as text", selector: `${MAIN} p`, count: 4, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content p')].slice(0, 3).every((paragraph) => paragraph.textContent.includes('$') && !paragraph.querySelector('.katex'))" },
];

const ROW_HANDLES = "[data-okf-row-handle-layer] .okf-table-row-handle";

/** Every handle is left of its table, inside the pane and centred on its row (2 px). */
const HANDLE_GEOMETRY = "[...document.querySelectorAll('[data-okf-row-handle-layer] .okf-table-row-handle')].every((handle) => { const table = document.querySelector('#sphinx-myst-preview-content table[data-sphinx-source-line=\"' + handle.dataset.okfRowTable + '\"]'); const row = table.rows[Number(handle.dataset.okfRow)]; const box = handle.getBoundingClientRect(); const tableBox = table.getBoundingClientRect(); const rowBox = row.getBoundingClientRect(); return box.width > 0 && box.left >= 0 && box.right <= tableBox.left + 1 && Math.abs((box.top + box.height / 2) - (rowBox.top + rowBox.height / 2)) <= 2; })";

const WHOLE_WORDS = "[...document.querySelectorAll('#sphinx-myst-preview-content table[data-okf-row-handles] :is(th, td)')].every((cell) => getComputedStyle(cell).overflowWrap === 'normal')";

export const ROW_HANDLE_ASSERTIONS: ContentAssertion[] = [
  { message: "both pipe tables offer row handles", selector: `${MAIN} table[data-okf-row-handles="true"]`, count: 2 },
  { message: "each of the seven body rows shows a handle", selector: ROW_HANDLES, count: 7, visible: true },
  { message: "the handle is the mark of the frontmatter list editor", selector: `${ROW_HANDLES}.okf-list-editor-handle`, count: 7 },
  { message: "the handles are outside the tables", selector: `${MAIN} table .okf-table-row-handle`, count: 0 },
  { message: "the header rows have no handle", selector: ROW_HANDLES, count: 7, expr: "[...document.querySelectorAll('[data-okf-row-handle-layer] .okf-table-row-handle')].every((handle) => Number(handle.dataset.okfRow) >= 1)" },
  { message: "the handle is named for assistive technology", selector: ROW_HANDLES, min: 1, attr: { name: "aria-label", value: "Move table row" } },
  { message: "every handle is left of its table, in the pane and centred on its row, never clipped", selector: ROW_HANDLES, min: 1, expr: HANDLE_GEOMETRY },
  { message: "the table that fills the column keeps its width and stays in the column", selector: `${MAIN} table[data-okf-row-handles="true"]:nth-of-type(2)`, count: 1, expr: "(() => { const column = document.querySelector('#sphinx-myst-preview-content > p').getBoundingClientRect(); const table = document.querySelectorAll('#sphinx-myst-preview-content table')[1]; const box = table.getBoundingClientRect(); return box.width >= column.width - 1 && box.left >= column.left - 1 && box.right <= column.right + 1 && table.scrollWidth <= table.clientWidth + 1; })()" },
  { message: "no word of a cell is broken", selector: `${MAIN} table[data-okf-row-handles="true"] td`, min: 1, expr: WHOLE_WORDS },
  { message: "every table is inside the pane", selector: `${MAIN} table`, insidePane: true },
];

export const NARROW_ROW_HANDLE_ASSERTIONS: ContentAssertion[] = [
  { message: "both pipe tables offer row handles", selector: `${MAIN} table[data-okf-row-handles="true"]`, count: 2 },
  { message: "each of the seven body rows shows a handle", selector: ROW_HANDLES, count: 7, visible: true },
  { message: "every handle is left of its table, in the pane and centred on its row, never clipped", selector: ROW_HANDLES, min: 1, expr: HANDLE_GEOMETRY },
  { message: "a table with no room on its left is pushed right by the handle's width", selector: `${MAIN} table[data-okf-row-handles="true"]`, count: 2, expr: "[...document.querySelectorAll('#sphinx-myst-preview-content table[data-okf-row-handles]')].every((table) => table.getBoundingClientRect().left >= 32)" },
  { message: "no word of a cell is broken", selector: `${MAIN} table[data-okf-row-handles="true"] td`, min: 1, expr: WHOLE_WORDS },
  { message: "every table is inside the pane", selector: `${MAIN} table`, insidePane: true },
];

export const ROW_DRAG_ASSERTIONS: ContentAssertion[] = [
  { message: "exactly one row is being dragged and it is dimmed", selector: `${MAIN} tr[data-okf-row-dragging="true"]`, count: 1, css: { opacity: "0.45" } },
  { message: "the row under the pointer shows the drop line below it", selector: `${MAIN} tr[data-okf-row-drop]`, count: 1, attr: { name: "data-okf-row-drop", value: "after" }, expr: "getComputedStyle(document.querySelector('#sphinx-myst-preview-content tr[data-okf-row-drop] td')).boxShadow !== 'none'" },
  { message: "the drag opened no editor", selector: "[data-sphinx-preview-block-editor]", count: 0 },
];

export const LIST_ROW_HANDLE_ASSERTIONS: ContentAssertion[] = [
  { message: "both list-tables offer row handles", selector: `${MAIN} figure table[data-okf-row-handles="true"]`, count: 2 },
  { message: "each of the five body rows shows a handle", selector: ROW_HANDLES, count: 5, visible: true },
  { message: "the handle is the mark of the frontmatter list editor", selector: `${ROW_HANDLES}.okf-list-editor-handle`, count: 5 },
  { message: "the header rows, one in the first list-table and two in the second, have no handle", selector: ROW_HANDLES, count: 5, expr: "[...document.querySelectorAll('[data-okf-row-handle-layer] .okf-table-row-handle')].every((handle) => { const table = document.querySelector('#sphinx-myst-preview-content table[data-sphinx-source-line=\"' + handle.dataset.okfRowTable + '\"]'); return Number(handle.dataset.okfRow) >= table.tHead.rows.length; })" },
  { message: "the second list-table has two header rows", selector: `${MAIN} figure table`, count: 2, expr: "document.querySelectorAll('#sphinx-myst-preview-content figure table')[1].tHead.rows.length === 2" },
  { message: "every handle is left of its table, in the pane and centred on its row, never clipped", selector: ROW_HANDLES, min: 1, expr: HANDLE_GEOMETRY },
  { message: "no word of a cell is broken", selector: `${MAIN} figure td`, min: 1, expr: WHOLE_WORDS },
  { message: "every table is inside the pane", selector: `${MAIN} table`, insidePane: true },
];

export const WIDE_ROW_HANDLE_ASSERTIONS: ContentAssertion[] = [
  { message: "the table is wider than the pane and scrolls sideways", selector: `${MAIN} table[data-okf-row-handles="true"]`, count: 1, expr: "(() => { const table = document.querySelector('#sphinx-myst-preview-content table'); table.scrollLeft = 300; return table.scrollWidth > table.clientWidth + 100 && table.scrollLeft > 0; })()" },
  { message: "each of the three body rows keeps a visible handle after the table scrolled", selector: ROW_HANDLES, count: 3, visible: true },
  { message: "every handle stays left of the table, in the pane and centred on its row, never clipped", selector: ROW_HANDLES, min: 1, expr: HANDLE_GEOMETRY },
  { message: "the handles are outside the scrolling box", selector: `${MAIN} table .okf-table-row-handle`, count: 0 },
  { message: "every table is inside the pane", selector: `${MAIN} table`, insidePane: true },
];
