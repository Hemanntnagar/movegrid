/**
 * Gamified tokens matching frontend/app/globals.css cartoon theme + mobile-ui.css.
 */
export const colors = {
  bg: '#7dd3fc',
  bgMid: '#bae6fd',
  bgSoft: '#bae6fd',
  bgEnd: '#a3e635',
  card: '#fffdf0',
  text: '#0f172a',
  muted: '#334155',
  border: '#0f172a',
  borderSoft: '#d8e4ec',
  primary: '#ff5e97',
  primaryDark: '#0f172a',
  primarySoft: '#ffe4ef',
  accent: '#a3e635',
  accentSoft: '#ecfccb',
  orange: '#ff7b3d',
  orangeSoft: '#ffedd5',
  blue: '#38bdf8',
  blueSoft: '#e0f2fe',
  purple: '#c084fc',
  purpleSoft: '#f3e8ff',
  pink: '#ff72a5',
  pinkSoft: '#fce7f3',
  yellow: '#fde047',
  yellowSoft: '#fef9c3',
  cream: '#fffdf0',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  white: '#ffffff',
  ink: '#0f172a',
  overlay: 'rgba(15, 23, 42, 0.55)',
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
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
} as const

export const type = {
  hero: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.5, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.3, lineHeight: 28 },
  section: { fontSize: 17, fontWeight: '900' as const, letterSpacing: -0.2, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '800' as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '700' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '800' as const, lineHeight: 14 },
  stat: { fontSize: 16, fontWeight: '900' as const, lineHeight: 20 },
  display: { fontSize: 30, fontWeight: '900' as const, letterSpacing: -0.5, lineHeight: 36 },
}

export const touch = {
  minHeight: 48,
} as const

export const layout = {
  screenPadding: 14,
  contentGap: 10,
  maxContentWidth: 480,
  cardPadding: 14,
  tabBarClearance: 28,
} as const

export const inkShadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 3,
} as const

export const cardShadow = inkShadow

export const hairline = {
  borderWidth: 3,
  borderColor: colors.ink,
} as const

export const inkBorder = hairline
