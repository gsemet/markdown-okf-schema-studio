# Writing skill maintenance

The folder `skills/writing-for-markdown-okf-schema-studio/` is a product deliverable: an agent skill
that teaches any agent which Markdown Studio renders, so a generated plan, report or README looks
good in the preview. It is installed on machines that have the extension but not this repository.
It is therefore kept in sync with the renderer, in the same pull request.

## When to update it

A change updates the skill in the same pull request when it adds, removes or changes a rendered
syntax: a directive or role, a fence language, a marker such as `[TOC]`, an HTML element the
sanitizer keeps, a palette mode that changes what the reader can insert, or a limit (remote
resources, Restricted Mode, PlantUML features). A change that touches no rendered syntax leaves it
alone.

- Add the syntax to the capability table of `SKILL.md`, with the shortest example where Studio
  differs from the standard syntax or adds something.
- Removed or renamed syntax: delete it from the table, the examples and the limits; a syntax the
  skill still names but Studio no longer renders fails the check below.
- Say what Studio does not render when an agent is likely to try it (`[[toc]]`, inline `<svg>`).
- Update the "taste" rules only when a new syntax changes the choice of the best visual.

## Rules for the skill itself

1. **Self-contained.** No link, path or URL into this repository's sources, docs or tests: the
   skill folder is all an agent has. Links stay inside the folder (`references/`).
2. **Minimal.** It states what is available in Studio, not how MyST, GFM, Mermaid, PlantUML, SVG or
   Vega-Lite work; agents know them. Keep `SKILL.md` at about 150 lines (the check refuses more than
   160); move extra examples to `references/*.md`.
3. **Every example is real.** An example is a complete document in a `markdown` fence of four
   backticks. Examples use only syntax Studio renders; never show a failing syntax as an example
   (describe it in "Limits" instead).
4. **English only**, developer-docs register, no emoji.
5. The front matter `name` equals the folder name; `description` says when to use the skill
   (write or generate a Markdown document for Studio) and stays under 1 024 characters.

## How to check

The unit test `test/core/render/writingSkill.test.ts` (run by `just unit` and `just check`):

- renders every example of `SKILL.md` and `references/*.md` through the real preview pipeline and
  fails on a render error, a diagnostic or an unresolved directive;
- fails when a syntax family the skill lists (cards, tabs, version notes, alerts, admonitions,
  table of contents, math, list table, figure, Mermaid, PlantUML, Vega-Lite, README HTML, comments,
  front matter, radio choices in a plan) has no example,
  or its example no longer renders as its own element;
- checks the shape: front matter, length, no link out of the folder, no repository path.

A new syntax family goes into the `FAMILIES` list of that test together with its example. The
requirement is SwRS-MDOKFSTUDIO-CORE-073.

Mermaid is drawn in the page, so the check proves only that the fence reaches the page; check the
diagram syntax of a new Mermaid example by hand.

## Shipping and installing

`skills/` is not excluded by `.vscodeignore`, so the VSIX carries the folder. Studio has no command
that copies it to a user's skills folder; a user copies `skills/writing-for-markdown-okf-schema-studio/`
to `~/.claude/skills/` or the `.github/skills/` of a repository. Adding an install command is a
separate change request (a command, a target-folder prompt, a test and an SwRS).
