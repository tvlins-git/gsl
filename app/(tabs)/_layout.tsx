import { SymbolView } from 'expo-symbols';
import { router, Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { GslNavTitle } from '@/components/GslNavTitle';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { APP_NAME } from '@/constants/brand';
import Colors from '@/constants/Colors';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { SettingsAuthRedirect } from '@/components/SettingsAuthRedirect';

function HostsHeaderLink() {
  return (
    <Pressable
      onPress={() => router.push('/hosts')}
      testID="header-hosts-btn"
      accessibilityRole="button"
      accessibilityLabel="Hosts"
      style={styles.headerLink}
    >
      <Text style={styles.headerLinkText}>Hosts</Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <SettingsAuthRedirect />
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
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
          headerRight: () => <HostsHeaderLink />,
          tabBarLabel: 'Feed',
          tabBarAccessibilityLabel: 'Feed',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={24} />
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
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
              tintColor={color}
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
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: `${APP_NAME} · Chat`,
          headerTitle: () => <GslNavTitle suffix="Chat" />,
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'message', android: 'chat', web: 'chat' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: `${APP_NAME} · Profile`,
          headerTitle: () => <GslNavTitle suffix="Profile" />,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="hosts"
        options={{
          href: null,
          title: `${APP_NAME} · Hosts`,
          headerTitle: () => <GslNavTitle suffix="Hosts" />,
          headerLeft: () => <HeaderBackButton fallbackHref="/" />,
        }}
      />
    </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  headerLink: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerLinkText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
