/**
 * MOVEGRID mobile design tokens — clean, modern, consistent.
 * Soft brand accents (lime / sky) without heavy cartoon chrome.
 */
export const colors = {
  bg: '#EAF6FF',
  bgSoft: '#F5FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#D8E4EC',
  borderStrong: '#0F172A',
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primarySoft: '#CCFBF1',
  accent: '#84CC16',
  accentSoft: '#ECFCCB',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  blue: '#0EA5E9',
  blueSoft: '#E0F2FE',
  purple: '#A855F7',
  purpleSoft: '#F3E8FF',
  pink: '#EC4899',
  pinkSoft: '#FCE7F3',
  yellow: '#EAB308',
  yellowSoft: '#FEF9C3',
  cream: '#FFFEF7',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  white: '#FFFFFF',
  ink: '#0F172A',
  overlay: 'rgba(15, 23, 42, 0.45)',
}

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
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
} as const

export const type = {
  hero: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.4, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, lineHeight: 28 },
  section: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
  stat: { fontSize: 18, fontWeight: '800' as const, lineHeight: 22 },
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 38 },
}

export const touch = {
  minHeight: 48,
} as const

export const layout = {
  screenPadding: space.lg,
  contentGap: space.md,
  maxContentWidth: 480,
  cardPadding: space.lg,
  /** Extra scroll padding so last items clear the tab bar */
  tabBarClearance: 28,
} as const

/** Soft elevation for cards */
export const cardShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const

export const hairline = {
  borderWidth: 1,
  borderColor: colors.border,
} as const
