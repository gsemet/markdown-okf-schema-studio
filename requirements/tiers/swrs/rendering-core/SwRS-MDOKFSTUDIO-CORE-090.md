---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-090
uuid: de29db5d-bee7-43ee-9f3a-b89845ccebc2
title: The requirements lint parses every use case diagram
description: When a maintainer runs the requirements lint, it SHALL parse the
  Mermaid fence of the Use case diagram section of every StRS with the project's
  Mermaid, using the same section and fence as the site, and SHALL fail naming
  the file, the line, the StRS id and Mermaid's message for each fence that does
  not parse.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- scripts/check-use-case-diagrams.mjs
tested_in_files:
- test/build/checkUseCaseDiagrams.test.ts
default_owner_email: gaetan@xeberon.net
---

## The requirements lint parses every use case diagram

### Normative behavior

When a maintainer runs the requirements lint, it SHALL parse the Mermaid fence of the Use case diagram section of every StRS with the project's Mermaid, using the same section and fence as the site, and SHALL fail naming the file, the line, the StRS id and Mermaid's message for each fence that does not parse.

### Scenario (nominal): Every diagram parses

- GIVEN a requirements bundle whose StRS use case diagrams all parse with the project's Mermaid
- WHEN the maintainer runs the requirements lint
- THEN the lint passes and prints `use case diagrams: <n> StRS checked, all parse (Mermaid <version>)`, where `<n>` counts the StRS that have a diagram

### Scenario (boundary): No diagram

- GIVEN a StRS with no `### Use case diagram` section, a section with no Mermaid fence, or an empty fence
- WHEN the maintainer runs the requirements lint
- THEN that StRS is not counted and no error is reported for it

### Scenario (refusal): A fence that does not parse

- GIVEN one or more StRS whose Mermaid fence does not parse, for example a `sequenceDiagram` with a participant `Box` used in a message, or a `stateDiagram-v2` with a state named `state`
- WHEN the maintainer runs the requirements lint
- THEN each is reported as `<path>:<line>: <StRS id>: the use case diagram does not parse` followed by Mermaid's message, and the lint fails (exit 1)

### Verification notes

- Method: Unit tests in test/build/checkUseCaseDiagrams.test.ts (reserved id in a sequence diagram, state diagram, every failure reported, boundaries, the shipped bundle, the guideline's word list).
- Criteria: Each broken fence is reported with its file line, StRS id and Mermaid's message and the exit code is 1; the shipped bundle passes with the same diagram count as the site's extraction.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
