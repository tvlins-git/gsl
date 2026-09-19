import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FeedPhoto } from '@/components/FeedPhoto';
import { theme } from '@/constants/theme';
import { FEED_PHOTO_MAX_HEIGHT, feedPhotoDisplayHeight } from '@/lib/feed-photo';

describe('FeedPhoto', () => {
  it('renders full-width with contain so the photo is never stretched', () => {
    render(<FeedPhoto uri="file://flower.jpg" testID="feed-photo" />);
    const photo = screen.getByTestId('feed-photo');
    expect(photo.props.resizeMode).toBe('contain');
    const photoStyle = StyleSheet.flatten(photo.props.style);
    expect(photoStyle.width).toBe('100%');
  });

  it('letterboxes against the screen background instead of a second grey', () => {
    render(<FeedPhoto uri="file://flower.jpg" testID="feed-photo" />);
    const photo = screen.getByTestId('feed-photo');
    const photoStyle = StyleSheet.flatten(photo.props.style);
    const frameStyle = StyleSheet.flatten(photo.parent?.props.style);
    expect(photoStyle.backgroundColor).toBe(theme.colors.bg);
    expect(frameStyle.backgroundColor).toBe(theme.colors.bg);
  });

  it('sizes height from the natural aspect ratio after layout and load', () => {
    render(<FeedPhoto uri="file://wide.jpg" testID="feed-photo" />);
    const photo = screen.getByTestId('feed-photo');
    fireEvent(photo.parent!, 'layout', { nativeEvent: { layout: { width: 360, height: 0 } } });
    fireEvent(photo, 'load', {
      nativeEvent: { source: { width: 1600, height: 900, uri: 'file://wide.jpg' } },
    });
    const photoStyle = StyleSheet.flatten(screen.getByTestId('feed-photo').props.style);
    expect(photoStyle.height).toBeCloseTo(feedPhotoDisplayHeight(360, 16 / 9));
    expect(photoStyle.height).toBeLessThan(FEED_PHOTO_MAX_HEIGHT);
  });

  it('reads web onLoad naturalWidth/naturalHeight from the image target', () => {
    render(<FeedPhoto uri="file://web.jpg" testID="feed-photo" />);
    const photo = screen.getByTestId('feed-photo');
    fireEvent(photo.parent!, 'layout', { nativeEvent: { layout: { width: 400, height: 0 } } });
    fireEvent(photo, 'load', {
      nativeEvent: { target: { naturalWidth: 800, naturalHeight: 400 } },
    });
    const photoStyle = StyleSheet.flatten(screen.getByTestId('feed-photo').props.style);
    expect(photo.props.resizeMode).toBe('contain');
    expect(photoStyle.height).toBeCloseTo(feedPhotoDisplayHeight(400, 2));
  });

  it('caps tall images and still uses contain rather than a hard crop', () => {
    render(<FeedPhoto uri="file://tall.jpg" testID="feed-photo" />);
    const photo = screen.getByTestId('feed-photo');
    fireEvent(photo.parent!, 'layout', { nativeEvent: { layout: { width: 360, height: 0 } } });
    fireEvent(photo, 'load', {
      nativeEvent: { source: { width: 900, height: 1600, uri: 'file://tall.jpg' } },
    });
    expect(photo.props.resizeMode).toBe('contain');
    const photoStyle = StyleSheet.flatten(screen.getByTestId('feed-photo').props.style);
    expect(photoStyle.height).toBe(FEED_PHOTO_MAX_HEIGHT);
  });
});
