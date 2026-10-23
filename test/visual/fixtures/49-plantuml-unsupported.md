# PlantUML standard library in the built-in engine

The built-in engine loads no URL and no standard library, so this diagram needs the PlantUML JAR.

```plantuml
@startuml
!include <C4/C4_Context>
Person(user, "User")
@enduml
```

The text after the diagram continues normally.
