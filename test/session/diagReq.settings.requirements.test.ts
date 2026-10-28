/**
 * Requirement tests of the settings-change handler of the host events (`HostEvents.onSettingsChanged`):
 * which sections trigger work and what the open previews do. The manager is a recording fake; the
 * settings readers are the real ones.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { HostEvents } from "../../src/session/hostEvents";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///notes/doc.md";

interface Fixture {
  readonly events: HostEvents;
  readonly session: Record<string, unknown>;
  readonly calls: string[];
  readonly values: Record<string, Record<string, unknown>>;
}

function fixture(options: { lastGood?: boolean; activeIsSession?: boolean } = {}): Fixture {
  const calls: string[] = [];
  const values: Record<string, Record<string, unknown>> = {};
  const session: Record<string, unknown> = {
    documentUri: DOCUMENT,
    queue: { getState: () => ({ lastGood: options.lastGood === false ? undefined : { id: "good" } }) },
  };
  const manager = {
    sessions: () => new Set([session]),
    sharedRenders: { invalidate: () => undefined },
    host: {
      settings: {
        section: (name: string) => ({
          get: (key: string, defaultValue: unknown) => values[name]?.[key] ?? defaultValue,
        }),
      },
      editors: { active: () => ({ document: { id: options.activeIsSession === false ? "file:///other.md" : DOCUMENT } }) },
    },
    view: { postShowComments: () => calls.push("showComments") },
    incoming: { schedule: (_session: unknown, delay: number) => calls.push(`incoming:${delay}`) },
    frontmatter: { refresh: () => calls.push("frontmatter.refresh") },
    rendering: {
      refreshPreviewDocument: () => {
        calls.push("render");
        return Promise.resolve();
      },
      updatePreview: (_session: unknown, lastGood: unknown) => calls.push(`update:${JSON.stringify(lastGood)}`),
    },
  };
  const events = new HostEvents(manager as unknown as PreviewManager);
  return { events, session, calls, values };
}

const affecting = (...sections: string[]) => ({
  affects: (section: string) => sections.includes(section),
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-024
test("a plantuml setting change reads the settings again and renders the open document again", () => {
  const { events, session, calls, values } = fixture();
  values["markdownOkfSchemaStudio.plantuml"] = { useJar: true, jarPath: " tools/plantuml.jar " };

  events.onSettingsChanged(affecting("markdownOkfSchemaStudio.plantuml") as never);

  assert.deepEqual(session.plantUmlEngineSettings, { useJar: true });
  assert.deepEqual(session.plantUmlConfiguration, { jarPath: "tools/plantuml.jar" });
  assert.deepEqual(calls, ["frontmatter.refresh", "render"]);

  const other = fixture();
  other.events.onSettingsChanged(affecting("editor.fontSize") as never);
  assert.deepEqual(other.calls, [], "an unrelated section triggers nothing");
  assert.equal(other.session.plantUmlConfiguration, undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-004
test("a frontmatter setting change reads the settings again and analyses the table of the active document only", () => {
  const active = fixture();
  active.values["markdownOkfSchemaStudio.frontmatter"] = { strictAdditionalProperties: true };
  active.events.onSettingsChanged(affecting("markdownOkfSchemaStudio.frontmatter") as never);
  assert.equal((active.session.frontmatterConfiguration as Record<string, unknown>).strictAdditionalProperties, true);
  assert.deepEqual(active.calls, ["frontmatter.refresh", 'update:{"id":"good"}']);

  const inactive = fixture({ activeIsSession: false });
  inactive.values["markdownOkfSchemaStudio.frontmatter"] = { strictAdditionalProperties: true };
  inactive.events.onSettingsChanged(affecting("markdownOkfSchemaStudio.frontmatter") as never);
  assert.equal((inactive.session.frontmatterConfiguration as Record<string, unknown>).strictAdditionalProperties, true);
  assert.deepEqual(inactive.calls, ['update:{"id":"good"}'], "no analysis, only the redraw from the last good render");

  const other = fixture();
  other.events.onSettingsChanged(affecting("files.autoSave") as never);
  assert.deepEqual(other.calls, []);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-002
test("a preview setting change reads the width again and updates the preview from its last good render", () => {
  const open = fixture();
  open.values["markdownOkfSchemaStudio.preview"] = { maxContentWidth: 1200 };
  open.events.onSettingsChanged(affecting("markdownOkfSchemaStudio.preview") as never);
  assert.equal((open.session.configuration as Record<string, unknown>).maxContentWidth, 1200);
  assert.deepEqual(open.calls, ["showComments", "incoming:0", "frontmatter.refresh", 'update:{"id":"good"}']);

  const fresh = fixture({ lastGood: false });
  fresh.values["markdownOkfSchemaStudio.preview"] = { maxContentWidth: 1200 };
  fresh.events.onSettingsChanged(affecting("markdownOkfSchemaStudio.preview") as never);
  assert.equal((fresh.session.configuration as Record<string, unknown>).maxContentWidth, 1200);
  assert.equal(fresh.calls.some((call) => call.startsWith("update:")), false, "nothing to redraw without a last good render");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-027
test("editing a schema file refreshes nothing by itself; the next document change re-analyses the table", () => {
  const calls: string[] = [];
  const session: Record<string, unknown> = {
    disposed: false,
    documentUri: DOCUMENT,
    status: "success",
    probe: { activePathChanges: 0 },
    page: {},
    edits: { active: undefined },
    document: { id: DOCUMENT, revision: 2 },
    queue: { dependsOn: () => false },
  };
  const document = { id: DOCUMENT, revision: 3 };
  const manager = {
    sessions: () => new Set([session]),
    activePathOf: () => "/notes/doc.md",
    pathOf: () => "/notes/doc.md",
    sourceAvailable: () => true,
    canonicalPath: (filePath: string) => filePath,
    host: {
      editors: { active: () => undefined },
      documents: { isApplying: () => false },
    },
    scroll: { shiftAnchorsForEdits: () => undefined },
    comments: { shiftForEdits: () => undefined },
    frontmatter: {
      watchesLinkedTarget: () => false,
      scheduleLinkEnrichment: () => calls.push("enrichment"),
      refresh: () => calls.push("frontmatter.refresh"),
    },
    plantUml: {},
    sharedRenders: { invalidate: () => undefined },
    edits: { deferWhileEditing: () => calls.push("deferred render") },
    rendering: { refreshPreviewDocument: () => { calls.push("render"); return Promise.resolve(); } },
  };
  const events = new HostEvents(manager as unknown as PreviewManager);
  (session.plantUml as unknown) = { includeWatch: { has: () => false } };
  (session as { workspaceRoot?: string }).workspaceRoot = "/notes";

  events.refreshReferencedPath(session as unknown as PreviewSession, "/notes/_schema/Note.schema.yaml");
  assert.deepEqual(calls, [], "a schema file is watched by nobody: the table keeps its result");

  events.onDocumentChanged({
    document,
    changes: [{ start: 0, length: 0, text: "x" }],
    reason: undefined,
  } as never);
  assert.deepEqual(calls, ["frontmatter.refresh", "render"], "any edit of the document analyses the frontmatter again");
});
