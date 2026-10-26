# Settings

The settings are available under **Markdown OKF-Schema Studio** in VS Code settings, in five
categories: Preview, Editing, Frontmatter, Comments and PlantUML. A new workspace starts with the
cream preview theme, the floating toolbar collapsed to its first row and the GFM palette. The
theme and the toolbar state are built-in starting points, not settings; the palette follows
`editing.defaultPaletteMode`. A choice you make in the preview is remembered per workspace.

**Preview**

- `preview.maxContentWidth` (default 960): width of the text column in pixels; `0` is full width.
  The Width button on the third toolbar row switches between Margin (this column), Auto (tables,
  figures, images and code blocks wider than the column break out, centred, up to the free pane
width;
  narrower tables and figures are centred) and Full width;
  with the setting at `0` all three look the same. The choice is remembered per workspace.
  The TOC button next to it shows or hides a column of h1-h4 headings on the right (off by default,
  remembered per workspace, hidden on panes narrower than 760 px); click an entry to scroll there,
  fold sections with the twisty; the current section is highlighted.
- `preview.stickyHeadingDepth` (default 3): heading levels pinned at the top while scrolling (1-6).
- `preview.incrementalUpdates` (default on): update changed parts in place; off reloads the page.
- `preview.showComments` (default on): show HTML comments as gray chips; click one (or press Enter
  or Space on it) to open the comment text in a box under the line. Each chip is labelled
  "comment". The Comments button of the toolbar hides and shows them in both preview and edit mode
  (remembered per workspace, shown by default). Off here hides the gray chips and the green thread
chips in open
  previews at once and removes that button. TODO chips always show.
- `preview.showIncomingChanges` (default on): mark blocks changed since the last Git commit
  (unsaved edits included) with a green bar on the left, like the editor gutter. Needs the built-in
  Git extension; files that are not in Git, and untrusted workspaces, show nothing. Off turns the
  marks, and their toolbar toggle, off.
- `preview.scrollPreviewWithEditor` (default on): editor scrolling moves the preview; the toolbar
  anchor button overrides it per panel.
- `preview.scrollEditorWithPreview` (default on): preview scrolling and clicks reveal the source.
- `preview.markEditorSelection` (default off): mark the cursor's source line in the preview.

**Editing**

- `editing.defaultPaletteMode` (default `gfm`): buttons the edition palette shows in a workspace
  that has not chosen yet: `strict` (plain Markdown), `gfm` (strict plus GitHub Flavored Markdown)
  or `myst` (GFM plus MyST). The select at the start of the palette changes it and the choice is
  remembered per workspace; it changes the buttons only, never the rendering.

**Frontmatter**

- `frontmatter.propertiesTable` (default on): show the properties table above the preview.
- `frontmatter.strictAdditionalProperties` (default off): warn on fields the OKF schema omits.
- `frontmatter.bundleRoot` and `frontmatter.projectRoot` (default empty): roots for `x-okf-link`
  values; relative paths resolve from the first workspace folder. Empty bundle root: the schema
  folder's parent if it holds the document and an `index.md` or `log.md`; empty project root: the
  git root inside the workspace; otherwise such links cannot be resolved.
- `frontmatter.allowOutsideWorkspaceLinks` (default off): resolve document-relative links that
  leave the workspace.

**Comments**

- `comments.authorName` (default empty): the name stored with the review comments you write in the
  preview. Empty uses your Git `user.name`, then your operating system user name.

**PlantUML**

- `plantuml.useJar` (default off): off, PlantUML diagrams are drawn by the built-in engine, with
  no Java and no network; on, by Java with `plantuml.jarPath` or by `plantuml` from PATH (trusted
  workspaces only). See [PlantUML Diagrams](plantuml.md).
- `plantuml.jarPath` (default empty): path to `plantuml.jar`, relative to the workspace folder;
  empty uses `plantuml` from PATH. Used only when `plantuml.useJar` is on.
