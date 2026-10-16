import { Tabs } from 'expo-router'
import { Platform, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'

import { colors, space, type } from '@/constants/theme'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0)

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingTop: space.xs,
          paddingBottom: Math.max(insets.bottom, space.sm),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          ...type.bodyStrong,
          fontSize: 17,
          color: colors.text,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'figure.run', android: 'directions_run', web: 'directions_run' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'trophy', android: 'emoji_events', web: 'emoji_events' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gift', android: 'card_giftcard', web: 'card_giftcard' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.circle', android: 'person', web: 'person' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  )
}
