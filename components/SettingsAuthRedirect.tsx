import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export function SettingsAuthRedirect() {
  const { member, loading, loggedOut } = useAuth();

  if (!loading && loggedOut && !member) {
    return <Redirect href="/(tabs)/settings" />;
  }

  return null;
}
