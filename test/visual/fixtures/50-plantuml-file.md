# PlantUML diagram files

The `{uml}` directive names a diagram file, like sphinxcontrib-plantuml. The extension reads it
under the same rules as `{include}`.

```{uml} plantuml/sequence.puml
```

A `{plantuml}` directive without a body names a file too.

```{plantuml} plantuml/classes.puml
```

The text after the diagrams continues normally.
