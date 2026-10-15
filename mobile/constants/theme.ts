export const colors = {
  bg: '#f4f6f8',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primarySoft: '#ecfdf5',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  white: '#ffffff',
}

/** 4px base scale */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
} as const

export const type = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '700' as const },
  section: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  stat: { fontSize: 20, fontWeight: '800' as const },
  display: { fontSize: 28, fontWeight: '800' as const },
}

/** Minimum comfortable tap target */
export const touch = {
  minHeight: 48,
} as const

export const layout = {
  screenPadding: space.lg,
  contentGap: space.md,
  maxContentWidth: 480,
  cardPadding: space.lg,
} as const
