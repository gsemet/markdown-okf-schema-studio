import * as fs from "node:fs";
import * as path from "node:path";

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
 * Returns a dispose function; it never throws (a folder that cannot be watched just gives no
 * events, the VS Code watcher and the save handler still apply).
 */
export function watchLinkedTargetDirectly(target: string, onEvent: () => void): () => void {
  const directory = path.dirname(target);
  const filename = path.basename(target);
  let watcher: fs.FSWatcher | undefined;
  try {
    watcher = fs.watch(directory, { persistent: false }, (_event, changed) => {
      // Some platforms do not report the name: any event in the folder may concern the target.
      if (changed === null || changed === undefined || changed.toString() === filename) onEvent();
    });
    watcher.on("error", () => {
      watcher?.close();
      watcher = undefined;
    });
  } catch {
    watcher = undefined;
  }
  return () => {
    watcher?.close();
    watcher = undefined;
  };
}
