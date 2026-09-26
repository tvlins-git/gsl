import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PollThreadSheet } from '@/components/PollThreadSheet';
import { PollThreadLink } from '@/components/PollThreadLink';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: () => true,
  localStore: {},
}));

describe('PollThreadSheet', () => {
  it('starts a thread that includes everyone and pushes people who have not answered', () => {
    const onSubmit = jest.fn();
    render(
      <PollThreadSheet
        visible
        pollTitle="Test"
        unansweredNames={['Ada', 'Bea']}
        statusLine="Ada and Bea haven't answered yet."
        existingThread={false}
        submitting={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText('Includes everyone. The thread links back to this poll and shows up in Chat.')).toBeTruthy();
    expect(screen.getByText("Ada, Bea")).toBeTruthy();
    expect(screen.getByDisplayValue('Still waiting on Ada and Bea to answer "Test".')).toBeTruthy();

    fireEvent.press(screen.getByTestId('poll-thread-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      message: 'Still waiting on Ada and Bea to answer "Test".',
      pushUnanswered: true,
    });
  });

  it('can send without the reminder push', () => {
    const onSubmit = jest.fn();
    render(
      <PollThreadSheet
        visible
        pollTitle="Test"
        unansweredNames={['Ada']}
        statusLine="Ada hasn't answered yet."
        existingThread
        submitting={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByTestId('poll-thread-push-unanswered'));
    expect(screen.getByText('Send to thread')).toBeTruthy();
    fireEvent.press(screen.getByTestId('poll-thread-submit'));
    expect(onSubmit).toHaveBeenCalledWith({
      message: 'Still waiting on Ada to answer "Test".',
      pushUnanswered: false,
    });
  });
});

describe('PollThreadLink', () => {
  it('opens the linked poll', () => {
    const onPress = jest.fn();
    render(<PollThreadLink title="Test" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('poll-thread-link'));
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByText('Test')).toBeTruthy();
  });
});
