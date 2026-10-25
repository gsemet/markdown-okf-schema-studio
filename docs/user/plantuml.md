# PlantUML Diagrams

`plantuml` fences and `{plantuml}` directives are drawn by the PlantUML engine bundled with the
extension (the official JavaScript build, `@plantuml/core`). It needs no Java, starts no process
and sends nothing over the network, so it also works in Restricted Mode. The diagrams follow the
preview theme (light or dark), and the bundled `!theme` library and OpenIconic `<&icon>` sprites
are available. Layouts use PlantUML's own Smetana engine instead of Graphviz, so class or
component diagrams can be placed slightly differently than with the JAR.

A diagram can be written in the document or kept in its own file:

````markdown
```plantuml
@startuml
!include styles/common.puml
Alice -> Bob: hello
@enduml
```

```{uml} diagrams/flow.puml
```
````

`{uml} path.puml` is the sphinxcontrib-plantuml directive; `{plantuml} path.puml` without a body
does the same. Directive options such as `:caption:` are accepted but not shown. The extension reads
the file with the rules of `{include}`: a path relative to the document, inside the workspace (only
the document's folder and below in Restricted Mode), at most 5 MiB. A missing file or a path
outside those folders shows a message instead of the diagram.

Local `!include`, `!include_many`, `!include_once` and `!includesub` files are read the same way.
A top-level include is relative to the document (or to the `.puml` file of a `{uml}` diagram), a
nested include to the file that contains it. A diagram reads at most 64 files, 8 levels deep,
1 MiB of text in all, and an include cycle stops with a message. The preview draws a diagram again
when one of its files changes on disk.

The built-in engine loads no URL and no library: a diagram with a URL include (`!includeurl`,
`!include https://...`), the standard library (`!include <C4/C4_Context>`), `!includedef`,
`!import`, `!theme ... from` or emoji shows a message instead of a picture. For those, tick
`markdownOkfSchemaStudio.plantuml.useJar`: the preview then runs Java with `plantuml.jarPath`, or
the `plantuml` command from PATH when the path is empty, as before. The JAR runs only in a trusted
workspace, and it resolves `!include` lines itself.

If you already set `plantuml.jarPath`, the preview now uses the built-in engine until you tick
`plantuml.useJar`; your path is kept and used again as soon as you do.
