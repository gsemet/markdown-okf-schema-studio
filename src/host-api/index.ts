/**
 * The host API: the ports the host-neutral core uses to reach a host (02-multi-host §3.2), and
 * the bundle of them a host provides. Host-neutral: the files of this folder import no host API,
 * no DOM and no Node built-ins. Implementations live with each host (`src/host-vscode/`,
 * `src/host-memory/`) and in `src/node-services/` for the parts Node provides.
 */

import type { HostCapabilities } from "./capabilities";
import type { Diagnostics } from "./diagnostics";
import type { DocumentStore } from "./documentStore";
import type { FileSystem } from "./fileSystem";
import type { HostUi } from "./hostUi";
import type { Navigation } from "./navigation";
import type { ProcessRunner } from "./processRunner";
import type { Settings } from "./settings";
import type { VcsInfo } from "./vcsInfo";
import type { Watcher } from "./watcher";
import type { WorkspaceInfo } from "./workspaceInfo";

export type { AssetResolver } from "./assetResolver";
export type { HostCapabilities } from "./capabilities";
export type { DiagnosticEntry, Diagnostics, DiagnosticSeverity, DiagnosticsSink } from "./diagnostics";
export type {
  ApplyEditOptions,
  DocumentChange,
  DocumentContentChange,
  DocumentStore,
  EndOfLine,
  HostDocument,
  TextEdit,
  TextPosition,
  TextRange,
} from "./documentStore";
export { EventSource, type Disposable, type HostEvent } from "./events";
export { isFileNotFound, readTextFile, type FileKind, type FileStat, type FileSystem } from "./fileSystem";
export type { HostUi, PickedFile, PickFileOptions } from "./hostUi";
export type { Navigation } from "./navigation";
export type { ProcessOptions, ProcessResult, ProcessRunner } from "./processRunner";
export type { Settings, SettingsChange, SettingsSection } from "./settings";
export type { HeadText, VcsInfo } from "./vcsInfo";
export type { FileWatcher, Watcher } from "./watcher";
export type { FileSearch, WorkspaceFolderInfo, WorkspaceInfo } from "./workspaceInfo";

/** Every port a host provides, with its capabilities. */
export interface HostServices {
  readonly capabilities: HostCapabilities;
  readonly documents: DocumentStore;
  readonly files: FileSystem;
  readonly settings: Settings;
  readonly workspace: WorkspaceInfo;
  readonly ui: HostUi;
  readonly vcs: VcsInfo;
  readonly diagnostics: Diagnostics;
  readonly watcher: Watcher;
  readonly processes: ProcessRunner;
  readonly navigation: Navigation;
}
