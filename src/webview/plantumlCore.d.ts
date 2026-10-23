/** The two functions `@plantuml/core` exports (the package ships no type declarations). */
declare module "@plantuml/core" {
  export interface PlantUmlRenderOptions {
    dark?: boolean;
    /** Pixels; a larger diagram fails with an error (default 8192, 0 disables the check). */
    maxSvgSize?: number;
  }
  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
    options?: PlantUmlRenderOptions | null,
  ): void;
  export function render(lines: string[], targetId: string, options?: PlantUmlRenderOptions | null): void;
}

/** Side-effect scripts that register the bundled `!theme` and OpenIconic (`<&icon>`) data. */
declare module "@plantuml/core/themes.js";
declare module "@plantuml/core/openiconic.js";
