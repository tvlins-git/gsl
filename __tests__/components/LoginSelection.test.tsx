import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSignIn = jest.fn(async () => ({ ok: true as const }));
const mockSignOut = jest.fn(async () => undefined);
const mockRefreshMember = jest.fn(async () => undefined);
const mockApplyMember = jest.fn();

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: () => void) => {
      useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [effect]);
    },
  };
});

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    member: null,
    loggedOut: true,
    signOut: mockSignOut,
    signIn: mockSignIn,
    loading: false,
    localMode: false,
    refreshMember: mockRefreshMember,
    applyMember: mockApplyMember,
  }),
}));

jest.mock('@/lib/group-managed-users', () => ({
  listManagedGroupUsers: jest.fn(async () => [
    {
      id: 'admin-id',
      email: 'admin@example.com',
      displayName: 'Hr. Lins',
      role: 'admin',
      localUserId: 'local-admin',
      localMemberId: 'local-member-admin',
    },
    {
      id: 'diana-id',
      email: 'diana@example.com',
      displayName: 'Diana',
      role: 'member',
      localUserId: 'local-diana',
      localMemberId: 'local-member-diana',
    },
  ]),
}));

jest.mock('@/lib/app-users', () => ({
  createAppUser: jest.fn(),
  deleteAppUser: jest.fn(),
  resolveSignedInAppUser: jest.fn(() => null),
  subscribeAppUsers: jest.fn(() => () => undefined),
}));

jest.mock('@/components/Logo', () => {
  const { View } = require('react-native');
  return { Logo: () => <View testID="logo" /> };
});

jest.mock('@/components/UserOptionRow', () => {
  const { Pressable, Text } = require('react-native');
  return {
    UserOptionRow: ({
      user,
      selected,
      onSelect,
    }: {
      user: { id: string; displayName: string };
      selected: boolean;
      onSelect: () => void;
    }) => (
      <Pressable onPress={onSelect} testID={`user-option-${user.id}`}>
        <Text>
          {user.displayName}
          {selected ? ' (selected)' : ''}
        </Text>
      </Pressable>
    ),
  };
});

import SettingsScreen from '@/app/(tabs)/settings';

describe('Login screen selection', () => {
  it('starts with no user selected and requires a tap before continue', async () => {
    render(<SettingsScreen />);

    await waitFor(() => expect(screen.getByText('Hr. Lins')).toBeTruthy());
    expect(screen.getByText('Select a user')).toBeTruthy();
    expect(screen.queryByText(/Continue as/)).toBeNull();
    expect(screen.queryByText('Hr. Lins (selected)')).toBeNull();

    fireEvent.press(screen.getByTestId('user-option-admin-id'));
    expect(await screen.findByText('Continue as Hr. Lins')).toBeTruthy();
    expect(screen.getByText('Hr. Lins (selected)')).toBeTruthy();
  });
});
