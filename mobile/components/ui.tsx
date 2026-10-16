import type { ReactElement, ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type RefreshControlProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  cardShadow,
  colors,
  hairline,
  layout,
  radius,
  space,
  touch,
  type,
} from '@/constants/theme'

type ScreenScrollProps = {
  children: ReactNode
  contentStyle?: StyleProp<ViewStyle>
  /** When false, skip bottom tab clearance (e.g. login) */
  tabScreen?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
}

/** Consistent scrollable screen shell with safe-area + tab clearance. */
export function ScreenScroll({
  children,
  contentStyle,
  tabScreen = true,
  refreshControl,
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets()
  const bottomPad = tabScreen
    ? layout.tabBarClearance + Math.max(insets.bottom, space.sm)
    : Math.max(insets.bottom, space.xxl)

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}>
        {children}
      </ScrollView>
    </View>
  )
}

export function LoadingState() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

type CardProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  tone?: 'default' | 'soft' | 'accent' | 'orange' | 'blue' | 'purple' | 'yellow'
}

const TONE_BG: Record<NonNullable<CardProps['tone']>, string> = {
  default: colors.card,
  soft: colors.bgSoft,
  accent: colors.accentSoft,
  orange: colors.orangeSoft,
  blue: colors.blueSoft,
  purple: colors.purpleSoft,
  yellow: colors.yellowSoft,
}

export function Card({ children, style, tone = 'default' }: CardProps) {
  return (
    <View style={[styles.card, { backgroundColor: TONE_BG[tone] }, style]}>{children}</View>
  )
}

type BtnProps = PressableProps & {
  label?: string
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  busy?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function Button({
  label,
  children,
  variant = 'primary',
  busy,
  disabled,
  style,
  textStyle,
  ...rest
}: BtnProps) {
  const isDisabled = Boolean(disabled || busy)
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        pressed && !isDisabled && styles.btnPressed,
        isDisabled && styles.btnDisabled,
        style,
      ]}
      {...rest}>
      {busy ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.white}
        />
      ) : children ? (
        children
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === 'secondary' && styles.btnTextSecondary,
            variant === 'ghost' && styles.btnTextGhost,
            variant === 'danger' && styles.btnTextDanger,
            textStyle,
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <Text style={styles.emptyText}>{message}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.screenPadding,
    gap: layout.contentGap,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: layout.screenPadding,
  },
  card: {
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: space.sm,
    ...hairline,
    ...cardShadow,
    overflow: 'hidden',
  },
  btn: {
    minHeight: touch.minHeight,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnSecondary: {
    backgroundColor: colors.card,
    ...hairline,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: colors.primaryDark,
  },
  btnTextGhost: {
    color: colors.primaryDark,
  },
  btnTextDanger: {
    color: colors.danger,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    ...type.label,
    color: colors.danger,
  },
  sectionTitle: {
    ...type.section,
    color: colors.text,
    marginTop: space.xs,
  },
  emptyText: {
    ...type.body,
    color: colors.muted,
  },
})
