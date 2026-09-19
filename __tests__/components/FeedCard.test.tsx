import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FeedCard } from '@/components/FeedCard';

describe('FeedCard', () => {
  it('renders author, title, and caption', () => {
    render(
      <FeedCard
        authorName="Hr. Lins"
        title="Ski trip"
        timestamp={new Date().toISOString()}
        caption="4 photos"
        onPress={() => {}}
        testID="photo-event-1"
      />
    );
    expect(screen.getByText('Hr. Lins')).toBeTruthy();
    expect(screen.getByText('Ski trip')).toBeTruthy();
    expect(screen.getByText('4 photos')).toBeTruthy();
    expect(screen.getByTestId('photo-event-1')).toBeTruthy();
  });

  it('calls onPress and onDelete', () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    render(
      <FeedCard
        authorName="Alice"
        title="Dinner"
        timestamp={new Date().toISOString()}
        onPress={onPress}
        onDelete={onDelete}
        testID="photo-event-2"
        deleteTestID="delete-photo-event-2"
      />
    );
    fireEvent.press(screen.getByTestId('photo-event-2'));
    fireEvent.press(screen.getByTestId('delete-photo-event-2'));
    expect(onPress).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
