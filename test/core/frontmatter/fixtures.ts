/**
 * Synthetic OKF fixture: a base schema plus a typed profile schema using
 * allOf + relative $ref, mirroring the okf-schema bundle conventions without
 * copying any real bundle content.
 */

export const BASE_SCHEMA_YAML = `$schema: https://json-schema.org/draft/2020-12/schema
\$id: base.schema.yaml
title: Synthetic base profile
description: Fields shared by every synthetic OKF document.
type: object
properties:
  type:
    type: string
    title: Document type
    description: The OKF document type, e.g. "finding" or "concept".
  id:
    type: string
    title: Identifier
    description: Human-readable unique identifier.
  uuid:
    type: string
    format: uuid
    title: UUID
    description: Stable universally unique identifier.
  title:
    type: string
    title: Title
    description: Short human-facing title.
  lifecycle:
    enum:
      - draft
      - active
      - retired
required:
  - type
  - id
  - uuid
  - title
additionalProperties: true
`;

export const FINDING_SCHEMA_YAML = `$schema: https://json-schema.org/draft/2020-12/schema
\$id: finding.schema.yaml
title: Synthetic finding profile
description: A synthetic OKF Finding document.
allOf:
  - \$ref: base.schema.yaml
  - type: object
    properties:
      type:
        const: finding
      tier:
        const: core
      verified:
        type: boolean
        title: Verified
        description: Whether the finding has been independently verified.
    required:
      - type
      - tier
      - verified
`;

export const CONCEPT_SCHEMA_JSON = JSON.stringify(
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "concept.schema.json",
    title: "Synthetic concept profile",
    description: "A synthetic OKF Concept document in JSON format.",
    type: "object",
    properties: {
      type: { const: "concept" },
      summary: { type: "string", title: "Summary", description: "One-paragraph summary." },
    },
    required: ["type", "summary"],
    additionalProperties: true,
  },
  null,
  2,
);

/** Minimal JSON5 fixture with comments, exercising the comment stripper. */
export const PLAYBOOK_SCHEMA_JSON5 = `{
  // Synthetic playbook schema in JSON5
  \$schema: "https://json-schema.org/draft/2020-12/schema",
  \$id: "playbook.schema.json5",
  title: "Synthetic playbook profile",
  type: "object",
  properties: {
    /* block comment */
    type: { const: "playbook" },
    steps: { type: "integer", title: "Steps", description: "Number of steps." },
  },
  required: ["type"],
  additionalProperties: true,
}
`;

export interface FixtureFile {
  path: string;
  content: string;
}

export function buildSyntheticBundle(): FixtureFile[] {
  return [
    { path: "index.md", content: "---\ntitle: Synthetic KB\n---\n\nBody.\n" },
    { path: "log.md", content: "# Log\n" },
    { path: "_schema/base.schema.yaml", content: BASE_SCHEMA_YAML },
    { path: "_schema/finding.schema.yaml", content: FINDING_SCHEMA_YAML },
    { path: "_schema/concept.schema.json", content: CONCEPT_SCHEMA_JSON },
    { path: "_schema/playbook.schema.json5", content: PLAYBOOK_SCHEMA_JSON5 },
    {
      path: "findings/F-SYN-001.md",
      content: [
        "---",
        "type: finding",
        "id: F-SYN-001",
        "uuid: 00000000-0000-4000-8000-000000000001",
        "title: Synthetic finding",
        "lifecycle: draft",
        "tier: core",
        "verified: true",
        "tags: [experiment, synthetic]",
        "---",
        "",
        "## Observation",
        "",
        "A synthetic observation body.",
        "",
      ].join("\n"),
    },
    {
      path: "findings/F-SYN-002-invalid.md",
      content: [
        "---",
        "type: finding",
        "uuid: not-a-uuid",
        "lifecycle: frozen",
        "tier: rim",
        "verified: maybe",
        "---",
        "",
        "Invalid body content.",
        "",
      ].join("\n"),
    },
  ];
}
