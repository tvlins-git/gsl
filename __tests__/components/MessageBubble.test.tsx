import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MessageBubble } from '@/components/MessageBubble';

describe('MessageBubble', () => {
  it('renders message body and sender', () => {
    render(
      <MessageBubble
        body="Hey GSL crew!"
        senderName="Alex"
        createdAt="2026-07-13T10:00:00Z"
        isOwn={false}
      />
    );
    expect(screen.getByText('Hey GSL crew!')).toBeTruthy();
    expect(screen.getByText('Alex')).toBeTruthy();
  });

  it('renders own messages with sender name', () => {
    render(
      <MessageBubble
        body="My message"
        senderName="Hr. Lins"
        createdAt="2026-07-13T10:00:00Z"
        isOwn={true}
      />
    );
    expect(screen.getByText('Hr. Lins')).toBeTruthy();
    expect(screen.getByText('My message')).toBeTruthy();
  });
});
