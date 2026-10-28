import * as fs from "node:fs";
import * as path from "node:path";

import type { LinkedTargetWatch, LinkedTargetWatcher, LinkedTargetWatchState } from "../host-api/linkedTargets";

export type { LinkedTargetWatch, LinkedTargetWatchState };

function errorText(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code ?? (error instanceof Error ? error.message : String(error));
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-067
/**
 * Watches one linked target file directly through the operating system (inotify, FSEvents),
 * by watching its folder without recursion and keeping the events that name the file.
 *
 * VS Code serves a `createFileSystemWatcher` request for a path inside a workspace folder by
 * reusing the shared recursive workspace watcher, which on Linux can lag behind or miss a write
 * (seen on CI: the event of a save never arrived within 10 s, on main as well). A direct watch on
 * the folder does not depend on it. A save that writes a temporary file and renames it over the
 * target is seen too, since the folder, not the file's inode, is watched.
 *
 * The watch is armed when the function returns (`fs.watch` registers it synchronously), so a write
 * that follows is reported. It never throws: a folder that cannot be watched gives no events and
 * its state says why (the VS Code watcher and the save handler still apply).
 */
export function watchLinkedTargetDirectly(target: string, onEvent: () => void): LinkedTargetWatch {
  const directory = path.dirname(target);
  const filename = path.basename(target);
  let watcher: fs.FSWatcher | undefined;
  const state: LinkedTargetWatchState = { status: "watching", events: 0 };
  const fail = (error: unknown): void => {
    watcher?.close();
    watcher = undefined;
    state.status = "failed";
    state.error = errorText(error);
  };
  try {
    watcher = fs.watch(directory, { persistent: false }, (_event, changed) => {
      // Some platforms do not report the name: any event in the folder may concern the target.
      if (changed === null || changed === undefined || changed.toString() === filename) {
        state.events += 1;
        onEvent();
      }
    });
    watcher.on("error", fail);
  } catch (error) {
    fail(error);
  }
  return {
    state: () => ({ ...state }),
    dispose: () => {
      watcher?.close();
      watcher = undefined;
      if (state.status === "watching") state.status = "closed";
    },
  };
}

/** The direct watches of linked targets of a Node host, as the `LinkedTargetWatcher` port. */
export const nodeLinkedTargetWatcher: LinkedTargetWatcher = { watch: watchLinkedTargetDirectly };
