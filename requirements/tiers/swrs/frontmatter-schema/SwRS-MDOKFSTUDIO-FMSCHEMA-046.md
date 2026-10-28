---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-046
uuid: d5e547c4-7310-4b3c-8abe-8998742951d6
title: x-okf-link annotations declare link fields and their syntax
description: When a schema annotates a property with `x-okf-link`, the extension
  SHALL find the annotation on top-level and nested properties, array items and
  prefixItems, patternProperties, additionalProperties, local `$ref`s, every
  allOf branch, the matching anyOf branches, the single matching oneOf branch
  and the selected if/then/else branch, mark the field with an E10 error when
  the annotation or a link value is invalid, and resolve a link target apart
  from its `?query` and `#fragment`.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/fileLinkAnnotations.ts
tested_in_files:
- test/core/frontmatter/fileLinks.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-047
- SwRS-MDOKFSTUDIO-FMSCHEMA-048
- SwRS-MDOKFSTUDIO-FMSCHEMA-049
---

## x-okf-link annotations declare link fields and their syntax

### Normative behavior

When a schema annotates a property with `x-okf-link`, the extension SHALL find the annotation on top-level and nested properties, array items and prefixItems, patternProperties, additionalProperties, local `$ref`s, every allOf branch, the matching anyOf branches, the single matching oneOf branch and the selected if/then/else branch, mark the field with an E10 error when the annotation or a link value is invalid, and resolve a link target apart from its `?query` and `#fragment`.

### Scenario (nominal): Array items

- GIVEN a schema whose list property has items annotated with x-okf-link and a document listing two targets
- WHEN the document is analysed
- THEN two link results are produced for the field, one per item, with their array indexes

### Scenario (nominal): Annotation positions

| Input | Outcome |
| --- | --- |
| a mapping field whose patternProperties entry ^k is annotated and a value with keys k1 and z | only k1 gets a link result |
| a mapping field whose additionalProperties schema is annotated and a value with the key k1 | k1 gets a link result |
| a list field whose first prefixItems entry is annotated and a value with two targets | the first item gets a link result |
| a property whose schema is `$ref: "#/$defs/lk"` and lk carries the annotation | the property gets a link result |
| a property annotated through an allOf branch, and one through the anyOf branch that matches its value | both properties get a link result |
| an anyOf branch that does not match its value | it contributes none |
| a then branch annotating a, a document where the if condition holds, then one where it does not | a gets a link result only in the first document |

### Scenario (boundary): oneOf with two matching branches

- GIVEN a schema whose oneOf has two branches that both match the value and carry annotations
- WHEN the document is analysed
- THEN no annotation of that oneOf is collected

### Scenario (refusal): Invalid annotation

| Input | Outcome |
| --- | --- |
| an annotation with resolution nonsense | the field row carries the error [E10] x-okf-link resolution is invalid at 'ref' and counts in the badge |
| an annotation with a resolution and no syntax | the field row carries [E10] x-okf-link syntax is invalid at 'a' |
| an annotation that is not an object, a non-string marker, display field lists that are not lists of names, or a non-boolean show_line_number | the field is marked with an error "[E10] x-okf-link ... at '{field}'" |

### Scenario (boundary): Accepted annotation values

- GIVEN annotations using each of document-relative, bundle-relative, bundle-relative-stem, project-relative and filename-stem with syntax plain or wikilink
- WHEN the document is analysed
- THEN none of them is reported as invalid

### Scenario (refusal): Invalid link value

| Input | Outcome |
| --- | --- |
| an annotation with syntax wikilink and the value t.md without brackets | the field carries [E10] wikilink value has invalid syntax at 'ref' |
| an empty string value | the message reads file-link target is empty |
| a number value | the message reads file-link value must be a string |

### Scenario (nominal): Query and fragment

| Input | Outcome |
| --- | --- |
| a document-relative link value t.md#h next to an existing t.md | the link is valid and keeps the fragment h |
| a link value t.md?x=1#h | the link is valid with the query x=1 and the fragment h |

### Verification notes

- Method: test/core/frontmatter/fileLinks.test.ts (array items, oneOf with two matching branches, invalid annotation, accepted annotation values; the other annotation positions were probed against the inspection and have no test).
- Method: test/core/frontmatter/okfFrontmatter.test.ts (invalid link value, query and fragment; both partial: wikilink parsing has no dedicated assertion).
- Criteria: Duplicate links (same field, index, resolution, syntax and target) are reported once; nested results attach to their top-level field row. A field list entry must be a non-empty string; show_line_number must be a boolean. A non-string value also gets the validator's own type error when the schema declares string. The fragment is cut first, then the query; the target is trimmed.
