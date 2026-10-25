# Open Knowledge Format

[Open Knowledge Format
(OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
is an open standard for knowledge documents: readable Markdown content plus structured YAML
frontmatter. [OKF-Schema](https://github.com/gsemet/okf-schema) extends that model with JSON Schema
validation, so a bundle can define which frontmatter fields exist, which values are valid, and which
fields are required.

Studio makes that metadata comfortable to use. It turns frontmatter into a properties table, shows
schema descriptions and diagnostics beside each field, and lets you edit typed values without
manually navigating raw YAML. The Markdown body remains a live, editable MyST preview.

## Linked-File Annotations

OKF-Schema supports `x-okf-link` annotations in the JSON Schema that allows Studio to display
metadata from the resolved target file:

```yaml
x-okf-link:
  resolution: filename-stem
  syntax: plain
  tooltip_shows_fields: [description]
  preview_shows_fields: [description]
```

`tooltip_shows_fields` adds named frontmatter fields to a link's hover tooltip.
`preview_shows_fields` displays their values beside the link. Missing fields are omitted; string,
number, and boolean fields are supported.

<!-- TODO: add frontmatter example here -->

For source and test evidence, enable the first matching marker's one-based line number:

```yaml
x-okf-link:
  resolution: project-relative
  syntax: plain
  basename_marker: '@implements_req'
  id_marker: id
  show_line_number: true
```

Use `@tests_req` for test evidence. `id_marker` selects the current document's identity field;
without it, marker matching uses the current document's filename stem.
