---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-077
uuid: e53af79d-46ac-4d48-835e-1daf55ef496c
title: "A click or Enter on a link is routed to the host and opened or refused with
  a warning"
description: "When the reader clicks, middle-clicks or presses Enter or Space on a
  link that carries a navigation request, the extension SHALL cancel the default action,
  post previewLink with that request and have the host open the target or show a warning
  with the reason when it cannot; the host follows nothing when the message carries
  no request and refuses a malformed frontmatter link request with the reason The
  frontmatter link request is invalid."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/linkEditing.ts
- src/page/modules/linkNavigation.ts
- src/session/features/links.ts
tested_in_files:
- test/integration/previewHistory.test.ts
- test/integration/realInput/linkEditMode.ts
- test/page/linkEditModeClick.test.ts
- test/page/modules/linkNavigation.test.ts
- test/page/modules/toolbarReq.requirements.test.ts
- test/session/diagReq.links.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-083
- SwRS-MDOKFSTUDIO-TOOLBAR-113
---

## A click or Enter on a link is routed to the host and opened or refused with a warning

### Normative behavior

When the reader clicks, middle-clicks or presses Enter or Space on a link that carries a navigation request, the extension SHALL cancel the default action, post previewLink with that request and have the host open the target or show a warning with the reason when it cannot; the host follows nothing when the message carries no request and refuses a malformed frontmatter link request with the reason The frontmatter link request is invalid.

### Scenario (nominal): Click, middle click and keys are posted

| Given | When | Then |
| --- | --- | --- |
| a local link and a wiki link that the host has not been asked about yet | each is clicked, then the first is middle-clicked | each click posts previewLink with the link's request and the default action is cancelled |
| a focused link | Enter is pressed | previewLink is posted |
| a focused link | Space is pressed | previewLink is posted |

### Scenario (boundary): Edit mode keeps a plain click for editing

| Given, edit mode on | When | Then |
| --- | --- | --- |
| a link inside a mapped block | it is clicked, or Enter or Space is pressed on it, with no Cmd or Ctrl key | no previewLink is posted; the editor of the block opens (SwRS-MDOKFSTUDIO-BLOCK-014) |
| the same link | it is clicked with Cmd or Ctrl held, Cmd/Ctrl+Enter is pressed on it, or it is middle-clicked | previewLink is posted |
| a link value of the properties table, in a comment thread or a label anchor | it is clicked | it keeps its own behaviour, as in reading mode |

### Scenario (refusal): Other buttons and keys are not posted

| Given | When | Then |
| --- | --- | --- |
| an auxclick with button 2 | the event arrives | nothing is posted and the default action stays |
| a focused link | the letter a is pressed | nothing is posted |

### Scenario (nominal): The host opens the target

| Link followed | Outcome |
| --- | --- |
| second.md#target | second.md opens in the text editor with the lines of the heading selected |
| second.md#missing | second.md opens with no selection |
| a normal Markdown file | it opens and no warning is shown |
| https://example.invalid/page (http, https or mailto) | the system opener is called once with the URL and the preview and the history are unchanged |

### Scenario (refusal): The host refuses with a warning

| Link followed | Outcome |
| --- | --- |
| javascript:alert(1) | the warning "Markdown OKF-Schema Studio could not follow the link: {reason}" is shown with the scheme reason, the system opener is not called and the history is unchanged |
| a valid Markdown link | no such warning is shown |
| a link to a file that cannot be opened as a text document | the warning "Markdown OKF-Schema Studio could not open {path}: {reason}" is shown with the path and the reason |
| a link whose resolution raises an error | the warning "Preview link resolution failed: {error}" is shown and nothing is recorded |
| a resolvable link | no resolution warning is shown |

### Scenario (nominal): With a request

- GIVEN a previewLink message with a request
- WHEN the host receives it
- THEN the link is followed

### Scenario (refusal): No request

- GIVEN a previewLink message with no request field
- WHEN the host receives it
- THEN only the page's scroll state is recorded, no link is resolved and nothing opens

### Scenario (refusal): Malformed frontmatter link request

- GIVEN a navigation request okf-link: followed by text that is not valid JSON
- WHEN the request is handled
- THEN the reason reads The frontmatter link request is invalid. and nothing opens

### Scenario (nominal): Well-formed frontmatter link request

- GIVEN a request whose JSON names an existing link
- WHEN the request is handled
- THEN the link is followed

### Scenario (refusal): Request that is not a string

- GIVEN a previewLink message whose request is not a string
- WHEN the validator runs
- THEN the message is refused (see SwRS-MDOKFSTUDIO-TRUST-052)

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-090: how the request is classified before the host acts on it.
- SwRS-MDOKFSTUDIO-TOOLBAR-117: an anchor is scrolled in the page instead of opened.
- SwRS-MDOKFSTUDIO-TOOLBAR-085: the tooltip that reports a blocked target before the click.

### Verification notes

- Method: test/page/modules/linkNavigation.test.ts (local and wiki clicks are host-routed even before discovery, including middle click; the auxclick button 2 refusal is checked too).
- Method: test/page/modules/toolbarReq.requirements.test.ts (Enter or Space on a link is routed to the host and another key is not).
- Method: test/integration/previewHistory.test.ts (link to second.md#target opens the second document; external link with a stubbed openExternal, one call, history unchanged; javascript:alert(1) leaves the history unchanged, the warning text is not asserted; the second.md#missing case has no test).
- Method: test/page/linkEditModeClick.test.ts (edit mode scenario: a plain click, Enter or Space posts no previewLink; Cmd and Ctrl click, Cmd and Ctrl+Enter and a middle click post one; a click on a link while another editor is open posts none).
- Method: test/session/toolbarReq.requirements.test.ts (a file that cannot be opened shows a warning with the path and the reason; a link whose resolution fails shows a warning and records nothing).
- Criteria: one previewLink per accepted event, none for an event that linkActivationEdits (src/page/features/linkEditing.ts) gives to the page input in edit mode; auxclick counts only for button 1; keys Enter and the space character post one request; showDocument gets the target id and the selection range, if any; openExternal is called once with the URL; showWarning is called once with the reason, or with the path and the error message.
- Method: test/session/toolbarReq.requirements.test.ts (with and without a request: a link message without a request records the page state and follows nothing)
- Method: test/session/diagReq.links.requirements.test.ts (malformed and well-formed frontmatter link request: a malformed frontmatter link request is refused with its own reason)
- Method: the request that is not a string is checked with the shared optional fields (see SwRS-MDOKFSTUDIO-TRUST-052)
- Criteria: The handler returns without work when request is falsy. The reason is shown in the same warning as other refusals.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-083](../frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-083.md): A malformed frontmatter link request is refused
  - [SwRS-MDOKFSTUDIO-TOOLBAR-113](SwRS-MDOKFSTUDIO-TOOLBAR-113.md): A link message needs a request, else it is ignored or refused
<!-- okf:links:end -->
