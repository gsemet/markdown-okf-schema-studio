/**
 * Renders the OKF frontmatter payload as the properties-table markup injected
 * at the top of the preview body. All dynamic values are HTML-escaped; the
 * webview receives data only via `data-*` attributes and renders overlays
 * from them, so no runtime scripting from untrusted content is involved.
 */

import type { FieldEntry, FrontmatterResult } from "./okfFrontmatter";
import type { FrontmatterLinkResult } from "./fileLinks";
import { annotateSourceMappings, type SourceMappingOptions } from "../mapping/sourceMapping";
import { stringify } from "yaml";
import { parse, type DefaultTreeAdapterTypes } from "parse5";

export const MAX_LIST_ITEMS = 50;

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return formatScalar(value);
}

/** A short plain-words label for a link problem; the full message stays in the tooltip. */
export function linkStatusLabel(link: FrontmatterLinkResult): string {
  const message = link.message ?? "";
  if (message.includes("does not resolve to a file") || message.includes("was not found")) {
    return "File not found";
  }
  if (message.includes("escapes")) return "Outside the allowed folder";
  if (message.includes("root is unavailable")) return "Link root unavailable";
  if (message.includes("absolute target")) return "Absolute paths are not allowed";
  if (message.includes("is ambiguous")) return "Several files match";
  if (message.includes("is empty")) return "Empty link";
  return link.code === "W15" ? "Link unavailable" : "Invalid link";
}

function linkRequest(link: FrontmatterLinkResult): string {
  return `okf-link:${encodeURIComponent(JSON.stringify({
    fieldPath: link.fieldPath,
    arrayIndex: link.arrayIndex,
  }))}`;
}

function linkTitle(link: FrontmatterLinkResult): string {
  if (link.status === "valid") {
    const target = link.workspaceRelativePath ?? link.normalizedTarget ?? link.target ?? "Open linked file";
    return [target, ...Object.entries(link.tooltipFields ?? {}).map(([name, value]) => `${name}: ${value}`)].join("\n");
  }
  if (link.status === "pending") {
    return "Loading linked file";
  }
  return `[${link.code ?? "W15"}] ${link.message}`;
}

function formatLinkedValue(value: unknown, link: FrontmatterLinkResult | undefined): string {
  const display = escapeHtml(formatScalar(value));
  if (!link) return display;
  const status = link.status === "valid" ? "valid" : link.status;
  const statusCode = link.code ? ` data-okf-link-code="${link.code}"` : "";
  const code = link.code ?? "W15";
  const icon = code === "W15" || link.severity === "warning" ? "⚠" : "✖";
  const statusLabel = link.status === "valid"
    ? ""
    : ` <span class="okf-link-status" data-okf-link-code="${escapeHtml(code)}"><span aria-hidden="true">${icon}</span> ${escapeHtml(linkStatusLabel(link))}</span>`;
  if (link.status === "valid") {
    const anchor = `<a href="#" role="link" tabindex="0" class="okf-frontmatter-link okf-link-${status}" data-sphinx-preview-navigation="${escapeHtml(linkRequest(link))}" data-okf-link-status="${status}" title="${escapeHtml(linkTitle(link))}">${display}</a>`;
    const excerpt = Object.values(link.previewFields ?? {}).map((value) => value.replace(/\s+/gu, " ").trim()).filter(Boolean).join("; ");
    if (!excerpt && link.markerLine === undefined) return anchor;
    const line = link.markerLine === undefined ? "" : `<span class="okf-link-line">line ${link.markerLine}</span>`;
    const preview = excerpt ? `<span class="okf-link-excerpt" title="${escapeHtml(excerpt)}">${escapeHtml(excerpt)}</span>` : "";
    return `<span class="okf-link-with-details">${anchor}${line}${preview}</span>`;
  }
  if (link.status === "pending") {
    return `<span class="okf-frontmatter-link okf-link-${status}" data-okf-link-status="${status}" aria-busy="true" title="${escapeHtml(linkTitle(link))}"><span class="okf-link-pending-text">${display}</span><span class="okf-link-spinner" role="status" aria-label="File links are being resolved" title="File links are being resolved"></span></span>`;
  }
  return `<span class="okf-frontmatter-link okf-link-${status}" data-okf-link-status="${status}"${statusCode} tabindex="0" title="${escapeHtml(linkTitle(link))}">${display}${statusLabel}</span>`;
}

function linkForPath(links: readonly FrontmatterLinkResult[], fieldPath: string): FrontmatterLinkResult | undefined {
  return links.find((link) => link.fieldPath === fieldPath);
}

function formatListValue(
  value: unknown[],
  links: readonly FrontmatterLinkResult[] = [],
  fieldPath?: string,
): string {
  if (value.length === 0) {
    return '<span class="okf-list-empty">[]</span>';
  }
  const visibleItems = value.slice(0, MAX_LIST_ITEMS)
    .map((item, index) => {
      const itemPath = fieldPath ? `${fieldPath}[${index}]` : undefined;
      return `<li>${formatStructuredValue(
        item,
        links,
        itemPath,
        itemPath ? linkForPath(links, itemPath) : undefined,
      )}</li>`;
    })
    .join("");
  const omitted = value.length - MAX_LIST_ITEMS;
  const more = omitted > 0 ? `<span class="okf-list-more">+ ${omitted} more</span>` : "";
  return `<ul class="okf-list-preview">${visibleItems}</ul>${more}`;
}

function formatStructuredValue(
  value: unknown,
  links: readonly FrontmatterLinkResult[],
  fieldPath: string | undefined,
  directLink?: FrontmatterLinkResult,
): string {
  if (Array.isArray(value)) {
    return formatListValue(value, links, fieldPath);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([name, child]) => {
      const childPath = fieldPath ? `${fieldPath}.${name}` : name;
      return `<li><span class="okf-object-key">${escapeHtml(name)}</span>: ${formatStructuredValue(
        child,
        links,
        childPath,
        linkForPath(links, childPath),
      )}</li>`;
    }).join("");
    return `<ul class="okf-object-preview">${entries}</ul>`;
  }
  return formatLinkedValue(value, directLink);
}

function formatBooleanValue(name: string, value: boolean): string {
  const checked = value ? " checked" : "";
  return `<span data-okf-value-display><input type="checkbox" class="okf-value-checkbox" aria-label="${escapeHtml(name)}" aria-disabled="true" tabindex="-1"${checked}><span class="okf-boolean-value">${String(value)}</span></span>`;
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

const SEVERITY_CLASS: Record<string, string> = {
  error: "okf-error",
  warning: "okf-warning",
  info: "okf-info",
};

function tooltipOf(field: FrontmatterResult["fields"][number]): string {
  const parts: string[] = [];
  if (field.doc?.title) {
    parts.push(field.doc.title);
  }
  if (field.doc?.description) {
    parts.push(field.doc.description);
  }
  if (field.enums && field.enums.length > 0) {
    parts.push(`Allowed: ${field.enums.join(", ")}`);
  }
  for (const issue of field.issues) {
    parts.push(issue.message);
  }
  return parts.join("\n");
}

/**
 * Builds the Obsidian-style properties table. Two columns (name | value) by
 * default; when an OKF schema matched, a third column shows each field's
 * schema description. Validation state is carried by CSS classes (underline),
 * `title` attributes (hover), a header badge, and a missing-required summary.
 */
export function renderPropertiesTable(
  result: FrontmatterResult,
  enabled: boolean,
  sourceMapping?: SourceMappingOptions,
  editingEnabled = true,
): string {
  if (!result.present || !enabled) {
    return "";
  }
  const withDocs = result.schemaFound;
  const totalIssues = result.summary.errors + result.summary.warnings + result.summary.infos;
  const missingRequiredNames = new Set(result.missingRequiredFields);
  const presentFields = new Set(
    result.fields
      .filter((field) => !missingRequiredNames.has(field.name))
      .map((field) => field.name),
  );
  const availableKeys = escapeHtml(JSON.stringify(
    (result.availableKeys ?? []).filter((name) => !presentFields.has(name)),
  ));
  const availableFields = escapeHtml(JSON.stringify(result.availableFields ?? []));
  const badge = totalIssues > 0
    ? ` <button type="button" data-okf-badge data-okf-errors="${result.summary.errors}" data-okf-warnings="${result.summary.warnings}" data-okf-infos="${result.summary.infos}" aria-label="Go to the first frontmatter issue">${result.summary.errors > 0 ? `✖ ${result.summary.errors}` : ""}${result.summary.warnings > 0 ? `${result.summary.errors > 0 ? " " : ""}⚠ ${result.summary.warnings}` : ""}${result.summary.infos > 0 && result.summary.errors + result.summary.warnings === 0 ? `ℹ ${result.summary.infos}` : ""}</button>`
    : "";
  const descriptionToggle = '<button type="button" data-okf-description-toggle aria-expanded="true" aria-label="Collapse Description column" title="Collapse Description column"><span aria-hidden="true" class="okf-description-collapse">&#9664;</span><span aria-hidden="true" class="okf-description-expand">&#9654;</span></button>';
  const header = withDocs
    ? `<thead><tr><th scope="col">Name</th><th scope="col"><span class="okf-column-heading">Value<span class="okf-description-restore">${descriptionToggle}</span></span></th><th scope="col"><span class="okf-column-heading">Description${descriptionToggle}</span></th></tr></thead>`
    : `<thead><tr><th scope="col">Names</th><th scope="col">Values</th></tr></thead>`;
  const rows = result.fields.map((field) => {
    const worst = field.issues.some((issue) => issue.severity === "error")
      ? "error"
      : field.issues.some((issue) => issue.severity === "warning")
        ? "warning"
        : field.issues.length > 0
          ? "info"
          : undefined;
    const rowClass = [
      worst ? SEVERITY_CLASS[worst] : "",
      field.known ? "okf-known" : "okf-unknown",
    ].filter(Boolean).join(" ");
    const tooltip = escapeHtml(tooltipOf(field));
    const valueJson = JSON.stringify(field.value) ?? "null";
    const valueYaml = stringify(field.value === undefined ? null : field.value, { lineWidth: 0 });
    const enumsJson = field.enums ? JSON.stringify(field.enums) : undefined;
    const suggestionsAttribute = field.linkSuggestions?.length
      ? ` data-okf-link-suggestions="${escapeHtml(JSON.stringify(field.linkSuggestions))}"`
      : "";
    const fieldLinks = field.linkResults ?? [];
    const scalarLink = fieldLinks.find((link) => link.arrayIndex === undefined);
    const structuredValue = field.value !== null && typeof field.value === "object";
    const objectValue = structuredValue && !Array.isArray(field.value);
    const valueDisplay = objectValue && fieldLinks.length === 0
      ? `<pre class="okf-value-yaml" data-okf-value-display><code class="language-yaml">${escapeHtml(valueYaml)}</code></pre>`
      : objectValue
        ? `<div class="okf-value-structured" data-okf-value-display>${formatStructuredValue(field.value, fieldLinks, field.name)}</div>`
      : typeof field.value === "boolean"
        ? formatBooleanValue(field.name, field.value)
      : Array.isArray(field.value)
        ? `<span class="okf-list-display" data-okf-value-display>${formatListValue(field.value, fieldLinks, field.name)}</span>`
      : `<span data-okf-value-display>${formatLinkedValue(field.value, scalarLink)}</span>`;
    const editable = editingEnabled && (structuredValue
      || field.valueKind !== "scalar"
      || field.fieldType !== "unknown"
      || typeof field.value === "string");
    const nameCellAttributes = editable ? ' data-okf-edit-cell="name"' : "";
    const valueCellAttributes = editable
      ? ' data-okf-value-cell data-okf-edit-cell="value"'
      : "";
    const typeIcon = withDocs ? typeIconOf(field) : "";
    const typeLabel = withDocs
      ? `<span class="okf-type-label">(${typeNameLabelOf(field)})</span>`
      : "";
    return `<tr class="${rowClass}" data-okf-field="${escapeHtml(field.name)}" data-okf-schema-found="${result.schemaFound}" data-okf-value-kind="${escapeHtml(field.valueKind)}" data-okf-nullable="${field.nullable}"${field.required ? ' data-okf-required="true"' : ""} data-okf-type="${escapeHtml(field.fieldType ?? "unknown")}" data-okf-value="${escapeHtml(valueJson)}" data-okf-value-yaml="${escapeHtml(valueYaml)}" data-okf-editable="${editable}"${suggestionsAttribute}${enumsJson ? ` data-okf-enums="${escapeHtml(enumsJson)}"` : ""} title="${tooltip}"><th scope="row"${nameCellAttributes}><span class="okf-name-cell">${typeIcon}<span class="okf-name-text">${escapeHtml(field.name)}</span>${typeLabel}</span></th><td class="${worst ? SEVERITY_CLASS[worst] : ""}"${valueCellAttributes}>${valueDisplay}</td>${withDocs ? `<td class="okf-doc">${escapeHtml(field.doc?.description ?? "")}</td>` : ""}</tr>`;
  }).join("");
  const infoRows = result.info.length > 0
    ? result.info.map((issue) => `<tr class="okf-info-row ${SEVERITY_CLASS[issue.severity]}" title="${escapeHtml(issue.message)}"><th scope="row" colspan="${withDocs ? 3 : 2}"${issue.severity === "error" ? ' role="alert"' : ""}>${escapeHtml(issue.severity === "error" ? "✖" : issue.severity === "warning" ? "⚠" : "ℹ")} ${escapeHtml(issue.message)}</th></tr>`).join("")
    : "";
  const missingRequired = result.missingRequiredFields.length > 0
    ? `<p class="okf-missing-required" data-okf-missing-required role="alert">Missing required fields: ${escapeHtml(result.missingRequiredFields.join(", "))}</p>`
    : "";
  const sourceLineAttribute = sourceMapping ? ' data-line="1"' : "";
  const markup = `<section${sourceLineAttribute} data-okf-properties data-okf-available-keys="${availableKeys}" data-okf-available-fields="${availableFields}" data-okf-order="${result.orderMode}" data-okf-schema-found="${result.schemaFound}"${result.additionalPropertiesAllowed === false ? ' data-okf-additional-properties="false"' : ""}><div class="okf-properties-title">Frontmatter properties${badge}</div><table class="okf-properties${withDocs ? " okf-properties-docs" : ""}">${header}<tbody>${rows}${infoRows}</tbody></table>${missingRequired}</section>`;
  return sourceMapping ? annotateSourceMappings(markup, sourceMapping) : markup;
}

/**
 * Swaps any existing properties table inside an already-rendered preview for a
 * fresh one without re-running the Sphinx render. When no content anchor
 * exists (pending/error placeholder pages), the markup is dropped — those
 * pages re-render from scratch anyway.
 */
export function replacePropertiesTableMarkup(
  html: string,
  result: FrontmatterResult,
  enabled: boolean,
  sourceMapping?: SourceMappingOptions,
  editingEnabled = true,
): string {
  return replacePropertiesTableHtml(
    html,
    renderPropertiesTable(result, enabled, sourceMapping, editingEnabled),
  );
}

/**
 * Same replacement as `replacePropertiesTableMarkup`, for markup the caller already rendered (the
 * host also sends that markup to the open page). An empty markup removes the section.
 */
export function replacePropertiesTableHtml(html: string, markup: string): string {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const edits: { start: number; end: number; replacement: string }[] = [];
  let contentOffset: number | undefined;
  const visit = (node: DefaultTreeAdapterTypes.Node): void => {
    if ("tagName" in node) {
      const location = node.sourceCodeLocation;
      if (node.tagName === "section"
        && node.attrs.some((attribute) => attribute.name === "data-okf-properties")
        && location) {
        edits.push({ start: location.startOffset, end: location.endOffset, replacement: "" });
        return;
      }
      if (contentOffset === undefined && node.tagName === "main"
        && node.attrs.some((attribute) => attribute.name === "id"
          && attribute.value === "sphinx-myst-preview-content")) {
        contentOffset = location?.startTag?.endOffset;
      }
    }
    if ("childNodes" in node) {
      node.childNodes.forEach(visit);
    }
  };
  visit(document);
  if (markup && contentOffset !== undefined) {
    edits.push({ start: contentOffset, end: contentOffset, replacement: markup });
  }
  return edits.sort((first, second) => second.start - first.start)
    .reduce((updated, edit) => updated.slice(0, edit.start)
      + edit.replacement + updated.slice(edit.end), html);
}

/**
 * Obsidian-style type icons, keyed by display type. Rendered before the field
 * name; the preview CSS scales the explicit 16x16 SVGs to the text size.
 */
const TYPE_ICONS: Record<string, string> = {
  text: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 3h12v1.5H9.25V13h-2.5V4.5H3V13H2z"/></svg>`,
  number: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 2.5h2v11H4.6L2.8 11l.9-1.1 1.3 1.2zm7.4.1c1.9 0 3 1.3 3 3 0 1.5-.8 2.4-2 3.6l-1.9 1.9h4.2v1.4H8.2v-1l3.3-3.4c1-.9 1.4-1.6 1.4-2.5 0-.9-.6-1.6-1.7-1.6-1 0-1.7.6-1.9 1.6H8c.2-1.8 1.6-3 3.4-3z"/></svg>`,
  list: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 3.5h2v1.6H2zm0 3.7h2v1.6H2zm0 3.7h2v1.6H2zM6 3.5h8v1.6H6zm0 3.7h8v1.6H6zm0 3.7h8v1.6H6z"/></svg>`,
  checkbox: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm.5 1.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5zm5.7 7.9L6 8.7l1-1.1 2.1 2.1 4-4 1 1.1z"/></svg>`,
  enum: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 3h12v1.5H2zm0 7.5V9h9v1.5zm0 3V12.5h6V14zM11.2 11l3-3 .9.9-3.9 3.9-2.5-2.5.9-.9z"/></svg>`,
  date: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3.5 2h9a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 13V3a1.5 1.5 0 0 1 1.5-1.5zm.5 5.2v6.3h8V6.7zm1-3.7a.5.5 0 0 0-.5.5v1.7h1.5V3.4zm5 7.3h1.5v1.4l1.2.7-.75 1.3-1.95-1.15z"/></svg>`,
  time: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM7.2 5h1.6v3.4l2.4 1.4-.8 1.3L7.2 9.4z"/></svg>`,
  datetime: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3.5 1.5h9A1.5 1.5 0 0 1 14 3v10a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13V3a1.5 1.5 0 0 1 1.5-1.5zm.5 5.2v6.3h8V6.7zm1-3.7a.5.5 0 0 0-.5.5v1.7h1.5V3.4zm5 7.3h1.5v1.4l1.2.7-.75 1.3-1.95-1.15z"/></svg>`,
  unknown: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 1.5A6.5 6.5 0 1 1 1.5 8 6.5 6.5 0 0 1 8 1.5zm0 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm.2 3.2c-1 0-1.6.5-1.8 1.3H5c.1-1.6 1.3-2.7 3.1-2.7 1.9 0 3.2 1.1 3.2 2.7 0 1.1-.6 1.8-1.6 2.3-.8.4-1.1.7-1.1 1.4v.4H7.3v-.6c0-1.1.5-1.7 1.6-2.3.8-.4 1.1-.8 1.1-1.5 0-.8-.7-1.4-1.8-1.4zM8 12.1a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"/></svg>`,
};

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  list: "List",
  checkbox: "Checkbox",
  enum: "Options (enum)",
  date: "Date",
  time: "Time",
  datetime: "Date and time",
  unknown: "Unknown type",
};

const TYPE_NAME_LABELS: Record<string, string> = {
  text: "text",
  number: "number",
  list: "list",
  checkbox: "boolean",
  enum: "enum",
  date: "date",
  time: "time",
  datetime: "datetime",
  unknown: "unknown",
};

function typeIconOf(field: FieldEntry): string {
  const type = field.fieldType ?? "unknown";
  const label = TYPE_LABELS[type] ?? "Unknown type";
  return `<span class="okf-type-icon" data-okf-type="${type}" title="${label}">${TYPE_ICONS[type] ?? TYPE_ICONS.unknown}</span>`;
}

function typeNameLabelOf(field: FieldEntry): string {
  const type = field.fieldType ?? "unknown";
  return TYPE_NAME_LABELS[type] ?? TYPE_NAME_LABELS.unknown;
}
