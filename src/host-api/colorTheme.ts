/** The `ColorTheme` port: the kind of the host's color theme, which the page follows. */

/** The host's color theme. */
export interface ColorTheme {
  /** The theme kind, as the page reads it: 1 light, 2 dark, 3 high contrast, 4 high contrast light. */
  readonly kind: number;
}
