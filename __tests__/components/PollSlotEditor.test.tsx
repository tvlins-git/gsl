import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PollSlotEditor, type DraftSlot } from '@/components/PollSlotEditor';

function Harness({ onPickerInteractionChange }: { onPickerInteractionChange?: (active: boolean) => void }) {
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  return (
    <PollSlotEditor
      slots={slots}
      onSlotsChange={setSlots}
      onPickerInteractionChange={onPickerInteractionChange}
    />
  );
}

describe('PollSlotEditor', () => {
  it('shows a scrollable time wheel instead of a nested native spinner', () => {
    render(<Harness />);
    expect(screen.getByText('Start time (2 h slot)')).toBeTruthy();
    expect(screen.getByTestId('time-wheel-picker')).toBeTruthy();
    expect(screen.getByTestId('time-wheel-hours')).toBeTruthy();
    expect(screen.getByTestId('time-wheel-minutes')).toBeTruthy();
  });

  it('shows a full month grid with readable day labels on iOS', () => {
    render(<Harness />);
    expect(screen.getByTestId('month-calendar')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Sun')).toBeTruthy();
    expect(screen.queryByTestId('datetime-picker')).toBeNull();
    const today = new Date().getDate();
    expect(screen.getByTestId(`calendar-day-${today}`)).toBeTruthy();
  });

  it('collapses the month grid after a day is chosen so the sheet can scroll', () => {
    render(<Harness />);
    const today = new Date().getDate();
    fireEvent.press(screen.getByTestId(`calendar-day-${today}`));
    expect(screen.queryByTestId('month-calendar')).toBeNull();
    expect(screen.getByTestId('expand-poll-date')).toBeTruthy();
    expect(screen.getByText('Change')).toBeTruthy();
  });

  it('collapses the month grid after adding a slot', () => {
    render(<Harness />);
    expect(screen.getByTestId('month-calendar')).toBeTruthy();
    fireEvent.press(screen.getByTestId('add-poll-slot'));
    expect(screen.getByText('1 slot added')).toBeTruthy();
    expect(screen.queryByTestId('month-calendar')).toBeNull();
    expect(screen.getByTestId('expand-poll-date')).toBeTruthy();
  });

  it('re-expands the month grid from the compact date row', () => {
    render(<Harness />);
    fireEvent.press(screen.getByTestId('add-poll-slot'));
    fireEvent.press(screen.getByTestId('expand-poll-date'));
    expect(screen.getByTestId('month-calendar')).toBeTruthy();
  });

  it('adds a 2-hour slot from the selected start time', () => {
    render(<Harness />);
    fireEvent.press(screen.getByTestId('add-poll-slot'));
    expect(screen.getByText('1 slot added')).toBeTruthy();
    expect(screen.getByTestId('remove-slot-0')).toBeTruthy();
  });
});
