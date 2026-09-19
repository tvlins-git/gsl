import { fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoSourceActions } from '@/components/PhotoSourceActions';

describe('PhotoSourceActions', () => {
  it('shows Gallery and Camera on a real device', () => {
    render(
      <PhotoSourceActions
        uploading={false}
        cameraAvailable
        onGallery={() => {}}
        onCamera={() => {}}
      />
    );
    expect(screen.getByTestId('photo-gallery-btn')).toBeTruthy();
    expect(screen.getByTestId('photo-camera-btn')).toBeTruthy();
  });

  it('hides Camera when hardware is unavailable', () => {
    render(
      <PhotoSourceActions
        uploading={false}
        cameraAvailable={false}
        onGallery={() => {}}
        onCamera={() => {}}
      />
    );
    expect(screen.getByTestId('photo-gallery-btn')).toBeTruthy();
    expect(screen.queryByTestId('photo-camera-btn')).toBeNull();
  });

  it('does not invoke Camera when it is hidden', () => {
    const onCamera = jest.fn();
    render(
      <PhotoSourceActions
        uploading={false}
        cameraAvailable={false}
        onGallery={() => {}}
        onCamera={onCamera}
      />
    );
    fireEvent.press(screen.getByTestId('photo-gallery-btn'));
    expect(onCamera).not.toHaveBeenCalled();
  });
});
