/**
 * Feature introductions: a notice that tells the reader about a new behaviour once, never again,
 * across sessions and workspaces. The record is one key per introduction in the host's global store.
 * A feature adds one entry to {@link FEATURE_INTRODUCTIONS}. Host-neutral: ports only.
 */

import type { HostUi } from "../host-api/hostUi";
import type { KeyValueStore } from "../host-api/keyValueStore";
import { fireAndForget, type Logger } from "../host-api/logger";

/** The prefix of the store key of every introduction. */
const INTRODUCTION_KEY_PREFIX = "markdownOkfSchemaStudio.introductions.";

/** The introductions of a list by id, with the message each one shows (plain text, no button). */
export type IntroductionList = Readonly<Record<string, string>>;

/**
 * The introductions the extension ships: none today. A feature adds one entry (id, message); the
 * mechanism and the command "Show Feature Introductions Again" stay.
 */
export const FEATURE_INTRODUCTIONS = {} as const satisfies IntroductionList;

/** The shown-once record and the notice of the feature introductions. */
export class FeatureIntroductions<List extends IntroductionList = IntroductionList> {
  /** The introductions shown or marked in this session, whatever the store did with them. */
  private readonly seen = new Set<string>();

  public constructor(
    private readonly introductions: List,
    private readonly store: KeyValueStore,
    private readonly ui: HostUi,
    private readonly logger: Logger,
  ) {}

  // @implements_req SwRS-MDOKFSTUDIO-LIFE-176
  /**
   * Shows an introduction the first time: the key is stored first, then the message is shown, so a
   * notice that closes or disappears is never shown again. A failed store write is logged and the
   * message still shows once in this session. Returns whether the message was shown.
   */
  public async showOnce(id: keyof List & string): Promise<boolean> {
    if (!(await this.markShown(id))) return false;
    fireAndForget(this.logger, this.ui.showInformation(this.introductions[id] as string), "showInformation");
    return true;
  }

  /** Records an introduction as shown without showing it. */
  public async markShown(id: keyof List & string): Promise<boolean> {
    const key = INTRODUCTION_KEY_PREFIX + id;
    if (this.seen.has(id) || this.store.get<boolean>(key) === true) {
      this.seen.add(id);
      return false;
    }
    this.seen.add(id);
    try {
      await this.store.update(key, true);
    } catch (error) {
      this.logger.error(`Could not remember the introduction ${id}.`, error);
    }
    return true;
  }

  /** Forgets every introduction: each one shows once more. */
  public async resetAll(): Promise<void> {
    this.seen.clear();
    for (const key of this.store.keys().filter((candidate) => candidate.startsWith(INTRODUCTION_KEY_PREFIX))) {
      try {
        await this.store.update(key, undefined);
      } catch (error) {
        this.logger.error(`Could not forget the introduction ${key}.`, error);
      }
    }
  }
}
