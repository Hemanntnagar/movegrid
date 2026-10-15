import { colors } from './theme'

const tintColorLight = colors.primary
const tintColorDark = '#fff'

export default {
  light: {
    text: colors.text,
    background: colors.bg,
    tint: tintColorLight,
    tabIconDefault: colors.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#0f172a',
    tint: tintColorDark,
    tabIconDefault: colors.muted,
    tabIconSelected: tintColorDark,
  },
}
