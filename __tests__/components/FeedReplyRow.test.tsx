import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FeedReplyRow } from '@/components/FeedReplyRow';

describe('FeedReplyRow', () => {
  it('always shows avatar identity via author name', () => {
    render(
      <FeedReplyRow
        body="There you are"
        authorName="Diana"
        createdAt="2026-09-27T14:00:00.000Z"
        isOwn={false}
      />
    );
    expect(screen.getByText('Diana')).toBeTruthy();
    expect(screen.getByText('There you are')).toBeTruthy();
    expect(screen.queryByText('You')).toBeNull();
    expect(screen.queryByTestId('feed-reply-row-delete')).toBeNull();
  });

  it('marks own replies and exposes swipe Delete', () => {
    const onDelete = jest.fn();
    render(
      <FeedReplyRow
        body="Hi"
        authorName="Hr. Lins"
        createdAt="2026-09-27T14:00:00.000Z"
        isOwn
        onDelete={onDelete}
        testID="own-reply"
      />
    );
    expect(screen.getByText('Hr. Lins')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    fireEvent.press(screen.getByTestId('own-reply-delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
