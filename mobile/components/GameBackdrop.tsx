import { StyleSheet, View, type ViewProps } from 'react-native'
import { colors } from '@/constants/theme'

/** Soft sky wash behind screens — no floating clutter. */
export function GameBackdrop({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <View style={styles.sky} />
      <View style={styles.mid} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sky: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
  },
  mid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: colors.bgSoft,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
})
