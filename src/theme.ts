// Airtable-style editorial design system for the health app.
// Per design.md: white canvas, near-black ink, generous whitespace,
// signature color-block cards, and weight 400/500 typography.

export const colors = {
  // Brand & Accent
  primary: "#181d26",
  "primary-active": "#0d1218",

  // Surfaces
  canvas: "#ffffff",
  "surface-soft": "#f8fafc",
  "surface-strong": "#e0e2e6",
  "surface-dark": "#181d26",
  "surface-dark-elevated": "#1d1f25",

  // Text
  ink: "#181d26",
  body: "#333840",
  muted: "#41454d",
  "border-strong": "#9297a0",
  "on-primary": "#ffffff",

  // Lines
  hairline: "#dddddd",

  // Signature card surfaces (brand voltage)
  "signature-coral": "#aa2d00",
  "signature-forest": "#0a2e0e",
  "signature-cream": "#f5e9d4",
  "signature-peach": "#fcab79",
  "signature-mint": "#a8d8c4",
  "signature-yellow": "#f4d35e",
  "signature-mustard": "#d9a441",

  // Semantic (preserved for health status indicators)
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  link: "#1b61c9",
};

export const typography = {
  // Headings — weight 400/500, never bold
  displayXl: { fontSize: 48, letterSpacing: 0, fontFamily: "Inter_400Regular", fontWeight: "400" as const },
  displayLg: { fontSize: 40, letterSpacing: 0, fontFamily: "Inter_400Regular", fontWeight: "400" as const },
  displayMd: { fontSize: 32, letterSpacing: 0, fontFamily: "Inter_400Regular", fontWeight: "400" as const },
  titleLg: { fontSize: 24, letterSpacing: 0.12, fontFamily: "Inter_400Regular", fontWeight: "400" as const },
  titleMd: { fontSize: 20, letterSpacing: 0, fontFamily: "Inter_400Regular", fontWeight: "400" as const },
  titleSm: { fontSize: 18, letterSpacing: 0, fontFamily: "Inter_500Medium", fontWeight: "500" as const },

  // Body
  labelMd: { fontSize: 16, letterSpacing: 0, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  button: { fontSize: 16, letterSpacing: 0, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  bodyMd: { fontSize: 14, letterSpacing: 0, fontFamily: "Inter_400Regular", fontWeight: "400" as const },
  caption: { fontSize: 14, letterSpacing: 0.16, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  legal: { fontSize: 13.12, letterSpacing: 0, fontFamily: "Inter_600SemiBold", fontWeight: "600" as const },

};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  section: 96,
};

export const radii = {
  xs: 2,
  sm: 6,
  md: 10,
  lg: 12,
  pill: 9999,
  full: 9999,
};

export const theme = {
  colors,
  typography,
  spacing,
  radii,
};
