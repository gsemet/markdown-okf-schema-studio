import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
import { closeAllEditors, createFixture, openSidePreview, writeSchema } from "./realInput/harness";

function canonical(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return filePath;
  }
}

/** The excerpts the properties table shows for linked targets, as the host last posted them. */
function shownExcerpts(): string[] {
  return [...(getActivePreviewForTests()?.html ?? "").matchAll(/class="okf-link-excerpt"[^>]*>([^<]*)<\/span>/gu)]
    .map((match) => match[1] ?? "");
}

function showsExcerpt(text: string): boolean {
  return shownExcerpts().includes(text);
}

/**
 * What the host held for the linked target when a wait failed: the watched targets with the state
 * of each direct watch and the events of each source, the shown excerpt, the render state, and the
 * file on disk. The next failure explains itself (CI rule 12).
 */
/** The link statuses (`data-okf-link-status`) each properties row shows, by field name. */
function linkStatusesByField(html: string): Record<string, string[]> {
  const statuses: Record<string, string[]> = {};
  for (const row of html.split(/(?=<tr )/u)) {
    const field = /^<tr [^>]*?data-okf-field="([^"]*)"/u.exec(row)?.[1];
    if (field === undefined) continue;
    const shown = [...row.matchAll(/data-okf-link-status="([^"]*)"/gu)].map((match) => match[1]);
    if (shown.length > 0) statuses[field] = shown;
  }
  return statuses;
}

export function linkedTargetDiagnostics(targetPath: string): string {
  const preview = getActivePreviewForTests();
  let disk: string;
  try {
    disk = JSON.stringify(fs.readFileSync(targetPath, "utf8").slice(0, 120));
  } catch (error) {
    disk = `unreadable (${String(error)})`;
  }
  return JSON.stringify({
    target: targetPath,
    preview: preview === undefined ? "none" : {
      documentUri: preview.documentUri,
      phase: preview.phase,
      status: preview.status,
      webviewReady: preview.webviewReady,
      deferredWorkPending: preview.deferredWorkPending,
      linkedTargetEvents: preview.linkedTargetEvents,
      linkedTargets: preview.linkedTargets,
      linkStatuses: linkStatusesByField(preview.html),
      shownExcerpts: shownExcerpts(),
    },
  }) + `; on disk ${disk}`;
}

async function waitForLinked(
  description: string,
  targetPath: string,
  predicate: () => boolean,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  if (predicate()) return;
  throw new Error(`Timed out waiting for ${description}; host held ${linkedTargetDiagnostics(targetPath)}.`);
}

/** The direct watch the active preview holds for `targetPath`, if any. */
function directWatchOf(targetPath: string): { status: string; error?: string; events: number } | undefined {
  const wanted = canonical(targetPath);
  return getActivePreviewForTests()?.linkedTargets.find((entry) => canonical(entry.target) === wanted)?.direct;
}

function events(): number {
  return getActivePreviewForTests()?.linkedTargetEvents ?? 0;
}

/**
 * The user edits and saves a linked target in the editor, then a tool rewrites it on disk. The
 * active preview links to `targetPath` and shows its excerpt already.
 *
 * Readiness is what the host reports, never time: the direct watch of the target is armed before
 * the save; the save's refresh shows the saved excerpt; the watcher event of the save is counted
 * before the external write, so the event of that write is the next one.
 */
export async function saveThenWriteLinkedTarget(
  targetPath: string,
  steps: {
    saved: { source: string; excerpt: string };
    external: { source: string; excerpt: string };
  },
): Promise<void> {
  await waitForLinked("the linked target to be watched directly", targetPath,
    () => directWatchOf(targetPath)?.status === "watching");
  const targetDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(targetPath));
  const replaceTarget = new vscode.WorkspaceEdit();
  replaceTarget.replace(targetDocument.uri,
    new vscode.Range(targetDocument.positionAt(0), targetDocument.positionAt(targetDocument.getText().length)),
    steps.saved.source);
  const eventsBeforeSave = events();
  assert.ok(await vscode.workspace.applyEdit(replaceTarget), "the target edit was applied");
  assert.ok(await targetDocument.save(), "the target was saved");
  // The refresh the edit triggers reads the file before the save wrote it; the save itself must
  // trigger the refresh that shows it.
  await waitForLinked("linked target metadata to refresh after a saved change", targetPath,
    () => showsExcerpt(steps.saved.excerpt));
  // The save wrote the file, so the per-target watcher must deliver that real event: proof that it
  // is armed. Only then is the file changed from outside the editor, as git or a tool would.
  await waitForLinked("the linked-target watcher to deliver the event of the save", targetPath,
    () => events() > eventsBeforeSave);
  const eventsBeforeExternalWrite = events();
  fs.writeFileSync(targetPath, steps.external.source, "utf8");
  await waitForLinked("the linked-target watcher to deliver the external write", targetPath,
    () => events() > eventsBeforeExternalWrite);
  await waitForLinked("linked target metadata to refresh after an external write", targetPath,
    () => showsExcerpt(steps.external.excerpt));
}

const NOTE_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    const: note",
  "  related:",
  "    type: string",
  "    description: Supporting source document.",
  "    x-okf-link:",
  "      resolution: document-relative",
  "      syntax: plain",
  "      tooltip_shows_fields: [description]",
  "      preview_shows_fields: [description]",
  "required: [type]",
  "",
].join("\n");

const target = (description: string): string => `---\ndescription: ${description}\n---\n# Target\n`;

/**
 * Stress scenario `linked-target-save` (`just ci-stress`): a document links to a target inside the
 * workspace (where VS Code's own watcher rides on the shared recursive one), the target is saved in
 * the editor, then written from outside. CI run 39848594435 timed out on the watcher event of the
 * save before the target was watched directly.
 */
export async function scenarioLinkedTargetSave(): Promise<void> {
  const fixture = createFixture("linked-target", {
    "note.md": "---\ntype: note\nrelated: references/target.md\n---\n# Note\n\nBody.\n",
    "references/target.md": target("Original target description"),
  });
  try {
    writeSchema(fixture.directory, "note", NOTE_SCHEMA);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("note.md")));
    const targetPath = fixture.path("references/target.md");
    try {
      await openSidePreview(document);
      await waitForLinked("the preview to show the linked target's excerpt", targetPath, () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === document.uri.toString()
          && preview.phase === "ready"
          && /data-okf-field="related"[^]*?data-okf-link-status="valid"/u.test(preview.html)
          && showsExcerpt("Original target description");
      });
      await saveThenWriteLinkedTarget(targetPath, {
        saved: { source: target("Saved target description"), excerpt: "Saved target description" },
        external: { source: target("Updated target description"), excerpt: "Updated target description" },
      });
    } finally {
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}
