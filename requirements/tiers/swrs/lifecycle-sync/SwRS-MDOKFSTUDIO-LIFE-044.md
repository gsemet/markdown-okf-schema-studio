---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-044
uuid: 344ade2d-9c5f-4605-9645-38a431e8bf4a
title: Changes to files and settings the render depends on render again
description: When a file that the shown render depends on is changed, created,
  deleted or renamed below the preview's root, or a markdownOkfSchemaStudio
  preview, plantuml or frontmatter setting changes, the extension SHALL render
  the shown document again or bring the page up to date, ignoring file events
  below build and tool folders of that root.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/hostEvents.ts
tested_in_files:
- test/core/configuration/previewConfiguration.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/dirtySnapshots.test.ts
- test/node-services/build/buildQueue.test.ts
- test/session/eventFanOut.test.ts
default_owner_email: gaetan@xeberon.net
---

## Changes to files and settings the render depends on render again

### Normative behavior

When a file that the shown render depends on is changed, created, deleted or renamed below the preview's root, or a markdownOkfSchemaStudio preview, plantuml or frontmatter setting changes, the extension SHALL render the shown document again or bring the page up to date, ignoring file events below build and tool folders of that root.

### Scenario (nominal): Changed include

- GIVEN a preview whose render includes preview-refresh.md
- WHEN preview-refresh.md changes on disk
- THEN the preview renders again and shows the updated include text

### Scenario (boundary): Which file events render again

| Input | Outcome |
| --- | --- |
| a file below the root that the render does not use changes | no render starts |
| the reader renames parts/intro.md to parts/start.md, and the render includes parts/intro.md | the preview renders again and shows the include as unresolved or as the new file |
| a rename of a file that is not a dependency | no render starts |

### Scenario (refusal): Folders the preview ignores

| Input | Outcome |
| --- | --- |
| a path whose part below the preview's root has one of the segments .git, .venv, .vscode-test, _build, dist, htmlcov, node_modules, out, output, public or tmp, from a file event or from a change of a document other than the shown one | ignored for the preview, no render starts |
| an include under project/node_modules/x.md that the render depends on changes | no render starts |
| a workspace at /home/me/tmp/book, an included file changes on disk | the preview renders again: only the segments below the root are checked |
| a file at /home/me/tmp/book/out/x.md changes | ignored: the out segment is below the root |

### Scenario (nominal): Preview setting

- GIVEN an open preview and a change of markdownOkfSchemaStudio.preview.incrementalUpdates
- WHEN the settings event arrives
- THEN the session's configuration holds the new value and the next update uses it

### Scenario (refusal): Other setting section

- GIVEN a change of a setting outside the three sections, such as markdownOkfSchemaStudio.comments.authorName
- WHEN the settings event arrives
- THEN the event is ignored by the preview lifecycle

### Known issues

- Known issue: the canonical form of the shown file is cached per raw path for the session, so a symlink retargeted under the shown file is not noticed until the path string changes.

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-193: the render is deferred while an inline editor is open.
- SwRS-MDOKFSTUDIO-MYST-078: conf.py events.

### Verification notes

- Method: test/integration/dirtySnapshots.test.ts (changed include: the initial referenced include, the changed referenced include).
- Method: test/node-services/build/buildQueue.test.ts "tracks referenced dependencies for refresh decisions".
- Method: test/host/lifeReq.requirements.test.ts "renaming a file the render depends on renders the document again, an unrelated rename does not" (rename rows; checked by reading onFilesRenamed in src/session/hostEvents.ts) and "file events below build and tool folders do not trigger a render (only the segments below the root count)" (folders the preview ignores; checked by reading IGNORED_WATCH_SEGMENTS and isIgnoredWatchPath in src/session/hostEvents.ts).
- Method: test/core/configuration/previewConfiguration.test.ts "incremental updates can be turned off and default to on" covers the reading of the preview setting; the settings scenarios are untested at the integration level and checked by reading onSettingsChanged.
- Method: test/session/eventFanOut.test.ts (a change of a document no preview depends on costs no `realpathSync` per preview; a dependency still refreshes only its preview).
- Criteria: a change of a path that is neither the shown file, a linked target, a PlantUML include nor in the canonical dependency set of the last render returns before any other work (the canonical forms are computed once per render and per path, not per event and preview); requestId grows and the HTML holds the updated marker; refreshPreviewDocument runs only when queue.dependsOn names the old or new path; refreshReferencedPath returns before any dependency, enrichment or include handling when any segment of the path below the session's root is in the list; session.configuration equals readPreviewConfiguration after the event.
