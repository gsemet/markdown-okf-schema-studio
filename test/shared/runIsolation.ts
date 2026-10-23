/**
 * Everything that must be unique per real-window run so that several runs can use the same
 * checkout at the same time: instance id, VS Code user-data and extensions directories, CDP port
 * and evidence folder (the folder name comes from `EvidenceStore`, which uses `instanceId`).
 * No vscode, no playwright: unit-testable.
 */
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

/** Sortable, unique per run: `20261023T031500Z-a1b2c3d4`. */
export function newInstanceId(now: Date = new Date(), random: Buffer = randomBytes(4)): string {
  const stamp = now.toISOString().replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");
  return `${stamp}-${random.toString("hex")}`;
}

/** Instance id from the environment (`STUDIO_E2E_INSTANCE`, set by the runner) or a new one. */
export function instanceIdFromEnvironment(environment: NodeJS.ProcessEnv = process.env): string {
  const value = environment.STUDIO_E2E_INSTANCE;
  return value !== undefined && /^[A-Za-z0-9_-]{6,64}$/u.test(value) ? value : newInstanceId();
}

/** A loopback TCP port nobody listens on right now. */
export function freePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

export interface RunDirectories {
  readonly instanceId: string;
  readonly userDataDirectory: string;
  readonly extensionsDirectory: string;
  dispose(): void;
}

/** Short, still unique tag of an instance for folder names (VS Code sockets live in the user-data dir). */
export function instanceTag(instanceId: string): string {
  return instanceId.slice(-8);
}

/**
 * Parent of the per-launch directories. Short on purpose: VS Code puts Unix sockets below the
 * user-data directory and macOS limits a socket path to about 100 characters, which the long
 * default temporary directory (`/var/folders/...`) would exceed.
 */
export function shortTemporaryRoot(): string {
  return process.platform === "win32" ? os.tmpdir() : "/tmp";
}

/**
 * Fresh user-data and extensions directories for one VS Code launch, named after the instance so a
 * leftover is attributable. `dispose` removes both.
 */
export function createRunDirectories(instanceId: string, parent: string = shortTemporaryRoot()): RunDirectories {
  const userDataDirectory = fs.mkdtempSync(path.join(parent, `studio-${instanceTag(instanceId)}-d-`));
  const extensionsDirectory = fs.mkdtempSync(path.join(parent, `studio-${instanceTag(instanceId)}-x-`));
  return {
    instanceId,
    userDataDirectory,
    extensionsDirectory,
    dispose(): void {
      fs.rmSync(userDataDirectory, { recursive: true, force: true });
      fs.rmSync(extensionsDirectory, { recursive: true, force: true });
    },
  };
}
