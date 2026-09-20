import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoGrid } from '@/components/PhotoGrid';
import { buildPhoto } from '../factories';

const photos = [
  buildPhoto({ id: 'p1', storage_path: 'file://one.jpg', thumb_path: 'file://one-thumb.jpg' }),
  buildPhoto({ id: 'p2', storage_path: 'file://two.jpg', thumb_path: 'file://two-thumb.jpg' }),
];

describe('PhotoGrid', () => {
  it('keeps per-photo delete and opens a photo on tap', () => {
    const onPhotoPress = jest.fn();
    const onDeletePhoto = jest.fn();
    render(
      <PhotoGrid
        photos={photos}
        getImageUrl={(photo, thumb) => (thumb ? photo.thumb_path : photo.storage_path) as string}
        onPhotoPress={onPhotoPress}
        onDeletePhoto={onDeletePhoto}
      />
    );

    fireEvent.press(screen.getByTestId('photo-p1'));
    expect(onPhotoPress).toHaveBeenCalledWith(photos[0]);

    fireEvent.press(screen.getByTestId('delete-photo-p2'));
    expect(onDeletePhoto).toHaveBeenCalledWith(photos[1]);
  });
});
