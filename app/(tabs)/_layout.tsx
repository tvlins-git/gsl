import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { GslNavTitle } from '@/components/GslNavTitle';
import { APP_NAME } from '@/constants/brand';
import { theme } from '@/constants/theme';
import { SettingsAuthRedirect } from '@/components/SettingsAuthRedirect';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { loading, loggedOut, member } = useAuth();
  const hideTabBar = !loading && loggedOut && !member;

  return (
    <>
      <SettingsAuthRedirect />
      <Tabs
      screenOptions={{
        // The bar itself is always the light surface. Dark-mode tint is white,
        // which hides the selected tab on that bar.
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: hideTabBar
          ? { display: 'none', height: 0, overflow: 'hidden' }
          : {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              borderTopWidth: 0.5,
              paddingTop: 6,
              height: Platform.OS === 'ios' ? 88 : 64,
            },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: () => <GslNavTitle title={APP_NAME} />,
          tabBarLabel: 'Feed',
          tabBarAccessibilityLabel: 'Feed',
          href: hideTabBar ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={{ ios: 'house', android: 'home', web: 'home' }}
              tintColor={focused ? theme.colors.primary : theme.colors.textMuted}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: `${APP_NAME} · Photos`,
          headerTitle: () => <GslNavTitle suffix="Photos" />,
          tabBarLabel: 'Photos',
          tabBarAccessibilityLabel: 'Photos',
          href: hideTabBar ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
              tintColor={focused ? theme.colors.primary : theme.colors.textMuted}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: `${APP_NAME} · Plan`,
          headerTitle: () => <GslNavTitle suffix="Plan" />,
          tabBarLabel: 'Plan',
          href: hideTabBar ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={{ ios: 'calendar', android: 'event', web: 'event' }}
              tintColor={focused ? theme.colors.primary : theme.colors.textMuted}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: `${APP_NAME} · Chat`,
          headerTitle: () => <GslNavTitle suffix="Chat" />,
          tabBarLabel: 'Chat',
          href: hideTabBar ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={{ ios: 'message', android: 'chat', web: 'chat' }}
              tintColor={focused ? theme.colors.primary : theme.colors.textMuted}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="hosts"
        options={{
          title: `${APP_NAME} · Hosts`,
          headerTitle: () => <GslNavTitle suffix="Hosts" />,
          tabBarLabel: 'Hosts',
          tabBarAccessibilityLabel: 'Hosts',
          href: hideTabBar ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={{ ios: 'person.2', android: 'group', web: 'group' }}
              tintColor={focused ? theme.colors.primary : theme.colors.textMuted}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: hideTabBar ? `${APP_NAME} · Login` : `${APP_NAME} · Profile`,
          headerTitle: () => <GslNavTitle suffix={hideTabBar ? 'Login' : 'Profile'} />,
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }}
              tintColor={focused ? theme.colors.primary : theme.colors.textMuted}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
