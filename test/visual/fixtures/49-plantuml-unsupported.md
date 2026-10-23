# PlantUML include in the built-in engine

The built-in engine reads no file, so this diagram needs the PlantUML JAR.

```plantuml
@startuml
!include styles/common.puml
Alice -> Bob: styled by an included file
@enduml
```

The text after the diagram continues normally.
