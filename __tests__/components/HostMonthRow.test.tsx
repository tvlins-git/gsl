import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HostMonthRow } from '@/components/HostMonthRow';
import { buildMember } from '../factories';

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const Picker = ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
    <View testID={testID}>{children}</View>
  );
  Picker.Item = ({ label }: { label: string }) => <Text>{label}</Text>;
  return { Picker };
});

describe('HostMonthRow', () => {
  const month = { year: 2026, month: 7, label: 'Jul 2026', isCurrent: true, isNext: false };
  const members = [buildMember({ id: 'm1', display_name: 'Alice' })];

  it('renders month label and current badge', () => {
    render(
      <HostMonthRow month={month} members={members} assignedMemberId={null} onAssign={() => {}} />
    );
    expect(screen.getByText('Jul 2026')).toBeTruthy();
    expect(screen.getByText('Current month')).toBeTruthy();
    expect(screen.getByTestId('host-row-2026-7')).toBeTruthy();
  });
});
