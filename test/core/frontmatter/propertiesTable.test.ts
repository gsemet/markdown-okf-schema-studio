import assert from "node:assert/strict";
import { test } from "node:test";

import type { FieldEntry, FrontmatterResult } from "../../../src/core/frontmatter/okfFrontmatter";
import type { FrontmatterLinkResult } from "../../../src/core/frontmatter/fileLinks";
import { nodeSchemaFiles } from "../../../src/node-services/schemaFiles";
import { analyzeFrontmatter } from "../../../src/core/frontmatter/okfFrontmatter";
import {
  linkStatusLabel,
  MAX_LIST_ITEMS,
  renderPropertiesTable,
  replacePropertiesTableHtml,
  replacePropertiesTableMarkup,
} from "../../../src/core/frontmatter/propertiesTable";

function resultWith(overrides: Partial<FrontmatterResult> = {}): FrontmatterResult {
  return {
    present: true,
    fields: [],
    orderMode: "yaml",
    schemaFound: false,
    missingRequiredFields: [],
    info: [],
    summary: { errors: 0, warnings: 0, infos: 0 },
    ...overrides,
  };
}

function fieldWith(overrides: Partial<FieldEntry>): FieldEntry {
  return {
    name: "title",
    value: "Example",
    valueKind: "scalar",
    nullable: false,
    fieldType: "text",
    doc: null,
    enums: null,
    issues: [],
    known: true,
    ...overrides,
  };
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-004
test("no markup when frontmatter is absent or the table is disabled", () => {
  assert.equal(renderPropertiesTable(resultWith({ present: false }), true), "");
  assert.equal(renderPropertiesTable(resultWith(), false), "");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-005
test("renders a two-column Obsidian-like table with escaped values", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({
        name: "title",
        value: "A <b>dangerous</b> & summary",
      }),
      fieldWith({
        name: "tags",
        value: ["one", "two"],
        valueKind: "list",
        fieldType: "list",
      }),
    ],
  }), true);
  assert.match(markup, /<section data-okf-properties[^>]*>/u);
  assert.match(markup, /<div class="okf-properties-title">Frontmatter properties<\/div>/u);
  assert.doesNotMatch(markup, /<h[1-6][^>]*>Frontmatter properties/u);
  assert.match(markup, /<th scope="row" data-okf-edit-cell="name"><span class="okf-name-cell">[^]*?<span class="okf-name-text">title<\/span><\/span><\/th><td class="" data-okf-value-cell data-okf-edit-cell="value"><span data-okf-value-display>A &lt;b&gt;dangerous&lt;\/b&gt; &amp; summary<\/span><\/td>/u);
  assert.match(markup, /<th scope="row" data-okf-edit-cell="name"><span class="okf-name-cell">[^]*?<span class="okf-name-text">tags<\/span><\/span><\/th><td class="" data-okf-value-cell data-okf-edit-cell="value"><span class="okf-list-display" data-okf-value-display><ul class="okf-list-preview"><li>one<\/li><li>two<\/li><\/ul><\/span><\/td>/u);
  assert.doesNotMatch(markup, /data-okf-edit-field|<button\b/u);
  assert.doesNotMatch(markup, /okf-type-icon/u);
  // Obsidian-like: exactly two columns per row, no status column.
  assert.doesNotMatch(markup, /status/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-014
test("description controls live in column headers with an adjacent collapsed restore slot", () => {
  const markup = renderPropertiesTable(resultWith({ schemaFound: true }), true);
  assert.match(markup, /<div class="okf-properties-title">Frontmatter properties<\/div>/u);
  assert.match(markup, /<th scope="col"><span class="okf-column-heading">Description<button[^>]*data-okf-description-toggle/u);
  assert.match(markup, /<th scope="col"><span class="okf-column-heading">Value<span class="okf-description-restore"><button[^>]*data-okf-description-toggle/u);
  assert.equal((markup.match(/data-okf-description-toggle/gu) ?? []).length, 2);
});

test("read-only tables expose values without edit targets", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({
      name: "status",
      value: "draft",
    })],
  }), true, undefined, false);

  assert.match(markup, /data-okf-editable="false"/u);
  assert.doesNotMatch(markup, /data-okf-edit-cell|data-okf-value-cell/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-063
test("annotated scalar and list values render independent navigation and status markup", () => {
  const valid: FrontmatterLinkResult = {
    value: "docs/a.md",
    fieldPath: "reference",
    arrayIndex: undefined,
    syntax: "plain",
    resolution: "bundle-relative",
    target: "docs/a.md",
    normalizedTarget: "docs/a.md",
    resolvedPath: "/workspace/docs/a.md",
    workspaceRelativePath: "docs/a.md",
    query: undefined,
    fragment: "intro",
    label: undefined,
    status: "valid",
    code: undefined,
    severity: undefined,
    message: "",
  };
  const invalid: FrontmatterLinkResult = {
    ...valid,
    value: "docs/missing.md",
    fieldPath: "references[1]",
    arrayIndex: 1,
    target: "docs/missing.md",
    normalizedTarget: "docs/missing.md",
    resolvedPath: undefined,
    status: "invalid",
    code: "E10",
    severity: "error",
    message: "target does not resolve to a file",
  };
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    fields: [
      fieldWith({ name: "reference", value: "docs/a.md", linkResults: [valid] }),
      fieldWith({
        name: "references",
        value: ["docs/a.md", "docs/missing.md"],
        valueKind: "list",
        fieldType: "list",
        linkResults: [{ ...valid, fieldPath: "references[0]", arrayIndex: 0 }, invalid],
      }),
    ],
  }), true);
  assert.match(markup, /data-sphinx-preview-navigation="okf-link:/u);
  assert.match(markup, /class="okf-frontmatter-link okf-link-invalid"/u);
  assert.match(markup, /data-okf-link-code="E10"/u);
  assert.match(markup, /docs\/missing\.md/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
test("valid link tooltips expose workspace-relative paths", () => {
  const valid: FrontmatterLinkResult = {
    value: "../docs/a.md",
    fieldPath: "reference",
    arrayIndex: undefined,
    syntax: "plain",
    resolution: "document-relative",
    target: "../docs/a.md",
    normalizedTarget: "../docs/a.md",
    resolvedPath: "/workspace/docs/a.md",
    workspaceRelativePath: "docs/a.md",
    query: undefined,
    fragment: undefined,
    label: undefined,
    status: "valid",
    code: undefined,
    severity: undefined,
    message: "",
  };
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: "reference", value: valid.value, linkResults: [valid] })],
  }), true);

  assert.match(markup, /title="docs\/a\.md"/u);
  assert.doesNotMatch(markup, /title="\/workspace\/docs\/a\.md"/u);
  const annotated = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: "reference", value: valid.value, linkResults: [{
      ...valid,
      tooltipFields: { description: 'The <tool> SHALL "work".' },
      previewFields: { description: "The <tool>\n SHALL work." },
      markerLine: 42,
    }] })],
  }), true);
  assert.match(annotated, /title="docs\/a\.md\ndescription: The &lt;tool&gt; SHALL &quot;work&quot;\."/u);
  assert.match(annotated, /class="okf-link-line">line 42<\/span>/u);
  assert.match(annotated, /class="okf-link-excerpt" title="The &lt;tool&gt; SHALL work\.">The &lt;tool&gt; SHALL work\.<\/span>/u);
  assert.doesNotMatch(annotated, /<tool>/u);
});

test("pending links show a spinner after their text", () => {
  const pending: FrontmatterLinkResult = {
    value: "docs/pending.md",
    fieldPath: "reference",
    arrayIndex: undefined,
    syntax: "plain",
    resolution: "document-relative",
    target: "docs/pending.md",
    normalizedTarget: "docs/pending.md",
    resolvedPath: undefined,
    query: undefined,
    fragment: undefined,
    label: undefined,
    status: "pending",
    code: undefined,
    severity: undefined,
    message: "",
  };
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: "reference", value: pending.value, linkResults: [pending] })],
  }), true);

  assert.match(
    markup,
    /<span class="okf-link-pending-text">docs\/pending\.md<\/span><span class="okf-link-spinner" role="status" aria-label="File links are being resolved" title="File links are being resolved"><\/span>/u,
  );
  assert.match(markup, /class="okf-frontmatter-link okf-link-pending"/u);
});

test("deferred replacement removes pending link spinners", () => {
  const pending: FrontmatterLinkResult = {
    value: "docs/target.md",
    fieldPath: "reference",
    arrayIndex: undefined,
    syntax: "plain",
    resolution: "document-relative",
    target: "docs/target.md",
    normalizedTarget: "docs/target.md",
    resolvedPath: undefined,
    query: undefined,
    fragment: undefined,
    label: undefined,
    status: "pending",
    code: undefined,
    severity: undefined,
    message: "",
  };
  const resolved: FrontmatterLinkResult = {
    ...pending,
    resolvedPath: "/workspace/docs/target.md",
    status: "valid",
  };
  const initial = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: "reference", value: pending.value, linkResults: [pending] })],
  }), true);
  const replaced = replacePropertiesTableMarkup(
    `<main id="sphinx-myst-preview-content">${initial}<p>Body</p></main>`,
    resultWith({
      fields: [fieldWith({ name: "reference", value: resolved.value, linkResults: [resolved] })],
    }),
    true,
  );

  assert.ok(initial.includes("okf-link-spinner"));
  assert.doesNotMatch(replaced, /okf-link-spinner/u);
  assert.match(replaced, /data-okf-link-status="valid"/u);
});

test("nested annotated values render links and diagnostics inside object previews", () => {
  const valid: FrontmatterLinkResult = {
    value: "docs/target.md",
    fieldPath: "metadata.target",
    arrayIndex: undefined,
    syntax: "plain",
    resolution: "bundle-relative",
    target: "docs/target.md",
    normalizedTarget: "docs/target.md",
    resolvedPath: "/workspace/docs/target.md",
    query: undefined,
    fragment: undefined,
    label: undefined,
    status: "valid",
    code: undefined,
    severity: undefined,
    message: "",
  };
  const invalid: FrontmatterLinkResult = {
    ...valid,
    value: "docs/missing.md",
    fieldPath: "metadata.broken",
    target: "docs/missing.md",
    resolvedPath: undefined,
    status: "invalid",
    code: "E10",
    severity: "error",
    message: "target does not resolve to a file",
  };
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    summary: { errors: 1, warnings: 0, infos: 0 },
    fields: [fieldWith({
      name: "metadata",
      value: { target: "docs/target.md", broken: "docs/missing.md" },
      fieldType: "unknown",
      issues: [{ severity: "error", message: "[E10] target does not resolve to a file" }],
      linkResults: [valid, invalid],
    })],
  }), true);
  assert.match(markup, /data-okf-link-status="valid"/u);
  assert.match(markup, /class="okf-frontmatter-link okf-link-invalid"/u);
  assert.match(markup, /data-okf-link-code="E10"/u);
  assert.match(markup, /data-okf-errors="1"/u);
});

test("renders boolean values as read-only checkboxes in preview mode", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({ name: "enabled", value: true, fieldType: "checkbox" }),
      fieldWith({ name: "disabled", value: false, fieldType: "checkbox" }),
    ],
  }), true);

  assert.match(markup, /<span data-okf-value-display><input type="checkbox" class="okf-value-checkbox" aria-label="enabled" aria-disabled="true" tabindex="-1" checked><span class="okf-boolean-value">true<\/span><\/span>/u);
  assert.match(markup, /<span data-okf-value-display><input type="checkbox" class="okf-value-checkbox" aria-label="disabled" aria-disabled="true" tabindex="-1"><span class="okf-boolean-value">false<\/span><\/span>/u);
});

test("caps long list previews and reports omitted items", () => {
  const omitted = 5;
  const value = Array.from({ length: MAX_LIST_ITEMS + omitted }, (_, index) => `item-${index + 1}`);
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: "files", value, valueKind: "list", fieldType: "list" })],
  }), true);

  assert.equal(markup.match(/<li>/gu)?.length, MAX_LIST_ITEMS);
  assert.match(markup, /<span class="okf-list-more">\+ 5 more<\/span>/u);
  assert.doesNotMatch(markup, /<li>item-51<\/li>/u);
});

test("does not match a list link by array index without a field path", () => {
  const unrelated: FrontmatterLinkResult = {
    value: "docs/other.md",
    fieldPath: "other[0]",
    arrayIndex: 0,
    syntax: "plain",
    resolution: "bundle-relative",
    target: "docs/other.md",
    normalizedTarget: "docs/other.md",
    resolvedPath: undefined,
    workspaceRelativePath: undefined,
    query: undefined,
    fragment: undefined,
    label: undefined,
    status: "invalid",
    code: "E10",
    severity: "error",
    message: "target does not resolve to a file",
  };
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({
      name: "",
      value: ["docs/target.md"],
      valueKind: "list",
      fieldType: "list",
      linkResults: [unrelated],
    })],
  }), true);

  assert.match(markup, /<li>docs\/target\.md<\/li>/u);
  assert.doesNotMatch(markup, /okf-frontmatter-link|data-okf-link-code="E10"/u);
});

test("renders list items with hyphen markers", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: "files", value: ["one"], valueKind: "list", fieldType: "list" })],
  }), true);

  assert.match(markup, /<ul class="okf-list-preview"><li>one<\/li><\/ul>/u);
});

test("maps the injected properties section to the frontmatter source", () => {
  const markup = renderPropertiesTable(resultWith(), true, {
    documentId: "file:///active.md",
    activeSourceFile: "/workspace/active.md",
  });

  assert.match(markup, /<section[^>]*data-sphinx-source-file="\/workspace\/active\.md"/u);
  assert.match(markup, /data-sphinx-source-line="1"/u);
  assert.match(markup, /data-sphinx-preview-document="file:\/\/\/active\.md"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-029
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084
test("error rows carry the red underline class and hover tooltip", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({
        name: "uuid",
        value: "nope",
        doc: { title: "UUID", description: "Stable identifier." },
        issues: [{ severity: "error", message: "must match format \"uuid\"" }],
      }),
    ],
    summary: { errors: 1, warnings: 0, infos: 0 },
  }), true);
  assert.match(markup, /<td class="okf-error" data-okf-value-cell data-okf-edit-cell="value"><span data-okf-value-display>nope<\/span>/u);
  // The tooltip joins doc title, description, and issues with real newlines.
  assert.match(markup, /title="UUID\u000aStable identifier\.\u000amust match format &quot;uuid&quot;"/u);
  assert.match(markup, /data-okf-errors="1"/u);
});

test("missing required fields are summarized after the table", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    missingRequiredFields: ["title", "owner"],
  }), true);
  assert.match(
    markup,
    /<\/table><p class="okf-missing-required" data-okf-missing-required role="alert">Missing required fields: title, owner<\/p><\/section>/u,
  );
});

test("exposes unused schema keys for frontmatter key editing", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    availableKeys: ["type", "title", "status"],
    fields: [
      fieldWith({
        name: "type",
        value: "swrs",
      }),
    ],
    missingRequiredFields: ["title"],
  }), true);

  assert.match(markup, /data-okf-available-keys="\[&quot;title&quot;,&quot;status&quot;\]"/u);
});

test("exposes unused schema field metadata for the frontmatter toolbar", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    availableFields: [{
      name: "status",
      fieldType: "enum",
      enums: ["draft", "active"],
      defaultValue: "draft",
    }],
  }), true);

  assert.match(
    markup,
    /data-okf-available-fields="\[\{&quot;name&quot;:&quot;status&quot;,&quot;fieldType&quot;:&quot;enum&quot;,&quot;enums&quot;:\[&quot;draft&quot;,&quot;active&quot;\],&quot;defaultValue&quot;:&quot;draft&quot;\}\]"/u,
  );
});

test("structured values and enum choices are exposed for schema-aware editing", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    fields: [
      fieldWith({
        name: "lifecycle",
        value: "draft",
        enums: ["draft", "active"],
      }),
      fieldWith({
        name: "metadata",
        value: { owner: "platform" },
        fieldType: "unknown",
      }),
    ],
  }), true);
  assert.match(markup, /data-okf-field="lifecycle"[^>]*data-okf-value="&quot;draft&quot;"[^>]*data-okf-enums="\[&quot;draft&quot;,&quot;active&quot;\]"/u);
  assert.match(markup, /data-okf-field="metadata"[^>]*data-okf-schema-found="true"[^>]*data-okf-value-yaml="owner: platform\n"[^>]*data-okf-editable="true"/u);
});

test("unknown fields are marked and info rows render", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({
        name: "bonus",
        value: "x",
        known: false,
      }),
    ],
    info: [{ severity: "info", message: "No schema found for type \"mystery\"." }],
    summary: { errors: 0, warnings: 0, infos: 1 },
  }), true);
  assert.match(markup, /class="okf-unknown"/u);
  assert.match(markup, /tr class="okf-info-row okf-info"/u);
});

test("diagnostic errors span every table column and expose their severity", () => {
  for (const schemaFound of [false, true]) {
    const markup = renderPropertiesTable(resultWith({
      schemaFound,
      info: [{ severity: "error", message: 'Schema validation failed: unknown keyword "x-studio-unsupported"' }],
      summary: { errors: 1, warnings: 0, infos: 0 },
    }), true);
    assert.match(markup, /<tr class="okf-info-row okf-error"/u);
    assert.ok(markup.includes(`colspan="${schemaFound ? 3 : 2}" role="alert"`));
    assert.match(markup, /data-okf-errors="1"/u);
    assert.match(markup, /&quot;x-studio-unsupported&quot;/u);
  }
});

test("replacePropertiesTableMarkup swaps the table in place", () => {
  const html = [
    "<body>",
    "<main id=\"sphinx-myst-preview-content\" tabindex=\"-1\">",
    "<section data-okf-properties data-okf-order=\"schema\"><h2>old</h2></section>",
    "<section data-okf-properties data-okf-order=\"schema\"><h2>duplicate</h2></section>",
    "<p>Body content</p>",
    "</main>",
    "</body>",
  ].join("");
  const htmlWithout = "<body><main id=\"sphinx-myst-preview-content\" tabindex=\"-1\"><p>Body content</p></main></body>";
  const replaced = replacePropertiesTableMarkup(
    html,
    resultWith({ fields: [fieldWith({ name: "fresh", value: "yes" })] }),
    true,
    {
      documentId: "file:///active.md",
      activeSourceFile: "/workspace/active.md",
    },
  );
  assert.match(replaced, /data-okf-field="fresh"/u);
  assert.match(replaced, /data-sphinx-source-line="1"/u);
  assert.ok(!replaced.includes("<h2>old</h2>"));
  assert.ok(!replaced.includes("<h2>duplicate</h2>"));
  assert.equal(replaced.match(/<section\b[^>]*\bdata-okf-properties/gu)?.length, 1);
  assert.match(replaced, /<p>Body content<\/p>/u);
  const cleared = replacePropertiesTableMarkup(html, resultWith({ present: false }), true);
  assert.equal(cleared, htmlWithout);
});

test("repeated checkbox refreshes replace source-mapped tables without duplication", () => {
  const sourceMapping = {
    documentId: "file:///active.md",
    activeSourceFile: "/workspace/active.md",
  };
  const resultFor = (value: boolean): FrontmatterResult => resultWith({
    fields: [fieldWith({ name: "annotation_exemption", value, fieldType: "checkbox" })],
  });
  let html = `<main id="sphinx-myst-preview-content">${renderPropertiesTable(resultFor(false), true, sourceMapping)}<section><p>Body content</p></section></main>`;

  for (const value of [true, false]) {
    html = replacePropertiesTableMarkup(html, resultFor(value), true, sourceMapping);
    assert.equal(html.match(/<section\b[^>]*\bdata-okf-properties/gu)?.length, 1);
    assert.match(html, new RegExp(`<span class="okf-boolean-value">${value}</span>`, "u"));
    assert.ok(html.includes("<section><p>Body content</p></section>"));
  }

  assert.equal(
    replacePropertiesTableMarkup(html, resultWith({ present: false }), true),
    '<main id="sphinx-myst-preview-content"><section><p>Body content</p></section></main>',
  );
});

test("replacement removes serialized duplicates and nested sections while preserving other HTML", () => {
  const sourceMapping = {
    documentId: "file:///active.md",
    activeSourceFile: "/workspace/active.md",
  };
  const oldMarkup = renderPropertiesTable(resultWith(), true, sourceMapping);
  const prefix = '<!DOCTYPE html><html><head><script nonce="unchanged">const marker = "<section data-okf-properties>";</script></head><body>';
  const body = '<section data-okf-properties-extra="keep"><p>Body &amp; content</p></section>';
  const suffix = '</main></body></html>';
  const html = `${prefix}<main tabindex='-1' id='sphinx-myst-preview-content'>${oldMarkup}<SECTION DATA-OKF-PROPERTIES=''><section>Nested old content</section></SECTION>${body}${suffix}`;

  const replaced = replacePropertiesTableMarkup(html, resultWith(), true, sourceMapping);
  assert.equal(
    replaced,
    `${prefix}<main tabindex='-1' id='sphinx-myst-preview-content'>${oldMarkup}${body}${suffix}`,
  );
  assert.equal(
    replacePropertiesTableMarkup(replaced, resultWith(), false),
    `${prefix}<main tabindex='-1' id='sphinx-myst-preview-content'>${body}${suffix}`,
  );
});

test("schema-matched tables add a third description column", () => {
  const markup = renderPropertiesTable(resultWith({
    orderMode: "schema",
    schemaFound: true,
    fields: [
      fieldWith({
        name: "status",
        value: "active",
        doc: { description: "Lifecycle status of the requirement." },
        enums: ["active", "draft"],
      }),
      fieldWith({
        name: "extra",
        value: "x",
        known: false,
      }),
    ],
  }), true);
  assert.match(markup, /okf-properties okf-properties-docs/u);
  assert.match(markup, /<thead><tr><th scope="col">Name<\/th><th scope="col"><span class="okf-column-heading">Value[^]*?<\/th><th scope="col"><span class="okf-column-heading">Description[^]*?<\/th><\/tr><\/thead>/u);
  assert.match(markup, /<td class="okf-doc">Lifecycle status of the requirement\.<\/td>/u);
  assert.match(markup, /<span class="okf-name-text">status<\/span><span class="okf-type-label">\(text\)<\/span>/u);
  // Unknown fields without a description get an empty doc cell to keep the grid aligned.
  assert.match(markup, /<th scope="row" data-okf-edit-cell="name"><span class="okf-name-cell">[^]*?<span class="okf-name-text">extra<\/span><span class="okf-type-label">\(text\)<\/span><\/span><\/th><td[^>]*><span data-okf-value-display>x<\/span>/u);
});

test("renders empty lists without a phantom preview item", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({
      name: "derives_from",
      value: [],
      valueKind: "list",
      fieldType: "list",
    })],
  }), true);

  assert.match(markup, /<span class="okf-list-display" data-okf-value-display><span class="okf-list-empty">\[\]<\/span><\/span>/u);
  assert.doesNotMatch(markup, /<li>/u);
});

test("marks schema-nullable fields in row metadata", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    orderMode: "schema",
    fields: [fieldWith({
      name: "derives_from",
      value: ["A-1"],
      valueKind: "list",
      fieldType: "list",
      nullable: true,
    })],
  }), true);

  assert.match(markup, /data-okf-field="derives_from"[^>]*data-okf-nullable="true"/u);
});

test("escapes list preview items without truncating short lists", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({
      name: "links",
      value: ["<one>", "two & three", "four"],
      valueKind: "list",
      fieldType: "list",
    })],
  }), true);

  assert.match(markup, /<li>&lt;one&gt;<\/li><li>two &amp; three<\/li><li>four<\/li><\/ul>/u);
  assert.doesNotMatch(markup, /okf-list-more/u);
});

test("plain yaml tables stay two-column even when docs are absent", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: false,
    fields: [
      fieldWith({
        name: "title",
        value: "t",
        doc: { description: "doc without schema" },
      }),
    ],
  }), true);
  assert.match(markup, /<thead><tr><th scope="col">Names<\/th><th scope="col">Values<\/th><\/tr><\/thead>/u);
  assert.doesNotMatch(markup, /okf-properties-docs/u);
  assert.doesNotMatch(markup, /okf-doc/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-006
test("nested object values render as escaped YAML while keeping edit metadata", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({
        name: "metadata",
        value: {
          owner: "platform",
          review: { required: false, attempts: 3 },
          markup: "<script>alert(1)</script>",
        },
        fieldType: "unknown",
        known: false,
      }),
    ],
  }), true);
  const row = markup.match(/<tr\b[^>]*data-okf-field="metadata"[\s\S]*?<\/tr>/u)?.[0];
  assert.ok(row);
  assert.match(row, /data-okf-value-cell data-okf-edit-cell="value"/u);
  assert.match(row, /data-okf-value-yaml="owner: platform/u);
  assert.match(row, /data-okf-editable="true"/u);
  const yamlBlock = row.match(
    /<pre class="okf-value-yaml" data-okf-value-display><code class="language-yaml">([\s\S]*?)<\/code><\/pre>/u,
  );
  assert.ok(yamlBlock, "object values should be displayed as a YAML code block");
  assert.match(yamlBlock[1], /owner: platform[\s\S]*review:\n  required: false\n  attempts: 3/u);
  assert.match(yamlBlock[1], /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.doesNotMatch(yamlBlock[1], /<script\b|\{\s*&quot;owner&quot;/u);
});

test("schema declarations do not appear as description annotations", () => {
  const markup = renderPropertiesTable(resultWith({
    orderMode: "schema",
    schemaFound: true,
    fields: [
      fieldWith({
        name: "derives_from",
        value: ["StRS-CORE-001"],
        valueKind: "list",
        fieldType: "list",
      }),
      fieldWith({
        name: "annotation_exemption",
        value: false,
      }),
    ],
  }), true);
  assert.match(markup, /okf-properties okf-properties-docs/u);
  assert.match(markup, /<td class="okf-doc"><\/td>/u);
  assert.doesNotMatch(markup, /array of string · required|boolean · must be false/u);
});

test("name cells carry a size-bounded Obsidian-style type icon", () => {
  const markup = renderPropertiesTable(resultWith({
    orderMode: "schema",
    schemaFound: true,
    fields: [
      fieldWith({
        name: "status",
        value: "active",
        fieldType: "enum",
        enums: ["active", "draft"],
      }),
      fieldWith({
        name: "flag",
        value: true,
        fieldType: "checkbox",
      }),
      fieldWith({
        name: "other",
        value: "x",
        fieldType: "unknown",
        known: false,
      }),
    ],
  }), true);
  assert.match(markup, /<tr [^>]*data-okf-type="enum"[^>]*>/u);
  assert.match(markup, /<th scope="row" data-okf-edit-cell="name"><span class="okf-name-cell"><span class="okf-type-icon" data-okf-type="enum" title="Options \(enum\)"><svg[^>]*width="16" height="16"/u);
  assert.match(markup, /<th scope="row" data-okf-edit-cell="name"><span class="okf-name-cell"><span class="okf-type-icon" data-okf-type="checkbox" title="Checkbox">/u);
  assert.match(markup, /<th scope="row" data-okf-edit-cell="name"><span class="okf-name-cell"><span class="okf-type-icon" data-okf-type="unknown"[^>]*>.*?<span class="okf-name-text">other<\/span>/su);
  // Value controls remain in their cells; icons stay in the aligned name slot.
  assert.match(markup, /<td class="" data-okf-value-cell data-okf-edit-cell="value"><span data-okf-value-display>active<\/span>/u);
});

test("T22: link suggestions are rendered as an escaped row attribute only when present", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({
        name: "refs",
        value: ["a"],
        valueKind: "list",
        fieldType: "list",
        linkSuggestions: ['A"B', "C<D>&"],
      }),
      fieldWith({ name: "tags", value: ["a"], valueKind: "list", fieldType: "list" }),
    ],
  }), true);
  assert.match(markup, /data-okf-field="refs"[^>]* data-okf-link-suggestions="\[&quot;A\\&quot;B&quot;,&quot;C&lt;D&gt;&amp;&quot;\]"/u);
  assert.equal(markup.match(/data-okf-link-suggestions=/gu)?.length, 1);
});

test("T24: required fields render data-okf-required and optional ones do not", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [
      fieldWith({ name: "scope", value: "core", required: true }),
      fieldWith({ name: "note", value: "x" }),
    ],
  }), true, undefined, true);

  assert.match(markup, /data-okf-field="scope"[^>]*data-okf-required="true"/u);
  assert.equal((markup.match(/data-okf-required/gu) ?? []).length, 1);
});

test("T25: the section flags a schema that forbids additional properties", () => {
  const field = [fieldWith({ name: "scope", value: "core" })];
  const forbidden = renderPropertiesTable(
    resultWith({ fields: field, additionalPropertiesAllowed: false }), true, undefined, true);
  assert.match(forbidden, /<section[^>]*data-okf-additional-properties="false"/u);
  for (const additionalPropertiesAllowed of [true, undefined]) {
    const markup = renderPropertiesTable(
      resultWith({ fields: field, additionalPropertiesAllowed }), true, undefined, true);
    assert.doesNotMatch(markup, /data-okf-additional-properties/u);
  }
});

function linkWith(overrides: Partial<FrontmatterLinkResult>): FrontmatterLinkResult {
  return {
    value: "docs/missing.md",
    fieldPath: "references",
    status: "invalid",
    code: "E10",
    severity: "error",
    message: "target 'docs/missing.md' does not resolve to a file",
    ...overrides,
  } as FrontmatterLinkResult;
}

test("linkStatusLabel maps every diagnostic family to a plain label", () => {
  const cases: Array<[Partial<FrontmatterLinkResult>, string]> = [
    [{ message: "target 'a.md' does not resolve to a file" }, "File not found"],
    [{ message: "filename stem 'a' was not found" }, "File not found"],
    [{ message: "target '../a.md' escapes its project-relative root" }, "Outside the allowed folder"],
    [{ message: "target '../a.md' escapes its navigation root" }, "Outside the allowed folder"],
    [{ message: "filename stem 'a' escapes its filename-stem root" }, "Outside the allowed folder"],
    [{ code: "W15", status: "unavailable", message: "bundle-relative root is unavailable" }, "Link root unavailable"],
    [{ message: "absolute target '/a.md' is not allowed" }, "Absolute paths are not allowed"],
    [{ message: "filename stem 'a' is ambiguous" }, "Several files match"],
    [{ message: "file-link target is empty" }, "Empty link"],
    [{ message: "wikilink value has invalid syntax" }, "Invalid link"],
    [{ code: "W15", status: "unavailable", message: "filename stem 'a' could not be resolved because the workspace may be unavailable" }, "Link unavailable"],
  ];
  for (const [overrides, label] of cases) {
    assert.equal(linkStatusLabel(linkWith(overrides)), label, JSON.stringify(overrides));
  }
});

test("invalid links show an icon and a plain label instead of the error code", () => {
  const markup = renderPropertiesTable(resultWith({
    schemaFound: true,
    summary: { errors: 1, warnings: 0, infos: 0 },
    fields: [fieldWith({
      name: "references",
      value: "docs/missing.md",
      linkResults: [linkWith({})],
    })],
  }), true);
  assert.doesNotMatch(markup, /\[E10\]<\/span>/u);
  assert.doesNotMatch(markup, />\[E10\]</u);
  assert.match(markup, /<span class="okf-link-status" data-okf-link-code="E10"><span aria-hidden="true">✖<\/span> File not found<\/span>/u);
  assert.match(markup, /<span class="okf-frontmatter-link okf-link-invalid" data-okf-link-status="invalid" data-okf-link-code="E10" tabindex="0" title="\[E10\] target 'docs\/missing\.md' does not resolve to a file">/u);
});

test("unavailable links use the warning icon", () => {
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({
      name: "references",
      value: "a",
      linkResults: [linkWith({ status: "unavailable", code: "W15", severity: "warning", message: "bundle-relative root is unavailable" })],
    })],
  }), true);
  assert.match(markup, /<span aria-hidden="true">⚠<\/span> Link root unavailable/u);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
test("the header badge is a button that goes to the first issue", () => {
  const markup = renderPropertiesTable(resultWith({
    summary: { errors: 2, warnings: 1, infos: 0 },
    fields: [fieldWith({})],
  }), true);
  assert.match(markup, /<button type="button" data-okf-badge data-okf-errors="2" data-okf-warnings="1" data-okf-infos="0" aria-label="Go to the first frontmatter issue">✖ 2 ⚠ 1<\/button>/u);
  assert.doesNotMatch(markup, /<span data-okf-badge/u);
});

test("T30: replacing with precomputed markup is identical to replacing from the result", () => {
  const sourceMapping = {
    documentId: "file:///active.md",
    activeSourceFile: "/workspace/active.md",
  };
  const oldMarkup = renderPropertiesTable(resultWith(), true, sourceMapping);
  const html = `<body><main id="sphinx-myst-preview-content">${oldMarkup}<p>Body</p></main></body>`;
  const fresh = resultWith({ fields: [fieldWith({ name: "fresh", value: "yes" })] });
  for (const [result, enabled] of [[fresh, true], [resultWith({ present: false }), true], [fresh, false]] as const) {
    const markup = renderPropertiesTable(result, enabled, sourceMapping);
    assert.equal(
      replacePropertiesTableHtml(html, markup),
      replacePropertiesTableMarkup(html, result, enabled, sourceMapping),
    );
  }
  // Unchanged markup leaves the string untouched, which is how the host detects "nothing changed".
  assert.equal(replacePropertiesTableHtml(html, oldMarkup), html);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-005
test("a long key carries its full name as tooltip, a short key keeps the row tooltip", () => {
  const longName = "a_deliberately_very_long_property_name";
  const markup = renderPropertiesTable(resultWith({
    fields: [fieldWith({ name: longName, value: "x" }), fieldWith({ name: "name", value: "y" })],
  }), true);
  assert.match(markup, new RegExp(`<span class="okf-name-text" title="${longName}">${longName}</span>`, "u"));
  assert.match(markup, /<span class="okf-name-text">name<\/span>/u);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-215
test("CR 155: with source mapping every field row carries the source lines of its field", () => {
  const sourceText = "---\ntitle: Example\ntags:\n  - a\n  - b\nowner: Team\n---\n\n# Body\n";
  const result = analyzeFrontmatter({
    schemaFiles: nodeSchemaFiles,
    sourceText,
    filePath: "/workspace/doc.md",
    strictAdditionalProperties: false,
  });
  const mapping = { documentId: "file:///workspace/doc.md", activeSourceFile: "/workspace/doc.md" };
  const markup = renderPropertiesTable(result, true, mapping);
  const row = (name: string): string => new RegExp(`<tr [^>]*data-okf-field="${name}"[^>]*>`, "u").exec(markup)?.[0] ?? "";
  assert.match(row("title"), /data-okf-line="2" data-okf-end-line="2"/u);
  assert.match(row("tags"), /data-okf-line="3" data-okf-end-line="5"/u);
  assert.match(row("owner"), /data-okf-line="6" data-okf-end-line="6"/u);
  assert.doesNotMatch(renderPropertiesTable(result, true), /data-okf-line/u);
});
