---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-006
uuid: 350c600e-37cf-4315-b1bb-e058b021573d
title: One button switches the width mode
description: When a reader presses the Width button, the Studio SHALL cycle
  between Margin, Auto and Full width and remember the choice for the workspace.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-LAYOUT-003; no marker expected."
derives_from: []
user_need: As a reader, I switch between a narrow reading column, a column that
  lets wide content out, and the full pane with one button, and the choice is
  still there when I come back.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-LAYOUT-003
default_owner_email: gaetan@xeberon.net
---

## One button switches the width mode

### Normative behavior

When a reader presses the Width button, the Studio SHALL cycle between Margin, Auto and Full width and remember the choice for the workspace.

### Preserved stakeholder intent

As a reader, I switch between a narrow reading column, a column that lets wide content out, and the full pane with one button, and the choice is still there when I come back.

### Rationale and constraints

- The Width button sits in the third toolbar row (the options row, after Theme) in `renderPreviewToolbar` of `src/core/preview/previewToolbar.ts`; the placement itself is checked by the toolbar-navigation scope.
- The order is Margin, Auto, Full width, then Margin again; the icon, label and tooltip read "Width: Margin", "Width: Auto" and "Width: Full width".
- The choice is kept per workspace: at start the saved page state wins over the stored workspace preference, which wins over Margin; an invalid value is ignored and Margin applies (`VIEW_PREFERENCE_VALIDATORS` in `src/core/protocol/pageToHost.ts`).
- Known issue: the code and docs/user/toolbar.md put the button on row 3, while the file header of `widthMode.ts` and an older bullet of the Unreleased change-log entry say row 2.
