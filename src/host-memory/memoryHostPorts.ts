/**
 * The synchronous and factory ports of the in-memory host: path facts over a
 * {@link MemoryFileSystem}, the render queue and the direct watches of linked targets. Host-neutral:
 * no host API, no DOM, no Node built-ins; a session runs on them without a disk.
 */

import { BuildQueue } from "../core/render/buildQueue";
import type { HostPaths } from "../host-api/hostPaths";
import type { LinkedTargetWatch, LinkedTargetWatcher } from "../host-api/linkedTargets";
import type { RenderQueues } from "../host-api/renderQueues";
import { normalizePosixPath, type MemoryFileSystem } from "./memoryFileSystem";

/** The direct watches of the memory host: armed, and fired by the test through {@link fire}. */
export interface MemoryLinkedTargetWatcher extends LinkedTargetWatcher {
  /** Delivers an event to every open watch of `target`; returns how many were told. */
  fire(target: string): number;
}

export interface MemoryHostPorts {
  paths: HostPaths;
  renderQueues: RenderQueues;
  linkedTargets: MemoryLinkedTargetWatcher;
}

/** Creates the path, render-queue and linked-target ports over `files`. */
export function createMemoryHostPorts(files: MemoryFileSystem, userName?: string): MemoryHostPorts {
  const open = new Map<string, Set<{ onEvent: () => void; watch: LinkedTargetWatch }>>();
  return {
    paths: {
      // No symbolic links in memory: the canonical path is the normalised one.
      canonicalPath: (path) => normalizePosixPath(path),
      sourceExists: (path) => files.fileExists(path),
      userName: () => userName,
    },
    renderQueues: {
      create: (options) => new BuildQueue({ canonicalize: normalizePosixPath, ...options }),
    },
    linkedTargets: {
      watch(target, onEvent) {
        const state: { status: "watching" | "closed"; events: number } = { status: "watching", events: 0 };
        const entry = {
          onEvent: () => { state.events += 1; onEvent(); },
          watch: {
            state: () => ({ ...state }),
            dispose: () => {
              state.status = "closed";
              open.get(target)?.delete(entry);
            },
          } satisfies LinkedTargetWatch,
        };
        const entries = open.get(target) ?? new Set();
        entries.add(entry);
        open.set(target, entries);
        return entry.watch;
      },
      fire(target) {
        const entries = [...open.get(target) ?? []];
        for (const entry of entries) entry.onEvent();
        return entries.length;
      },
    },
  };
}
