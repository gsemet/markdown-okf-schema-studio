# Review Comments

[![An open comment thread on a passage, with a comment, a reply, and the Resolve, Delete and Reply controls](../../images/readme/showcase-comment-thread.png)](../../images/readme/showcase-comment-thread.png)

A file named like the document with `.comments.json` instead of its extension, for example
`notes.comments.json` next to `notes.md`, holds review comment threads. The preview highlights the
quoted text of every thread, in preview and in edit mode; when the quote cannot be found in the
block, a small badge marks the block instead. Click a highlight or a badge to read the thread in a
popover: author, date, the comments as plain text, and a "Resolved" note for closed threads
(dimmed). Code, diagrams, math and the properties table are never highlighted. A file that is not
valid is ignored with a warning and is never overwritten.

The **Comments** button of the floating toolbar hides all of this at once: highlights, badges and
the Orphaned comments box disappear, the quoted text stays as plain text and a click on it opens no
popover. Press it again to show them. The setting `markdownOkfSchemaStudio.preview.showComments`
set to off does the same and removes the button.

To start a thread, select text in the preview: a small **Comment** button appears next to the
selection (or press Cmd+Alt+M on macOS, Ctrl+Alt+M elsewhere). Write the comment in the box and
press **Save** (Cmd/Ctrl+Enter); Escape cancels. The thread is saved in the comments file, which is
created when it does not exist. A selection that spans several blocks is anchored from the first
block to the end of the last one. To answer, open a thread and use its reply box. The button is not
shown while a block editor is open, over code or the properties table, or in a read-only preview
(untrusted workspace), where adding comments is refused. The name stored with a comment is the
`markdownOkfSchemaStudio.comments.authorName` setting, else your Git `user.name`, else your
operating system user name. The setting can be set per user, per workspace or per folder
(`.vscode/settings.json`), for example to sign the comments of one project with an alias.

A thread popover also has **Resolve** (then **Reopen**) and **Delete**; Delete asks "Delete
thread?" with Yes and No in the popover, and deleting the last thread keeps the file with an empty
list. A thread whose block and quote can no longer be found is never dropped: it is listed under
**Orphaned comments** at the end of the preview, with its quote, and you can open it from there
to resolve or delete it. Read-only previews show neither button.

Threads follow the text. Edits move them in memory, and the moved lines are written to the comments
file when you save the document (never while typing, never creating a file). When the document is
opened or changed outside the editor, each quote is searched again, near its old place first; a
match that is not clear is not guessed, the thread becomes orphaned. Renaming a document renames
its comments file too, unless one with the new name exists.

```json
{
  "version": 1,
  "document": "notes.md",
  "threads": [
    {
      "id": "t1",
      "anchor": { "line": 3, "endLine": 3, "quote": "second paragraph", "prefix": "The ", "suffix": " has" },
      "resolved": false,
      "createdAt": "2026-10-21T10:00:00Z",
      "comments": [
        { "id": "c1", "author": "Ada", "createdAt": "2026-10-21T10:00:00Z", "body": "Why this?" }
      ]
    }
  ]
}
```
