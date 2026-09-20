import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoViewer, albumViewerIndexAfterSwipe } from '@/components/PhotoViewer';
import { buildPhoto } from '../factories';

const photos = [
  buildPhoto({ id: 'p1', storage_path: 'file://one.jpg', thumb_path: 'file://one-thumb.jpg' }),
  buildPhoto({ id: 'p2', storage_path: 'file://two.jpg', thumb_path: 'file://two-thumb.jpg' }),
];

describe('PhotoViewer', () => {
  it('opens full-size at the tapped photo and can close', () => {
    const onClose = jest.fn();
    render(
      <PhotoViewer
        visible
        photos={photos}
        initialIndex={1}
        getImageUrl={(photo, thumb) => (thumb ? photo.thumb_path : photo.storage_path) as string}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('photo-viewer')).toBeTruthy();
    expect(screen.getByTestId('photo-viewer-image-p2').props.source).toEqual({
      uri: 'file://two.jpg',
    });
    expect(screen.getByText('2 / 2')).toBeTruthy();

    fireEvent.press(screen.getByTestId('photo-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('advances when the stage is swiped left', () => {
    expect(albumViewerIndexAfterSwipe(0, 2, -80, 0, 48)).toBe(1);
    expect(albumViewerIndexAfterSwipe(1, 2, 80, 0, 48)).toBe(0);
    expect(albumViewerIndexAfterSwipe(0, 2, -10, 0, 48)).toBe(0);
  });

  it('deletes the current photo from the viewer', () => {
    const onDelete = jest.fn();
    render(
      <PhotoViewer
        visible
        photos={photos}
        initialIndex={0}
        getImageUrl={(photo) => photo.storage_path}
        onClose={() => {}}
        onDelete={onDelete}
      />
    );

    fireEvent.press(screen.getByTestId('photo-viewer-delete'));
    expect(onDelete).toHaveBeenCalledWith(photos[0]);
  });

  it('renders nothing when closed or when the album is empty', () => {
    const { rerender } = render(
      <PhotoViewer
        visible={false}
        photos={photos}
        initialIndex={0}
        getImageUrl={(photo) => photo.storage_path}
        onClose={() => {}}
      />
    );
    expect(screen.queryByTestId('photo-viewer')).toBeNull();

    rerender(
      <PhotoViewer
        visible
        photos={[]}
        initialIndex={0}
        getImageUrl={(photo) => photo.storage_path}
        onClose={() => {}}
      />
    );
    expect(screen.queryByTestId('photo-viewer')).toBeNull();
  });
});
