/**
 * The text of a file at Git HEAD, read through the optional built-in Git extension ("vscode.git",
 * API version 1). There is no hard dependency and no process is spawned: when the extension, the
 * repository or the file in HEAD is missing, the answer is `undefined`. This module does not import
 * `vscode`; the caller passes the extension (a fake in tests).
 */

export const MAX_BASELINE_BYTES = 1024 * 1024;
const MAX_CACHE_ENTRIES = 64;

export interface GitRepositoryLike {
  show(ref: string, path: string): Promise<string>;
  /** Optional: older Git extensions may lack it. */
  getConfig?(key: string): Promise<string>;
  state: {
    HEAD?: { commit?: string };
    onDidChange(listener: () => void): { dispose(): void };
  };
}

export interface GitApiLike<U> {
  getRepository(uri: U): GitRepositoryLike | null;
}

export interface GitExtensionLike<U> {
  isActive: boolean;
  activate(): PromiseLike<unknown>;
  exports: { getAPI(version: 1): GitApiLike<U> };
}

export interface HeadBaseline<U> {
  /** The file at HEAD and the commit it was read at; undefined when there is nothing to compare. */
  read(uri: U, currentLength: number): Promise<{ commit: string; text: string } | undefined>;
  /** The Git `user.name` that applies to the file's repository; undefined when unknown. */
  userName(uri: U): Promise<string | undefined>;
  /**
   * Calls `listener` with the new commit id whenever the HEAD commit of the file's repository
   * changes (other state changes are ignored). Undefined when there is no repository.
   */
  watch(uri: U, listener: (commit: string | undefined) => void): { dispose(): void } | undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-203
export function createHeadBaseline<U extends { scheme: string; fsPath: string }>(
  getExtension: () => GitExtensionLike<U> | undefined,
): HeadBaseline<U> {
  const cache = new Map<string, string>();

  const repositoryOf = (uri: U): GitRepositoryLike | undefined => {
    try {
      const extension = getExtension();
      if (!extension || !extension.isActive) return undefined;
      return extension.exports.getAPI(1).getRepository(uri) ?? undefined;
    } catch {
      return undefined;
    }
  };

  return {
    async read(uri, currentLength) {
      if (uri.scheme !== "file" || currentLength > MAX_BASELINE_BYTES) return undefined;
      try {
        const extension = getExtension();
        if (!extension) return undefined;
        if (!extension.isActive) await extension.activate();
        const repository = repositoryOf(uri);
        const commit = repository?.state.HEAD?.commit;
        if (!repository || !commit) return undefined;
        const key = `${commit}\0${uri.fsPath}`;
        let text = cache.get(key);
        if (text === undefined) {
          text = await repository.show("HEAD", uri.fsPath);
          if (typeof text !== "string" || text.length > MAX_BASELINE_BYTES) return undefined;
          if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
          cache.set(key, text);
        }
        return { commit, text };
      } catch {
        // The file is not in HEAD (untracked) or Git failed: show nothing.
        return undefined;
      }
    },
    // @implements_req SwRS-MDOKFSTUDIO-REVIEW-065
    async userName(uri) {
      if (uri.scheme !== "file") return undefined;
      try {
        const extension = getExtension();
        if (!extension) return undefined;
        if (!extension.isActive) await extension.activate();
        const repository = repositoryOf(uri);
        if (!repository || typeof repository.getConfig !== "function") return undefined;
        const name = await repository.getConfig("user.name");
        const trimmed = typeof name === "string" ? name.trim() : "";
        return trimmed === "" ? undefined : trimmed;
      } catch {
        return undefined;
      }
    },
    watch(uri, listener) {
      const repository = repositoryOf(uri);
      if (!repository) return undefined;
      let last = repository.state.HEAD?.commit;
      return repository.state.onDidChange(() => {
        const commit = repository.state.HEAD?.commit;
        if (commit === last) return;
        last = commit;
        listener(commit);
      });
    },
  };
}
