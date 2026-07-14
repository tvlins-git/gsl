import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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

jest.mock('expo-symbols', () => {
  const { View } = require('react-native');
  return { SymbolView: () => <View /> };
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

  it('hides the remove button when unassigned', () => {
    render(
      <HostMonthRow month={month} members={members} assignedMemberId={null} onAssign={() => {}} />
    );
    expect(screen.queryByTestId('host-remove-2026-7')).toBeNull();
  });

  it('shows the remove button when assigned and clears on press', () => {
    const onAssign = jest.fn();
    render(
      <HostMonthRow month={month} members={members} assignedMemberId="m1" onAssign={onAssign} />
    );
    const removeBtn = screen.getByTestId('host-remove-2026-7');
    fireEvent.press(removeBtn);
    expect(onAssign).toHaveBeenCalledWith(null);
  });

  it('renders the delete button and calls onDelete on press', () => {
    const onDelete = jest.fn();
    render(
      <HostMonthRow
        month={month}
        members={members}
        assignedMemberId={null}
        onAssign={() => {}}
        onDelete={onDelete}
      />
    );
    const deleteBtn = screen.getByTestId('host-delete-2026-7');
    fireEvent.press(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides the delete button when onDelete is not provided', () => {
    render(
      <HostMonthRow month={month} members={members} assignedMemberId={null} onAssign={() => {}} />
    );
    expect(screen.queryByTestId('host-delete-2026-7')).toBeNull();
  });
});
