# PlantUML executable failure

This diagram uses a deliberately missing executable. The preview should show an actionable
settings message instead of failing the screenshot campaign, while keeping the source available.

```plantuml
@startuml
Alice -> Bob: executable not found
Bob --> Alice: set the JAR path in settings
@enduml
```
