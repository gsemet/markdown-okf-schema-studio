---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-006
uuid: 9254b21e-ff7b-4d61-abe6-332c662824f6
title: A writer reads PlantUML diagrams without any setup
description: When a writer previews a document with a PlantUML fence or
  directive, the Studio SHALL draw it with the bundled engine, in the preview
  colours, without Java or network, and show a message that names the cause and
  the JAR option and keep the source readable when the bundled engine cannot
  draw it.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I get PlantUML pictures right after installing the
  extension, also in Restricted Mode, and learn why a diagram has no picture and
  what to change instead of seeing a blank block.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-001
- SwRS-MDOKFSTUDIO-DIAG-019
- SwRS-MDOKFSTUDIO-DIAG-020
- SwRS-MDOKFSTUDIO-DIAG-022
- SwRS-MDOKFSTUDIO-DIAG-023
- SwRS-MDOKFSTUDIO-DIAG-024
- SwRS-MDOKFSTUDIO-DIAG-026
- SwRS-MDOKFSTUDIO-DIAG-028
- SwRS-MDOKFSTUDIO-DIAG-029
- SwRS-MDOKFSTUDIO-DIAG-030
- SwRS-MDOKFSTUDIO-DIAG-031
- SwRS-MDOKFSTUDIO-DIAG-032
- SwRS-MDOKFSTUDIO-DIAG-033
- SwRS-MDOKFSTUDIO-DIAG-034
- SwRS-MDOKFSTUDIO-DIAG-035
- SwRS-MDOKFSTUDIO-DIAG-036
- SwRS-MDOKFSTUDIO-DIAG-037
- SwRS-MDOKFSTUDIO-DIAG-038
- SwRS-MDOKFSTUDIO-DIAG-039
- SwRS-MDOKFSTUDIO-DIAG-040
- SwRS-MDOKFSTUDIO-DIAG-041
- SwRS-MDOKFSTUDIO-DIAG-042
- SwRS-MDOKFSTUDIO-DIAG-043
- SwRS-MDOKFSTUDIO-DIAG-044
- SwRS-MDOKFSTUDIO-DIAG-045
- SwRS-MDOKFSTUDIO-DIAG-053
- SwRS-MDOKFSTUDIO-DIAG-079
- SwRS-MDOKFSTUDIO-DIAG-080
- SwRS-MDOKFSTUDIO-DIAG-081
- SwRS-MDOKFSTUDIO-DIAG-082
- SwRS-MDOKFSTUDIO-DIAG-083
- SwRS-MDOKFSTUDIO-DIAG-112
- SwRS-MDOKFSTUDIO-DIAG-115
- SwRS-MDOKFSTUDIO-DIAG-119
- SwRS-MDOKFSTUDIO-REVIEW-017
- SwRS-MDOKFSTUDIO-REVIEW-038
- SwRS-MDOKFSTUDIO-TRUST-074
- SwRS-MDOKFSTUDIO-TRUST-075
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-DIAG-008
- StRS-MDOKFSTUDIO-DIAG-010
---

## A writer reads PlantUML diagrams without any setup

### Normative behavior

When a writer previews a document with a PlantUML fence or directive, the Studio SHALL draw it with the bundled engine, in the preview colours, without Java or network, and show a message that names the cause and the JAR option and keep the source readable when the bundled engine cannot draw it.

### Preserved stakeholder intent

Writers expect PlantUML to work from the first preview, without Java, Graphviz, a JAR, a process or network access. They expect unchanged diagrams not to be redrawn when they edit nearby text or flip the theme, and a failed or unsupported diagram to say why and how to proceed, never to disappear.

### Rationale and constraints

- Reading: `plantuml` fences and `{plantuml}` or `{uml}` directives with a body produce a diagram labelled "PlantUML diagram", with the source in a collapsed "Diagram source" disclosure. The `@startuml` wrapper is the writer's; the extension adds none.
- The default engine is bundled and runs in the preview page: it starts no process, reads no executable or JAR, sends nothing over the network, and works in Restricted Mode. Its script is loaded only when the page has a PlantUML diagram and runs under the unchanged Content Security Policy.
- Pictures use light text on a dark preview and dark text on a light one, decided from the page background; a switch between light and dark draws every diagram again. The picture is inert and is centred and contained in the content width.
- The bundled `!theme` library and the OpenIconic `<&icon>` sprites work offline. Known issue: class-like diagrams use PlantUML's own Smetana layout instead of Graphviz, so some layouts differ from the JAR output.
- The engine ships pinned to an exact version of `@plantuml/core` (versions before 1.2026.6 are GPL) and its licence is packaged with it. An engine upgrade can change drawing output.
- Typing: bundled-engine pictures are kept by source, include base and light/dark variant (64 most recent); results with a refused include, or with an unsupported directive in an included file, are not kept and are asked again next time. Known issue: a plain engine failure (for example a syntax error) is kept until the source or the variant changes. The engine draws one diagram at a time, and a render superseded by a newer one of the same element does not overwrite it.
- After a content patch only the diagrams without a render state are drawn. Known issue: the page-side event wiring and the 64-entry eviction have no unit test; only the visual campaign covers them.
- Failure: a diagram using `!includeurl`, `!include https://...`, a `!include` of a standard-library name in angle brackets, `!includedef`, `!import` or `!theme ... from` shows one message naming the directive and its line, and the JAR option hint. The engine does not run. The directive is matched at line start only; one placed after text on a line falls under the generic failure message.
- The engine's loaders refuse standard-library bundles, optional scripts such as emoji, a `!theme` read from a folder, any local file when no host is connected, and a URL or library directive inside an included file; nothing is fetched. An emoji refusal appears as the generic failure message.
- When the engine fails (syntax error or exception) the diagram reads "The built-in PlantUML engine could not render this diagram: followed by the reason", the reason as plain text without a Java-style class prefix, with the JAR option hint, no picture, and the source kept. Known issue: no diagnostic reaches the status line; only the picture area shows the message.
- A source longer than 1 MiB is refused before the engine runs with "The PlantUML source exceeds the 1 MiB preview limit."
- Known issue: a diagram with empty source is skipped and left blank.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-DIAG-001](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-001.md): Mermaid fences become inert diagram pictures
  - [SwRS-MDOKFSTUDIO-DIAG-019](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-019.md): Comment quotes are never wrapped inside diagrams
  - [SwRS-MDOKFSTUDIO-DIAG-020](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-020.md): Selecting text inside a diagram offers no comment
  - [SwRS-MDOKFSTUDIO-DIAG-022](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-022.md): A diagram under edit is hidden
  - [SwRS-MDOKFSTUDIO-DIAG-023](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-023.md): PlantUML fences become centred inert pictures drawn by the built-in engine
  - [SwRS-MDOKFSTUDIO-DIAG-024](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-024.md): The useJar and jarPath settings choose the PlantUML engine
  - [SwRS-MDOKFSTUDIO-DIAG-026](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-026.md): The built-in engine starts no process
  - [SwRS-MDOKFSTUDIO-DIAG-028](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-028.md): The built-in PlantUML script loads only when needed
  - [SwRS-MDOKFSTUDIO-DIAG-029](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-029.md): Built-in PlantUML diagrams are drawn as inert pictures
  - [SwRS-MDOKFSTUDIO-DIAG-030](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-030.md): Built-in diagrams follow the light or dark preview
  - [SwRS-MDOKFSTUDIO-DIAG-031](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-031.md): The built-in engine needs nothing outside the extension
  - [SwRS-MDOKFSTUDIO-DIAG-032](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-032.md): The built-in engine refuses what needs a URL, a library or more than 1 MiB
  - [SwRS-MDOKFSTUDIO-DIAG-033](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-033.md): The library loaders of the built-in engine refuse every request
  - [SwRS-MDOKFSTUDIO-DIAG-034](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-034.md): The file loader refuses local files without a render or a host
  - [SwRS-MDOKFSTUDIO-DIAG-035](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-035.md): A theme read from a folder is refused
  - [SwRS-MDOKFSTUDIO-DIAG-036](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-036.md): Unsupported directives inside included files name the file
  - [SwRS-MDOKFSTUDIO-DIAG-037](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-037.md): A built-in engine failure shows its reason
  - [SwRS-MDOKFSTUDIO-DIAG-038](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-038.md): The built-in engine refuses a source over 1 MiB
  - [SwRS-MDOKFSTUDIO-DIAG-039](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-039.md): Built-in pictures are kept by source and drawn one at a time
  - [SwRS-MDOKFSTUDIO-DIAG-040](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-040.md): The built-in result cache keeps 64 results
  - [SwRS-MDOKFSTUDIO-DIAG-041](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-041.md): Results with refused includes are not kept
  - [SwRS-MDOKFSTUDIO-DIAG-042](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-042.md): The built-in engine draws one diagram at a time
  - [SwRS-MDOKFSTUDIO-DIAG-043](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-043.md): A superseded built-in render does not overwrite a newer one
  - [SwRS-MDOKFSTUDIO-DIAG-044](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-044.md): A content patch draws only new built-in diagrams
  - [SwRS-MDOKFSTUDIO-DIAG-045](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-045.md): A changed included file redraws the diagrams that read files
  - [SwRS-MDOKFSTUDIO-DIAG-053](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-053.md): Served include files are watched and redraw their diagrams
  - [SwRS-MDOKFSTUDIO-DIAG-079](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-079.md): The built-in engine is pinned to an exact version
  - [SwRS-MDOKFSTUDIO-DIAG-080](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-080.md): The built-in engine bundle and licence are packaged
  - [SwRS-MDOKFSTUDIO-DIAG-081](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-081.md): PlantUML pictures are contained in the content width
  - [SwRS-MDOKFSTUDIO-DIAG-082](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-082.md): PlantUML messages use the error style
  - [SwRS-MDOKFSTUDIO-DIAG-083](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-083.md): The PlantUML source disclosure is styled like Mermaid's
  - [SwRS-MDOKFSTUDIO-DIAG-112](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-112.md): Unsupported directives never reach the engine or the host
  - [SwRS-MDOKFSTUDIO-DIAG-115](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-115.md): A theme switch between light and dark redraws built-in diagrams
  - [SwRS-MDOKFSTUDIO-DIAG-119](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-119.md): PlantUML pictures are centred
  - [SwRS-MDOKFSTUDIO-REVIEW-017](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-017.md): The quote of a thread is highlighted once in its block
  - [SwRS-MDOKFSTUDIO-REVIEW-038](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-038.md): Selected body text offers a Comment button and a keyboard shortcut
  - [SwRS-MDOKFSTUDIO-TRUST-074](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-074.md): The package ships its icon and its bundle
  - [SwRS-MDOKFSTUDIO-TRUST-075](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-075.md): The extension is built from pinned, official dependencies
- Supersedes:
  - [StRS-MDOKFSTUDIO-DIAG-008](StRS-MDOKFSTUDIO-DIAG-008.md): Understand why a bundled PlantUML diagram is not drawn
  - [StRS-MDOKFSTUDIO-DIAG-010](StRS-MDOKFSTUDIO-DIAG-010.md): Keep PlantUML pictures in place while typing
<!-- okf:links:end -->
