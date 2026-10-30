---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-174
uuid: 022b69b2-30be-4b20-b63d-19621e93a854
title: The host drops a request that does not name the render it holds
description: When a list, pick or paste message reaches the host, the extension
  SHALL handle it only when it names the document, the revision and the request
  of the render that the host holds.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The host drops a request that does not name the render it holds

### Normative behavior

When a list, pick or paste message reaches the host, the extension SHALL handle it only when it names the document, the revision and the request of the render that the host holds.

### Scenario: Current render

- GIVEN a message that names the render the host holds
- WHEN it reaches the host
- THEN its handler runs

### Scenario: Other render

- GIVEN a message that names another revision or request
- WHEN it reaches the host
- THEN it is dropped and no answer is posted

### Verification notes

- Method: untested for these six messages; the gate table is PAGE_MESSAGE_GATES in src/session/pageMessages.ts, where all six use the render gate
- Criteria: The six types previewListTargets, previewListCitations, previewPickDocument, previewPickImage, previewPasteImage and previewPasteHtml map to the render gate.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
<!-- okf:links:end -->
