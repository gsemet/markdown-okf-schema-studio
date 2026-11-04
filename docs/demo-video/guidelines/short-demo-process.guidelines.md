# Short demo video process

How to make, edit, review and assemble a short demo video of Markdown OKF-Schema Studio. It is
written for an agent that produces the video with the maintainer, who decides. It comes from the
57.5-second video and the takes before it: the worked example is in [short-demo-01/](../short-demo-01/), and the lessons are
in the steps below, with the reason for each rule.

The method in one sentence: film the real product, keep every text in one Markdown storyboard that
the maintainer edits, and show a real render early and often, because a video is judged by watching
it, not by reading its plan.

**The first rule: the maintainer always has an up-to-date storyboard.** What they read in that one
file is exactly what the video says and shows, at every moment of the work, so that they can make
their small adjustments alone. See "The live storyboard" below; nothing else in this process matters
as much.

## Roles

| Who | Does | Never |
| --- | --- | --- |
| Maintainer | Decides messages, identity, length, music; edits the storyboard; watches every cut; publishes | - |
| Agent | Proposes, writes the document and the storyboard, films, composes, checks frames and levels | Publishes, posts, or says a video is good without saying what it did not check |

The agent asks a few questions at each decision below, with a recommended answer first, then acts
on the answers. It does not wait for a validated plan to show a first picture.

## The steps

| Step | Result | Maintainer gate |
| --- | --- | --- |
| 1. Frame | Audience, length, three key messages | Agrees the messages |
| 2. Identity | Colours, type, framing | Picks from real pictures |
| 3. Scenario | Questions answered, panel list | Answers the questions |
| 4. Demo document | A document worth reading | Reads it in Studio |
| 5. Storyboard | Every text and time, in Markdown | Edits it directly |
| 6. Trial | A short cut that proves the chain | Watches it |
| 7. Take | The full footage | - |
| 8. Composition | The full video, with texts from the storyboard | - |
| 9. Self-check | Sampled frames, levels, file changes | - |
| 10. Review rounds | Corrections, until the maintainer is happy | Watches each cut |
| 11. Music | A licensed track, cut and faded | Listens and picks |
| 12. Publication | Final checks, draft post | Publishes |

### 1. Frame

Agree three key messages before anything else, in the order the video gives them. The ones of the
example: what your agent writes becomes a page; you read and edit in the same place; you decide from
the page.

Length comes from what must be shown, not from a target. Fifteen seconds looked like a good
format and failed: "too fast, and it does not show much". Forty seconds was better and still left
the main idea unexplained. Fifty-nine seconds worked. Start from about one minute unless the video
has a single idea; the X limit for a simple upload is well above it.

### 2. Identity

Show real pictures, not descriptions: a contact sheet of existing takes is enough for the maintainer
to point at what they like. Reuse the identity below for every video, so that the videos look like a
series.

| Element | Rule |
| --- | --- |
| Cards | Green radial gradient `#11707F`, `#0D5360`, `#082F37`; logo, title, orange line, subtitle |
| Window | Real VS Code, light theme, full frame |
| Preview | Cream theme, paper `#F5F1E8` |
| Text on green | White; subtitles in pale green `#D6EBEE` |
| Accent | Orange: `#F2822B` for lines, marks and callouts, `#FFB06A` for bold words of a caption |
| Type | `-apple-system`, SF Pro Display, Helvetica Neue, Inter, Arial |
| Caption | Green pill, bottom centre, 3 to 6 words, words spring up one by one |
| Callout | Orange pill, just after the last click of the panel, sparingly |
| Marks | Orange outline on what changed, in the page and in the raw text |
| Cursor | Drawn over the footage, one orange ripple per click |
| Zoom | At most 2x, eased; never cuts a line of text |
| Cuts | Crossfade of 8 frames |
| End card | Logo, title, Marketplace link, and a small line at the bottom on how the video was made |
| Format | 1920x1080, 30 fps, H.264 `yuv420p`; the video must also work muted |

Full frame beat a window floating on a green stage: VS Code stays larger and the text stays
readable. The green remains in the cards and the captions.

### 3. Scenario

Ask the maintainer before writing, in a few questions with options. These answers shaped the
example, and the reasons hold for most videos:

- **Do not show the agent.** A chat panel is heavy to film and ties the video to one product. A
  caption says who wrote the text.
- **Open on the raw text in the built-in editor, then switch to Studio.** The contrast is the
  message; without the "before", the page is just a page.
- **Follow the order of the document when you can.** Panels that go down the page need no cut.
- **Spend about half of the video side by side with the raw text.** That is what makes the
  product understood: the page and the text are the same thing. Show the edit in both directions,
  from the page to the text and from the text to the page.
- **Then zoom on a few features**, each a different one. Do not show the same feature twice: a chart
  changed side by side does not need a chart zoom afterwards.
- **Show what is distinctive**: editing a table cell, a decision that changes the file, front matter
  checked against an OKF schema, a wide table leaving the margin. A comment thread was dropped in
  favour of these.
- **Prefer the edit whose effect is seen at once.** A chart edited in its block editor hides the
  chart until Done. Changing the number in the raw text redraws the chart beside it, live.
- **Say what the reader does, not what the tool plumbing does.** "Answer your agent" implied a live
  link that does not exist; "Make a decision in the page" is true.

### 4. Demo document

Write the document an agent would really write: a technical post-mortem, plan or spec, with real
sentences, real numbers and a stake. Plain sessions-to-Redis prose was too thin; a post-mortem gave
cards, a wide table, a sequence diagram, a chart, code and a decision that all belong together.

- Fictional, with no personal or employer data.
- One document for the whole video, read from top to bottom, so that scrolling feels natural.
- The numbers must agree with each other, including after the edits made on screen.
- Open it in Studio and check each block at video size. Keep what the page must show in the columns
  visible in a half-width pane: a wide table in edit mode shows only its first columns, so the cell
  to edit goes in the second column.
- Give each chart a fixed width: `width: container` came out narrow, with overlapping labels.
- For cards, use `{grid} 3` and the `Title`, `^^^`, body form. `1 1 3 3` stacks in a side pane and
  `:header:` does not render on a grid card.
- For OKF, add a real `stage/_schema/<type>.schema.yaml` beside the document and a `type:` field.

### 5. Storyboard

The storyboard is the maintainer's editing support, and the video is built from it. See
[01-storyboard.md](../short-demo-01/01-storyboard.md).

#### The live storyboard

These rules have no exception. Breaking them cost the most frustration of the whole project: the
maintainer kept opening a storyboard whose text was no longer the text of the video, and could not
adjust anything.

- **One file, one path, for the whole life of the video.** The first storyboard the maintainer opens
  is the live one, and it stays at that path. A new length or a new cut in a new folder does not
  create a new storyboard: the new folder links to the same file. Say its full path in every delivery
  message.
- **The video reads its texts from this file**, never from a copy in the code. Nothing that appears
  on screen as text is written anywhere else.
- **Every change the agent makes lands in the file in the same step**: a new panel, a new caption,
  a new time, a new shot. No delivery while the file and the video differ.
- **Before each take or render, read the file again.** The maintainer may have edited it. Keep their
  edits, and look at its modification time, not only at what you expect it to hold.
- **After each render, refresh the pictures and the filmed lengths** with `kit/panels.py`, so that
  each panel shows what the video shows now.
- **The small adjustment loop is one step**: the maintainer edits, saves and asks for a render; the
  agent runs `kit/render.sh` and `kit/panels.py` and sends the video. About two minutes.

#### Its contract

- `**bold**` in a title or caption takes the accent colour; `-` means the layer is not used.
- Each panel has a picture from the last render, its time, its filmed length, its message, what is
  filmed, and its texts.
- Rows marked *(filmed)* need a new take; all the others need only a render.
- A panel plays its whole filmed action, sped up or slowed down to fit its time. Stay at or under
  about 1.3 times the filmed length: the maintainer found that pace good.

### 6. Trial

Before filming everything, cut a short trial: two or three panels through the whole chain, to the
final look. It costs little and settles what no plan can: sharpness, framing, whether the idea reads.
The first trial is also what showed the video was too short.

### 7. Take

Copy [short-demo-01/](../short-demo-01/) to a working folder (`.agents/changes` for a change request), then:

```bash
mkdir -p /private/tmp/demo/remo && cd /private/tmp/demo/remo
npm init -y && npm install remotion@4.0.539 @remotion/cli@4.0.539 react@19 react-dom@19
```

These are installed in the scratch folder only, never in the extension's `package.json`. The working
folder needs a link to them and the logo:

```bash
ln -s /private/tmp/demo/remo/node_modules kit/remotion/node_modules
mkdir -p kit/remotion/public && cp <repository>/images/logo.png kit/remotion/public/
```

A take runs from the working folder, with `DEMO_SCRATCH` (the scratch folder), `DEMO_DOC` (the
absolute path of the document) and `DEMO_NODE_ROOT` (the repository, for `playwright-core`):

```bash
node kit/setup.mjs
node kit/capture.mjs
python3 kit/prepare.py "$DEMO_SCRATCH/take" kit/remotion/public
```

`capture.mjs` is the script of the example: its panel section is what changes for a new video. It
drives the real window, and writes events (mouse, clicks, panel starts and ends, zooms, marks).

Rules and traps, each paid for by a failed take:

| Trap | Rule |
| --- | --- |
| The maintainer's profile | Always a throwaway `--user-data-dir` and `--extensions-dir`; install the published extension from the Marketplace |
| VS Code does not start with the debugging port | Keep the scratch path short |
| Soft picture | `--force-device-scale-factor=2`, and a screencast at full size |
| The cursor is not in the screencast | Record its track and draw it in the composition |
| A radio click leaves the file dirty, so "Saved" is false | `files.autoSave: afterDelay` in the profile |
| A personal name in a comment or tooltip | `comments.authorName` set in the profile; look at every frame with an author or a path |
| A hover tooltip shows a local path | `workbench.hover.delay` very high |
| A blue line on the sash | `sash.hoverBorder` transparent, and a high `workbench.sash.hoverDelay` |
| Word highlights in the raw text | `editor.occurrencesHighlight` off and `editor.selectionHighlight` false |
| The wheel jumps to the end of the raw text | Scroll Monaco with `Control+PageDown` and `editor.smoothScrolling`, not with `mouse.wheel` |
| Maximise key ignored by the webview | A keybinding in the profile, the focus through a tab click, and a check of the pane width with retries |
| Text not found in the raw text | Monaco writes spaces as non-breaking spaces: normalise before searching |
| Escape cancels a table cell or field edit | Finish with Done, or a click outside the editor |
| A native `select` popup is not captured | `selectOption`, without opening the popup |
| Text in a Mermaid diagram cannot be located | Mark the whole diagram |
| A block editor moves the page | Scroll back to the block after Done, inside the panel |
| An edit in the raw text moves both panes in the middle of a shot | Make a throwaway edit before the panel starts (a space, then Backspace), so that the panes are settled |
| The block under the old cursor shows its edit controls | Leave edit mode before a shot that only types in the raw text |

Between panels, set the next shot up after a `close()` event: what happens there is not in the
video. A value can also be prepared there, such as the refused `SEV-9` of the front matter panel.
Each take ends with a check that the file holds every expected edit.

### 8. Composition

`kit/render.sh` reads the storyboard and renders `output/short-demo-01.mp4`. It needs
`kit/remotion/public/music.wav`: a silent or draft track is fine until step 11. A text change needs only
this command.

The first frame of the video is its poster on X: the opening card has no entrance animation and is
whole from frame 0. The first version showed a nearly empty green frame in the timeline.

Captions sit over the footage in a pill, so a zoom keeps its rectangle above it. A zoom that would
cut text on one side, as any zoom of a side-by-side shot does, is replaced by marks.

### 9. Self-check

Do this before showing a cut, and report it as it is:

- Extract 12 to 16 frames across the video into one contact sheet and look at each panel: wrong
  framing, an empty raw text, a mark that misses, a tooltip, a name. This is how most defects
  of the example were found.
- Check the first and last frames, the duration and the file size.
- Check that the expected edits are in the filmed file.
- Measure the sound: `volumedetect` on the whole video and on the last seconds, to see the fade.

Say plainly what these checks do not cover: the agent sees sampled frames and levels, not motion or
sound. The rhythm and the music are the maintainer's to judge.

A cut from a failed take is not a new cut: when a take fails, the old `clip.mp4` is still there and
the render succeeds. Read the output of each command before trusting the video.

### 10. Review rounds

Send every cut as a file the maintainer can watch on a phone, with the list of what changed and of
what to look at. Then sort each remark:

| Remark | Action |
| --- | --- |
| A caption, a callout, a time | The maintainer edits the live storyboard, or the agent does; render |
| A new action, a changed document | New take, render, new panel pictures |
| Too fast, too short | Back to the scenario: more panels, not slower panels |
| "It does not show much" | Back to the document and the scenario |

Keep each delivered length in its own folder until the next one is accepted; the storyboard stays
the same live file. A retake takes minutes: prefer one to a compromise in the picture.

### 11. Music

Generated music was only good as a draft: the maintainer found a synthesised loop too repetitive.
Propose four real tracks to listen to, each with its page, its length, its style and its licence, and
do not download any until one is chosen.

- Take a track longer than the video, so that it has a development and needs no loop.
- Prefer a track with no Content ID registration: a registered one can draw an automatic claim on
  YouTube. Say when a track is marked as AI generated.
- Read the licence of the source. Pixabay's allows use in a video without credit, but not the
  redistribution of the track alone: **never commit the music file**.
- Keep the source, the author and the licence in the working folder's notes.

The cut used here:

```bash
ffmpeg -i track.mp3 -t 57.5 -af "afade=t=in:d=0.4,afade=t=out:st=54.5:d=3,loudnorm=I=-18:TP=-2:LRA=11,aresample=44100" -ac 2 -c:a pcm_s16le kit/remotion/public/music.wav
```

### 12. Publication

The maintainer publishes; the agent prepares and never posts.

- The first frame is the whole opening card.
- No personal name, path or employer data in any frame.
- The product name and where to get it are on the end card, and the link is right.
- The version shown is the current one, installed from the Marketplace.
- The music licence covers the use.
- A person who does not know the product watches it once, muted. They can say what it does in one
  sentence, name each key message, read every caption without pausing, and find where to get it.
- The announcement post is a draft, following "Announcement thread" in
  [release-process.guidelines.md](../../.agents/guidelines/release-process.guidelines.md).

A correction after publication needs a new upload: the poster and the file do not change on a
post already sent.

## The kit

| Path | Content |
| --- | --- |
| [01-storyboard.md](../short-demo-01/01-storyboard.md) | The storyboard of the 57.5-second video |
| [output/short-demo-01.mp4](../short-demo-01/output/short-demo-01.mp4) | The published video, in Git LFS. The music file itself is never committed |
| [images/](../short-demo-01/images/) | One picture per panel, shown in the storyboard, in Git LFS. `kit/panels.py` rewrites them after each render; commit them with the storyboard and the video, so that the three always match |
| [stage/](../short-demo-01/stage/) | The set of the video: the post-mortem and its OKF schema |
| [kit/](../short-demo-01/kit/) | Profile, take, clip and timing, storyboard reader, render, panel pictures |
| [kit/remotion/](../short-demo-01/kit/remotion/) | The composition |

Each video has its own folder, `docs/demo-video/short-demo-NN/`, with this layout.

Footage, intermediate files and music are not in the repository (see the `.gitignore` of the video folder). The kit
adds no dependency to the extension and is not part of its build.
