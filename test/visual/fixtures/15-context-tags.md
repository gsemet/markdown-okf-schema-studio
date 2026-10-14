# Context tags

The first wrapper matches the original screenshot shape:
its YAML fence starts immediately after the opening tag.

<fullcycle-model-allocation>
```yaml
models:
  planner: gpt-5.6
  reviewer: gpt-5.6
```
</fullcycle-model-allocation>

<context>

The allocation body remains **Markdown** and includes a [documentation link](https://example.com).

<model_allocation>

- planning uses the selected model
- review stays visible at narrow widths

</model_allocation>

</context>

The paragraph after the wrappers remains outside the panels.
