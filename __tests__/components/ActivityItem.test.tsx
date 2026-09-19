import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActivityItem } from '@/components/ActivityItem';
import type { ActivityItem as ActivityItemData } from '@/lib/activity-feed';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

const item: ActivityItemData = {
  id: 'album-1',
  kind: 'album',
  title: 'Ski trip',
  subtitle: 'New album · 2 photos',
  timestamp: new Date().toISOString(),
  path: '/photos?eventId=1',
  authorName: 'Hr. Lins',
};

describe('ActivityItem', () => {
  it('renders kind, title, and subtitle', () => {
    render(<ActivityItem item={item} onPress={() => {}} />);
    expect(screen.getByText('Album')).toBeTruthy();
    expect(screen.getByText('Ski trip')).toBeTruthy();
    expect(screen.getByText(/New album · 2 photos/)).toBeTruthy();
    expect(screen.getByTestId('feed-item-album-1')).toBeTruthy();
  });

  it('calls onPress', () => {
    const onPress = jest.fn();
    render(<ActivityItem item={item} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('feed-item-album-1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('labels locked plan items distinctly', () => {
    render(
      <ActivityItem
        item={{ ...item, id: 'plan-lock-1', kind: 'plan_lock', subtitle: 'Date locked' }}
        onPress={() => {}}
      />
    );
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText(/Date locked/)).toBeTruthy();
  });
});
