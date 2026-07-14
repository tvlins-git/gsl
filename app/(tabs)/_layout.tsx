import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { GslNavTitle } from '@/components/GslNavTitle';
import { APP_NAME } from '@/constants/brand';
import Colors from '@/constants/Colors';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { SettingsAuthRedirect } from '@/components/SettingsAuthRedirect';

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
          borderTopWidth: 1,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', letterSpacing: 2 },
      }}
    >
      <Tabs.Screen
        name="hosts"
        options={{
          title: APP_NAME,
          headerTitle: () => <GslNavTitle suffix="Hosts" />,
          tabBarLabel: 'Hosts',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={24} />
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
        name="photos"
        options={{
          title: `${APP_NAME} · Photos`,
          headerTitle: () => <GslNavTitle suffix="Photos" />,
          tabBarLabel: 'Photos',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} tintColor={color} size={24} />
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
          title: `${APP_NAME} · Settings`,
          headerTitle: () => <GslNavTitle suffix="Settings" />,
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
    </>
  );
}
