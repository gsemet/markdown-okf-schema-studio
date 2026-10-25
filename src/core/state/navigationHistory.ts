/**
 * Navigation history of one preview panel: the places visited by following links, for the Back
 * and Next buttons. Pure; the host keeps one instance per webview panel.
 */

export interface NavigationEntry {
  uri: string;
  line: number;
}

export const NAVIGATION_HISTORY_CAP = 50;

export class NavigationHistory {
  private entries: NavigationEntry[] = [];
  private index = -1;

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-065
  /** Adds a place after the current one; drops forward entries; ignores a duplicate of the current one. */
  push(entry: NavigationEntry): void {
    const current = this.entries[this.index];
    if (current && current.uri === entry.uri && current.line === entry.line) {
      return;
    }
    this.entries = [...this.entries.slice(0, this.index + 1), { ...entry }];
    if (this.entries.length > NAVIGATION_HISTORY_CAP) {
      this.entries = this.entries.slice(this.entries.length - NAVIGATION_HISTORY_CAP);
    }
    this.index = this.entries.length - 1;
  }

  /**
   * Records where the reader is before a jump: updates the line of the current entry when it is
   * the same document (an unknown line keeps the entry's own), otherwise pushes the place.
   */
  depart(place: { uri: string; line?: number }): void {
    const current = this.entries[this.index];
    if (current && current.uri === place.uri) {
      if (place.line !== undefined) {
        current.line = place.line;
      }
      return;
    }
    this.push({ uri: place.uri, line: place.line ?? 1 });
  }

  back(): NavigationEntry | undefined {
    if (!this.canBack()) {
      return undefined;
    }
    this.index -= 1;
    return { ...this.entries[this.index] };
  }

  forward(): NavigationEntry | undefined {
    if (!this.canForward()) {
      return undefined;
    }
    this.index += 1;
    return { ...this.entries[this.index] };
  }

  canBack(): boolean {
    return this.index > 0;
  }

  canForward(): boolean {
    return this.index >= 0 && this.index < this.entries.length - 1;
  }

  snapshot(): { entries: NavigationEntry[]; index: number } {
    return { entries: this.entries.map((entry) => ({ ...entry })), index: this.index };
  }
}
