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
        members={[]}
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
        members={[]}
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

  it('inserts an @mention from the suggestion list', () => {
    const onSubmit = jest.fn();
    render(
      <PollThreadSheet
        visible
        pollTitle="Test"
        members={[
          { user_id: 'user-2', display_name: 'Ada' },
          { user_id: 'user-3', display_name: 'Bea' },
        ]}
        unansweredNames={[]}
        statusLine="Everyone has answered."
        existingThread={false}
        submitting={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.changeText(screen.getByTestId('poll-thread-message'), 'hi @');
    expect(screen.getByTestId('poll-mention-suggestions')).toBeTruthy();
    expect(screen.getByTestId('poll-mention-everyone')).toBeTruthy();
    fireEvent.press(screen.getByTestId('poll-mention-member-user-2'));
    fireEvent.press(screen.getByTestId('poll-thread-submit'));
    expect(onSubmit).toHaveBeenCalledWith({
      message: 'hi @Ada',
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
