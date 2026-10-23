/**
 * What a host can do. Features check a capability and degrade (a message, a disabled button)
 * instead of failing when the host lacks it.
 */

/** The fixed capabilities of a host. Trust is not one of them: it can change (see WorkspaceInfo). */
export interface HostCapabilities {
  /** The host keeps an undo history of document edits. */
  readonly undo: boolean;
  /** The host saves documents itself (dirty state, save command). */
  readonly save: boolean;
  /** The host can start external programs (see ProcessRunner). */
  readonly processes: boolean;
  /** The host reports file changes (see Watcher). */
  readonly watch: boolean;
  /** A text editor can show the document beside the preview (scroll sync, reveal). */
  readonly editorPairing: boolean;
  /** The host has a workspace trust model of its own. */
  readonly trust: boolean;
}
