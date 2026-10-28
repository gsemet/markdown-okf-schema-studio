/**
 * The vocabulary of frontmatter links: resolutions, syntaxes, statuses and the result and option
 * shapes. Pure types and constants, shared by `fileLinks.ts` (the inspection) and
 * `okfFrontmatter.ts` (which calls it), so neither imports the other for them.
 */

import type { MarkdownStemIndex } from "./stemIndex";

export const FILE_LINK_RESOLUTIONS = [
  "document-relative",
  "bundle-relative",
  "bundle-relative-stem",
  "project-relative",
  "filename-stem",
] as const;

export const FILE_LINK_SYNTAXES = ["plain", "wikilink"] as const;

export type FileLinkResolution = typeof FILE_LINK_RESOLUTIONS[number];
export type FileLinkSyntax = typeof FILE_LINK_SYNTAXES[number];
export type FileLinkStatus = "valid" | "invalid" | "unavailable" | "pending";

export interface FrontmatterLinkResult {
  value: unknown;
  fieldPath: string;
  arrayIndex: number | undefined;
  basenameMarker?: string;
  idMarker?: string;
  tooltipFields?: Record<string, string>;
  previewFields?: Record<string, string>;
  markerLine?: number;
  syntax: FileLinkSyntax | undefined;
  resolution: FileLinkResolution | undefined;
  target: string | undefined;
  normalizedTarget: string | undefined;
  resolvedPath: string | undefined;
  workspaceRelativePath?: string;
  query: string | undefined;
  fragment: string | undefined;
  label: string | undefined;
  status: FileLinkStatus;
  code: "E10" | "W15" | undefined;
  severity: "error" | "warning" | undefined;
  message: string;
}

export interface FileLinkInspectionOptions {
  filePath: string;
  bundleRoot?: string;
  projectRoot?: string;
  workspaceRoots?: readonly string[];
  schemaDirectory?: string;
  resolveTargets?: boolean;
  stemIndex?: MarkdownStemIndex;
  allowOutsideWorkspaceLinks?: boolean;
}

export interface FrontmatterLinkRoots {
  bundleRoot: string | undefined;
  projectRoot: string | undefined;
  filenameRoots: readonly string[];
  navigationRoots: readonly string[];
}
