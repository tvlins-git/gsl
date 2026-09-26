import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TIME_WHEEL_ITEM_HEIGHT, TimeWheelPicker } from '@/components/TimeWheelPicker';

function timeAt(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

describe('TimeWheelPicker', () => {
  it('renders hour and minute wheels at the current value', () => {
    render(<TimeWheelPicker value={timeAt(17, 0)} onChange={() => {}} />);
    expect(screen.getByTestId('time-wheel-picker')).toBeTruthy();
    expect(screen.getByTestId('time-wheel-hours')).toBeTruthy();
    expect(screen.getByTestId('time-wheel-minutes')).toBeTruthy();
    expect(screen.getAllByText('17').length).toBeGreaterThan(0);
    expect(screen.getAllByText('00').length).toBeGreaterThan(0);
  });

  it('does not move the value until the hour wheel settles', () => {
    const onChange = jest.fn();
    render(<TimeWheelPicker value={timeAt(17, 0)} onChange={onChange} />);
    fireEvent(screen.getByTestId('time-wheel-hours'), 'scrollBeginDrag');
    fireEvent.scroll(screen.getByTestId('time-wheel-hours'), {
      nativeEvent: { contentOffset: { y: 19 * TIME_WHEEL_ITEM_HEIGHT } },
    });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent(screen.getByTestId('time-wheel-hours'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 19 * TIME_WHEEL_ITEM_HEIGHT } },
    });
    expect(onChange).toHaveBeenCalled();
    expect((onChange.mock.calls[0][0] as Date).getHours()).toBe(19);
  });

  it('commits a new hour when the hour wheel settles', () => {
    const onChange = jest.fn();
    render(<TimeWheelPicker value={timeAt(17, 0)} onChange={onChange} />);
    fireEvent(screen.getByTestId('time-wheel-hours'), 'scrollBeginDrag');
    fireEvent(screen.getByTestId('time-wheel-hours'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 18 * TIME_WHEEL_ITEM_HEIGHT } },
    });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(18);
    expect(next.getMinutes()).toBe(0);
  });

  it('commits a new minute when the minute wheel settles', () => {
    const onChange = jest.fn();
    render(<TimeWheelPicker value={timeAt(17, 0)} onChange={onChange} />);
    fireEvent(screen.getByTestId('time-wheel-minutes'), 'scrollBeginDrag');
    fireEvent(screen.getByTestId('time-wheel-minutes'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 30 * TIME_WHEEL_ITEM_HEIGHT } },
    });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(17);
    expect(next.getMinutes()).toBe(30);
  });

  it('locks the parent scroll while a wheel is being dragged', () => {
    const onInteractionChange = jest.fn();
    render(
      <TimeWheelPicker value={timeAt(17, 0)} onChange={() => {}} onInteractionChange={onInteractionChange} />
    );
    fireEvent(screen.getByTestId('time-wheel-hours'), 'scrollBeginDrag');
    expect(onInteractionChange).toHaveBeenCalledWith(true);
    fireEvent(screen.getByTestId('time-wheel-hours'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 17 * TIME_WHEEL_ITEM_HEIGHT } },
    });
    expect(onInteractionChange).toHaveBeenCalledWith(false);
  });
});
