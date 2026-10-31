---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-152
uuid: 6561d8e8-67f9-4613-92c9-cca85bb539e7
title: The showComments setting and the Comments button hide and show every
  review mark
description: When the setting markdownOkfSchemaStudio.preview.showComments is
  read, the extension SHALL treat the value false as off and every other value,
  including no value, as on, and while the setting is off or the Comments button
  is off it SHALL hide the gray and the thread chips and every review mark of
  the preview (highlight colour and underline, badges, the Orphaned comments
  box), keeping the quoted text as plain text that opens no thread popover and
  is not in the Tab order.
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
- src/page/features/hostHandlers.ts
- src/page/modules/chipToggle.ts
- src/page/modules/commentThreads.ts
- src/page/modules/commentsToggle.ts
- src/session/features/viewState.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/integration/realInput/blockKeys.ts
- test/page/modules/chipToggle.test.ts
- test/page/modules/commentThreads.test.ts
- test/page/modules/commentsToggle.test.ts
- test/page/runtimeCommentsHidden.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
- test/visual/reviewMarksHiddenScenarios.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The showComments setting and the Comments button hide and show every review mark

### Normative behavior

When the setting markdownOkfSchemaStudio.preview.showComments is read, the extension SHALL treat the value false as off and every other value, including no value, as on, and while the setting is off or the Comments button is off it SHALL hide the gray and the thread chips and every review mark of the preview (highlight colour and underline, badges, the Orphaned comments box), keeping the quoted text as plain text that opens no thread popover and is not in the Tab order.

Comments are hidden while either trigger is off: the setting (master switch, which also removes the button) or the Comments button (a view choice stored for the workspace). The TODO chips and the text-selection Comment button (SwRS-MDOKFSTUDIO-REVIEW-038) stay.

### Scenario (boundary): Setting value at start
| Input | Outcome |
| --- | --- |
| The setting not set | The gray comment chips show |
| The setting set to true or to any value other than false | The gray comment chips show |
| The setting set to false | The gray and the thread chips and every review mark are hidden |

### Scenario (nominal): The setting changes in an open preview
- GIVEN an open preview with a gray chip, a thread chip, a TODO chip, a thread highlight and an open thread popover
- WHEN the setting is set to false, and then to true
- THEN the gray and the thread chips and the review marks are hidden at once and the popover closes, the TODO chip stays, without a new render; with true the chips and the marks show again

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

### Scenario (nominal): Hiding comments hides every review mark

| Review mark | Comments hidden (button off or setting false) | Comments shown again |
| --- | --- | --- |
| Highlight of an open thread | no highlight colour, no rounded paint, no pointer cursor; the quoted text stays as plain text | the highlight colour is back |
| Highlight of a resolved thread | no dotted underline; the quoted text stays as plain text | the dotted underline is back |
| Thread badge | not displayed | displayed |
| Orphaned comments box | not displayed | displayed |

### Scenario (nominal): A former highlight behaves as plain text

| Input while comments are hidden | Outcome |
| --- | --- |
| Click on a former highlight in preview mode | no popover; the source line of its block is revealed, as for a click on plain text |
| Click on a former highlight in edit mode | no popover; the block editor of its block opens |
| Click, Enter or Space on a former highlight, badge or orphaned comments entry | no popover; the event reaches the other handlers of the page |
| Tab through the page | the former highlights are skipped (no tabindex, no button role) |
| Comments shown again | the highlights are back in the Tab order and open their popover again |

### Scenario (boundary): Popovers and new threads while comments are hidden

| Given | When | Then |
| --- | --- | --- |
| a thread popover open | the reader presses the Comments button, or the setting turns false | the popover closes |
| comments hidden | the threads are posted again (a render, a new thread made with the text-selection Comment button) | the new marks are hidden too and no popover reopens |
| comments hidden after a closed popover | comments are shown again | no popover opens by itself |
| comments hidden | the layout moves because a badge after a block is no longer displayed | the reading line is kept by the same layout callback as the chips |

### Related requirements
- SwRS-MDOKFSTUDIO-REVIEW-156: a show-comments message of another render is ignored.
- SwRS-MDOKFSTUDIO-REVIEW-021: a highlight, badge or orphaned comments entry opens the thread popover only while comments are shown.

### Verification notes
- Method: test/page/modules/chipToggle.test.ts (`the show-comments attribute follows the setting, live`: default, off, live change).
- Method: test/core/configuration/settingsRegistry.test.ts (boot flag showComments) and test/security/package-contract.test.ts (setting listed, boolean, default true).
- Method: test/core/preview/previewStyles.test.ts (`T15: an open comment is an admonition-like box and showComments off hides the gray chips only`; `the Comments toolbar button hides the gray chips at once and goes away with the setting`: button hidden with the setting off, the button hides the comment and the thread kinds, not the TODO kind). The hiding of the thread chips by the setting is deduced from the stylesheet rule, not asserted.
- Method: test/session/reviewReqIncoming.requirements.test.ts (`the value of preview.showComments is posted to the page when the settings change, without a render`). The page-load trigger is untested at host level.
- Method: test/page/modules/commentsToggle.test.ts (`comments are shown by default and the button says how to hide them`, `the saved preference and the webview state decide the initial state`, `a click hides the comment chips, posts the preference, keeps the state and re-lays out`).
- Method: visual scenarios review-annotations/v20-comment-chips-hidden-light-900 and v02-comment-todo-chips-light-900 (setting off, then on), v07-comment-list-chips-visible-light-900 to v10-comment-list-chips-hidden-dark-900 (button, preview and edit mode), v22-comments-button-hides-thread-light-900 (the button hides the thread chip, the TODO chip stays), v29-comments-button-hides-review-marks-light-900 and v30-comments-button-hides-review-marks-dark-900 (the button removes the highlight colour, the dotted underline and the Orphaned comments box, the quoted text stays, a click on the former highlight opens no popover and reveals its source line, a second press brings the marks back).
- Method: test/core/preview/previewStyles.test.ts (`comments hidden by the button or the setting: highlights lose their paint, badges and the orphan box go`, both attributes).
- Method: test/page/modules/commentThreads.test.ts (`comments hidden: a click, Enter or Space on a highlight, badge or orphan entry opens nothing and is not swallowed`, `comments hidden: highlights leave the Tab order and come back when comments are shown`, `comments hidden: an open popover closes and does not come back with the threads or with Show`, both attributes) and test/page/runtimeCommentsHidden.test.ts (`comments hidden: a click on a former highlight reveals the source line and opens no popover`, the whole page).
- Method: real window real-input scenario `scenarioHiddenReviewMarks` (test/integration/realInput/blockKeys.ts): with the Comments button off the former highlight cannot take the focus and has no highlight colour, and a real click on it in edit mode opens the block editor and no popover.
- Method: test/page/runtimeCommentsHidden.test.ts (`the setting false closes the open thread popover and a click on the highlight is plain text; true restores it`): the page message previewShowComments with showComments false removes the open popover through hostHandlers, a click on the former highlight reveals its source line and opens nothing, showComments true brings the popover back.
- Untested: the Tab order after the setting changed, at runtime level (the runtime harness has no text nodes, so no highlight is placed; it is asserted on the thread module in commentThreads.test.ts and in a real window for the button); the badge layout shift and the reading line kept across it (the layout callback is the one of the chips); the text-selection Comment button while hidden (SwRS-MDOKFSTUDIO-REVIEW-038).
- Criteria: package.json declares the setting as boolean with default true and the boot flag is on for every value but false; the page attribute data-okf-show-comments is false and the stylesheet hides the two kinds and the button; postShowComments runs in onSettingsChanged and after a page load; the pressed state and the three texts match the state; the page attribute data-sphinx-preview-comments is off after the button, the post carries preference comments with value false, the layout callback runs so that the reading position is kept, and the stylesheet hides the comment and the thread kinds (not the TODO kind). Under either attribute (data-sphinx-preview-comments off or data-okf-show-comments false) the stylesheet gives mark[data-okf-comment-thread] a transparent background, no text decoration, no radius and an inherited cursor, and display none to button[data-okf-comment-badge] and [data-okf-orphans]; the thread interceptor and the Enter and Space handler neither prevent nor stop an event on a holder and open no popover; the marks carry no tabindex, role or aria-haspopup; a popover open when comments become hidden, by the button or by the previewShowComments message of the setting, is removed and not reopened by a re-apply.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-012](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-012.md): A writer sees HTML comments and TODO notes as chips and toggles them
- Depends on:
  - [SwRS-MDOKFSTUDIO-LIFE-169](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
<!-- okf:links:end -->
