import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PREVIEW_CONFIGURATION,
  PREVIEW_CONFIGURATION_SECTION,
  readPreviewConfiguration,
} from "../../../src/core/configuration/previewConfiguration";

test("reads independent studio preview settings without stock configuration keys", () => {
  const values = new Map<string, boolean | number>([
    ["scrollPreviewWithEditor", false],
    ["scrollEditorWithPreview", true],
    ["markEditorSelection", true],
    ["doubleClickToSwitchToEditor", true],
    ["maxContentWidth", 1120],
    ["stickyHeadingDepth", 2],
    ["showComments", false],
    ["showIncomingChanges", false],
  ]);
  const sections: string[] = [];
  const configuration = readPreviewConfiguration({
    get<T>(section: string, defaultValue: T): T {
      sections.push(section);
      return (values.get(section) ?? defaultValue) as T;
    },
  });

  assert.deepEqual(configuration, {
    scrollPreviewWithEditor: false,
    scrollEditorWithPreview: true,
    markEditorSelection: true,
    doubleClickToSwitchToEditor: true,
    maxContentWidth: 1120,
    stickyHeadingDepth: 2,
    incrementalUpdates: true,
    showComments: false,
    showIncomingChanges: false,
  });
  assert.deepEqual(new Set(sections), new Set([
    "scrollPreviewWithEditor",
    "scrollEditorWithPreview",
    "markEditorSelection",
    "doubleClickToSwitchToEditor",
    "maxContentWidth",
    "stickyHeadingDepth",
    "incrementalUpdates",
    "showComments",
    "showIncomingChanges",
  ]));
  assert.match(PREVIEW_CONFIGURATION_SECTION, /^markdownOkfSchemaStudio\.preview$/u);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.scrollPreviewWithEditor, true);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.scrollEditorWithPreview, true);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.markEditorSelection, false);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.doubleClickToSwitchToEditor, false);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth, 960);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.stickyHeadingDepth, 3);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.incrementalUpdates, true);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.showComments, true);
  assert.equal(DEFAULT_PREVIEW_CONFIGURATION.showIncomingChanges, true);
});

test("comment chips are shown by default and can be turned off", () => {
  const read = (value?: boolean): boolean => readPreviewConfiguration({
    get<T>(section: string, defaultValue: T): T {
      return (section === "showComments" && value !== undefined ? value : defaultValue) as T;
    },
  }).showComments;
  assert.equal(read(), true);
  assert.equal(read(false), false);
});

test("incremental updates can be turned off and default to on", () => {
  const read = (value?: boolean): boolean => readPreviewConfiguration({
    get<T>(section: string, defaultValue: T): T {
      return (section === "incrementalUpdates" && value !== undefined ? value : defaultValue) as T;
    },
  }).incrementalUpdates;
  assert.equal(read(), true);
  assert.equal(read(true), true);
  assert.equal(read(false), false);
});

test("normalizes preview content width and reserves zero for unlimited", () => {
  const values = new Map<string, number>([
    ["maxContentWidth", 2500],
  ]);
  const configuration = readPreviewConfiguration({
    get<T>(section: string, defaultValue: T): T {
      return (values.get(section) ?? defaultValue) as T;
    },
  });

  assert.equal(configuration.maxContentWidth, 2400);
  assert.equal(readPreviewConfiguration({
    get<T>(_section: string, defaultValue: T): T {
      return 0 as T;
    },
  }).maxContentWidth, 0);
  assert.equal(readPreviewConfiguration({
    get<T>(_section: string, defaultValue: T): T {
      return Number.NaN as T;
    },
  }).maxContentWidth, DEFAULT_PREVIEW_CONFIGURATION.maxContentWidth);
});

test("normalizes sticky heading depth to one through six levels", () => {
  const readDepth = (value: number): number => readPreviewConfiguration({
    get<T>(section: string, defaultValue: T): T {
      return (section === "stickyHeadingDepth" ? value : defaultValue) as T;
    },
  }).stickyHeadingDepth;

  assert.equal(readDepth(0), 1);
  assert.equal(readDepth(2.4), 2);
  assert.equal(readDepth(2.6), 3);
  assert.equal(readDepth(8), 6);
  assert.equal(readDepth(Number.NaN), 3);
});
