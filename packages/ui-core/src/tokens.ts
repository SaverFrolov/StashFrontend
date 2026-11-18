/**
 * Canonical design tokens — single source of truth for web and mobile.
 * Values mirror packages/ui/src/tokens.css exactly; the parity test in
 * tests/tokens-parity.test.ts fails the build if the CSS drifts away.
 *
 * Colors are explicit strings (hex or rgba) so React Native / NativeWind can
 * consume them without CSS variables or calc()/alpha-modifier magic.
 */

export type RgbChannel = [number, number, number];

export function rgba(channel: RgbChannel, alpha: number): string {
  return `rgba(${channel[0]}, ${channel[1]}, ${channel[2]}, ${alpha})`;
}

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  borderStrong: string;
  glassBorder: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  success: string;
  warning: string;
  danger: string;
  /** RGB channels for alpha variants (border-accent/40 etc.) */
  accentRgb: RgbChannel;
  successRgb: RgbChannel;
  warningRgb: RgbChannel;
  dangerRgb: RgbChannel;
  shadowPop: string;
  shadowGlow: string;
  aurora: AuroraStop[];
}

export interface AuroraStop {
  color: string;
  /** centre position as fractions of viewport width/height (may be negative / >1) */
  at: [number, number];
  /** radii in px (rem * 16 from the CSS) */
  size: [number, number];
}

export const lightTokens: ThemeTokens = {
  bg: "#EAF2EC",
  surface: "rgba(244, 250, 246, 0.66)",
  surfaceSubtle: "rgba(234, 244, 237, 0.45)",
  border: "rgba(14, 124, 102, 0.14)",
  borderStrong: "rgba(14, 124, 102, 0.28)",
  glassBorder: "rgba(14, 124, 102, 0.18)",
  text: "#12211B",
  textSecondary: "#46554E",
  textTertiary: "#5F6F67",
  accent: "#0E7C66",
  accentHover: "#0A6552",
  accentSubtle: "rgba(14, 124, 102, 0.12)",
  success: "#1A7F4B",
  warning: "#9A6700",
  danger: "#B42318",
  accentRgb: [14, 124, 102],
  successRgb: [26, 127, 75],
  warningRgb: [154, 103, 0],
  dangerRgb: [180, 35, 24],
  shadowPop: "0 8px 32px rgba(10, 45, 35, 0.18)",
  shadowGlow: "0 4px 18px rgba(14, 124, 102, 0.4)",
  aurora: [
    { color: "rgba(16, 185, 129, 0.28)", at: [0.08, -0.08], size: [800, 512] },
    { color: "rgba(5, 150, 105, 0.2)", at: [0.92, 0.06], size: [736, 480] },
    { color: "rgba(134, 239, 172, 0.4)", at: [0.45, 1.12], size: [672, 576] },
  ],
};

export const darkTokens: ThemeTokens = {
  bg: "#0A120E",
  surface: "rgba(22, 34, 28, 0.55)",
  surfaceSubtle: "rgba(30, 44, 37, 0.45)",
  border: "rgba(63, 181, 155, 0.12)",
  borderStrong: "rgba(63, 181, 155, 0.22)",
  glassBorder: "rgba(63, 181, 155, 0.16)",
  text: "#E9F0EA",
  textSecondary: "#A5B4AA",
  textTertiary: "#85938A",
  accent: "#3FB59B",
  accentHover: "#5CC7AF",
  accentSubtle: "rgba(63, 181, 155, 0.16)",
  success: "#4CC38A",
  warning: "#E3B341",
  danger: "#F97066",
  accentRgb: [63, 181, 155],
  successRgb: [76, 195, 138],
  warningRgb: [227, 179, 65],
  dangerRgb: [249, 112, 102],
  shadowPop: "0 8px 32px rgba(0, 0, 0, 0.55)",
  shadowGlow: "0 4px 18px rgba(63, 181, 155, 0.35)",
  aurora: [
    { color: "rgba(63, 181, 155, 0.18)", at: [0.08, -0.08], size: [800, 512] },
    { color: "rgba(16, 185, 129, 0.12)", at: [0.92, 0.06], size: [736, 480] },
    { color: "rgba(6, 95, 70, 0.3)", at: [0.45, 1.12], size: [672, 576] },
  ],
};

export const themes = { light: lightTokens, dark: darkTokens } as const;
export type ThemeName = keyof typeof themes;

/** Bright green outline (web: border-accent/40) for date chips, search rows, dot-menus, dropdowns. */
export function accentOutline(theme: ThemeName, alpha = 0.4): string {
  return rgba(themes[theme].accentRgb, alpha);
}

/** Shape */
export const radii = {
  control: 10,
  card: 14,
  dialog: 18,
} as const;

/** Glass treatment (web: blur 20px + saturate 160%; Android compensates saturate
 *  with a richer green tint overlay — see migration plan). */
export const glass = {
  blurPx: 20,
  saturate: 1.6,
} as const;

/** Spacing scale, base unit 4px. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/** Type scale: [fontSize, lineHeight] in px. */
export const typography = {
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 13, lineHeight: 18 },
  base: { size: 14, lineHeight: 20 },
  md: { size: 16, lineHeight: 24 },
  lg: { size: 18, lineHeight: 26 },
  xl: { size: 22, lineHeight: 28 },
  xxl: { size: 28, lineHeight: 34 },
  reading: { size: 16, lineHeight: 26 },
} as const;

export const fontWeights = { normal: "400", medium: "500", semibold: "600" } as const;

/** Motion: transitions 150ms, condensed-bar morph 220ms, ease-out; reduced-motion = instant. */
export const motion = {
  fastMs: 150,
  morphMs: 220,
  easing: "ease-out",
} as const;

/** Layout (px on web; dp on mobile). */
export const layout = {
  headerHeight: 56, // web --header-h: 3.5rem
  sidebarWidth: 264,
  sidebarRailWidth: 64,
  feedMaxWidth: 720,
  detailMaxWidth: 760,
  settingsMaxWidth: 640,
  authFormMaxWidth: 400,
  /** mobile split view (feed + detail) threshold in dp */
  tabletSplitMinWidth: 840,
} as const;

/** Touch targets: >=44dp (48 preferred); compact filter bar >=32dp. */
export const touchTargets = {
  min: 44,
  preferred: 48,
  compactMin: 32,
} as const;

/** Condensing filter bar hysteresis thresholds (px) — same on web and mobile. */
export const condenseThresholds = {
  enter: 80,
  exit: 24,
} as const;
