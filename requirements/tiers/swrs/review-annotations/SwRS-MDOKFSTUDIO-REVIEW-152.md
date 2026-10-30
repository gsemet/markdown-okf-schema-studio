---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-152
uuid: 6561d8e8-67f9-4613-92c9-cca85bb539e7
title: The showComments setting and the Comments button hide and show the chips
description: When the setting markdownOkfSchemaStudio.preview.showComments is
  read, the extension SHALL treat the value false as off and every other value,
  including no value, as on, hiding the comment chips of the preview while it is
  off and letting the Comments button hide and show the gray and the thread
  chips while it is on.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/preview/styles/commentStyles.ts
- src/page/modules/chipToggle.ts
- src/page/modules/commentsToggle.ts
- src/session/features/viewState.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/chipToggle.test.ts
- test/page/modules/commentsToggle.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The showComments setting and the Comments button hide and show the chips

### Normative behavior

When the setting markdownOkfSchemaStudio.preview.showComments is read, the extension SHALL treat the value false as off and every other value, including no value, as on, hiding the comment chips of the preview while it is off and letting the Comments button hide and show the gray chips while it is on.

### Scenario (boundary): Setting value at start
| Input | Outcome |
| --- | --- |
| The setting not set | The gray comment chips show |
| The setting set to true or to any value other than false | The gray comment chips show |
| The setting set to false | The gray comment chips are hidden |

### Scenario (nominal): The setting changes in an open preview
- GIVEN an open preview with a gray chip, a thread chip and a TODO chip
- WHEN the setting is set to false, and then to true
- THEN the gray and the thread chips are hidden at once and the TODO chip stays, without a new render; with true the chips show again

### Scenario (nominal): The Comments button follows the setting
| Setting | Toolbar |
| --- | --- |
| false | No Comments button is visible |
| true | The Comments button is visible |

### Scenario (nominal): The host tells the page the value
| Trigger | Outcome |
| --- | --- |
| The settings change (true to false, for example) | The page receives showComments false, without a new render |
| A page has just loaded | The page receives the current value |

### Scenario (nominal): The Comments button shows its state
| Comments | aria-pressed | aria-label, title and tooltip |
| --- | --- | --- |
| Shown | true | Hide comments |
| Hidden | false | Show comments |

### Scenario (nominal): The Comments button hides the gray and the thread chips
- GIVEN gray chips shown, a TODO chip and an inline thread chip on the page, in preview or in edit mode
- WHEN the reader presses the Comments button
- THEN the gray chips and the thread chip are hidden at once, the preference false is posted to the host and the state is saved in the webview (the preference is stored for the workspace and decides the start state, see SwRS-MDOKFSTUDIO-LIFE-169 and SwRS-MDOKFSTUDIO-LIFE-170), while the TODO chip stays visible

### Related requirements
- SwRS-MDOKFSTUDIO-REVIEW-156: a show-comments message of another render is ignored.

### Verification notes
- Method: test/page/modules/chipToggle.test.ts (`the show-comments attribute follows the setting, live`: default, off, live change).
- Method: test/core/configuration/settingsRegistry.test.ts (boot flag showComments) and test/security/package-contract.test.ts (setting listed, boolean, default true).
- Method: test/core/preview/previewStyles.test.ts (`T15: an open comment is an admonition-like box and showComments off hides the gray chips only`; `the Comments toolbar button hides the gray chips at once and goes away with the setting`: button hidden with the setting off, the button hides the comment and the thread kinds, not the TODO kind). The hiding of the thread chips by the setting is deduced from the stylesheet rule, not asserted.
- Method: test/session/reviewReqIncoming.requirements.test.ts (`the value of preview.showComments is posted to the page when the settings change, without a render`). The page-load trigger is untested at host level.
- Method: test/page/modules/commentsToggle.test.ts (`comments are shown by default and the button says how to hide them`, `the saved preference and the webview state decide the initial state`, `a click hides the comment chips, posts the preference, keeps the state and re-lays out`).
- Method: visual scenarios review-annotations/v20-comment-chips-hidden-light-900 and v02-comment-todo-chips-light-900 (setting off, then on), v07-comment-list-chips-visible-light-900 to v10-comment-list-chips-hidden-dark-900 (button, preview and edit mode), v22-comments-button-hides-thread-light-900 (the button hides the thread chip, the TODO chip stays).
- Criteria: package.json declares the setting as boolean with default true and the boot flag is on for every value but false; the page attribute data-okf-show-comments is false and the stylesheet hides the two kinds and the button; postShowComments runs in onSettingsChanged and after a page load; the pressed state and the three texts match the state; the page attribute data-sphinx-preview-comments is off after the button, the post carries preference comments with value false, the layout callback runs so that the reading position is kept, and the stylesheet hides the comment and the thread kinds only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-012](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-012.md): A writer sees HTML comments and TODO notes as chips and toggles them
- Depends on:
  - [SwRS-MDOKFSTUDIO-LIFE-169](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
<!-- okf:links:end -->
