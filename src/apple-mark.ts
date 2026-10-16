/** SVG view box for {@link APPLE_MARK_PATH}. */
export const APPLE_MARK_VIEW_BOX = '0 0 24 24'

/**
 * HIG-like bitten apple used by `AppleLogo` and the docs playground.
 * Coordinates match a 24x24 view box so the mark is not clipped into a pin.
 */
export const APPLE_MARK_PATH =
  'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'

/** SVG markup of the Apple mark filled with `color`. */
export function appleMarkSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${APPLE_MARK_VIEW_BOX}"><path fill="${color}" d="${APPLE_MARK_PATH}"/></svg>`
}

/** {@link appleMarkSvg} as a `data:image/svg+xml` URI. */
export function appleMarkDataUri(color: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(appleMarkSvg(color))}`
}

/** Clean alpha silhouette of {@link APPLE_MARK_PATH} for native `tintColor`. */
export const APPLE_MARK_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAABWUlEQVR42u3ciY3DQAxD0WiQ/lvWthBk4YyO9yvQkKLkA/brBQAAAAAAgC3EwjNnpfO/F4peijfh73KIz4C14k814FPxgwGLO3/DDmBA4e4PBmCUAS27f2MCQgKIP86A7Cr+lgSUfuL7JjwD1okOHfPTJZqVNYniwv+n5uygTTQS/pP6s5tG0VT4MaP6EP9u/Yf4d89xiH/3PN4HXN4FR/ffXcSH+DuugojPgJr3SU8YkHyTgDZPCRgwLAGp+yXADgADWowfBkgAGMAABuDivQwDJIABYMDePcCAYQkIKZCAViYwwBLenYLoGt1LhAQMSwMDvjMhqxvga0UJYMBkooMBxpAE1G+s06lYCUDLGzEpkIC6jXQ6F99d/F8nwCgyguo1zpl0mI71nomHMoJmmDD+I73YLn4VEfKB+rOLJlW68Mmfb5f+sXe1MZAP1pkuDAAAAAAAwHL+AAaEKpr5qOAuAAAAAElFTkSuQmCC'
