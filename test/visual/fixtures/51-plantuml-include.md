# PlantUML local include

The built-in engine asks the editor for local `!include` files. The included file includes
another one, next to itself.

```plantuml
@startuml
!include plantuml/styles/common.puml
Alice -> Carol: participants from an included file
@enduml
```

The text after the diagram continues normally.
