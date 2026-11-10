# More examples for Studio

Each block is a complete document; all of them are rendered by Studio's test.

A plan that asks the reader to decide: each choice is a radio group, the recommended option
preselected, and the reader's click moves the `x` in the file:

````markdown
# Plan: faster preview start

The preview takes two seconds to open on large files.

Approach:

- (x) Render the visible blocks first, the rest in the background
- ( ) Cache the rendered page between sessions
- ( ) Leave as is

Rollout:

- ( ) Behind a setting first
- (x) On by default in the next release

## Tasks

- [ ] Measure the start time on the three largest files
- [ ] Implement the chosen approach
````

Alerts, admonitions, a folding admonition and a version note:

````markdown
> [!WARNING]
> The migration is not reversible.

:::{tip} Rollout order
Ship the reader first, then the writer.
:::

:::{note} Assumptions
:class: dropdown
The pilot team has five people.
:::

:::{versionadded} 0.47
Adds the export command.
:::
````

Front matter, table of contents, label and reference, math, list table:

````markdown
---
title: Export plan
status: draft
---

# Export plan

[TOC]

(cost)=
## Cost

The cost is $c = n \cdot t$ (see {ref}`cost`), with

$$
t = \sum_{i=1}^{n} t_i
$$

```{list-table} Phases
:header-rows: 1

* - Phase
  - Effort
* - Parser
  - 3 d
* - Renderer
  - 5 d
```

- [x] Parser done
- [ ] Renderer started
````

A PlantUML sequence and a PlantUML diagram kept in its own file (`diagrams/flow.puml`):

````markdown
```plantuml
@startuml
Reader -> Studio: open file
Studio --> Reader: rendered page
@enduml
```

```{uml} diagrams/flow.puml
```
````

Review notes for the reader, and README-style HTML:

````markdown
<!-- TODO: confirm the budget with finance -->

<!-- THREAD
Ada (2026-10-28 10:00):
  Is week 3 realistic?
-->

<div align="center">

**Export plan** v0.47

</div>
````

A front matter value in the text. Inline code that is exactly `= this.<field>` (or `=this.<field>`,
and `this.a.b` for a nested field) shows the value of that field of the same document's front
matter; no other document is read. A string or a number shows as text, a boolean as `true` or
`false`, a list as its items joined with `, `, an object as its YAML on one line. The value is
plain text, never Markdown or HTML. A field that is missing or empty leaves the code as written,
with a warning colour and a warning in the diagnostics: write only fields the front matter holds.
Any other inline code, and code in a fenced block, is not changed. To show the form itself, keep a
backtick inside the code, as the last line of the example does, or put it in a fenced block. More
backticks around the code are not enough: the code text is the same.

````markdown
---
title: Export plan
status: draft
tags: [export, csv]
owner:
  name: Ada
---

# `= this.title`

Status: `= this.status`. Tags: `=this.tags`. Owner: `= this.owner.name`.

The form itself, shown as code: `` `= this.status` ``.
````
