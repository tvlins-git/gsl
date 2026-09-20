import {
  DEFAULT_ALBUM_SELECTION_LIMIT,
  imagePickerOptions,
  isCameraPickerAvailable,
  pickImageUri,
  pickImageUris,
} from '@/lib/pick-image';

const mockRequestCameraPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) => mockRequestCameraPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  UIImagePickerPresentationStyle: { FULL_SCREEN: 'fullScreen' },
}));

const singlePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsMultipleSelection: false,
  selectionLimit: 1,
  orderedSelection: false,
  presentationStyle: 'fullScreen',
};

const albumPickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsMultipleSelection: true,
  selectionLimit: DEFAULT_ALBUM_SELECTION_LIMIT,
  orderedSelection: true,
  presentationStyle: 'fullScreen',
};

describe('isCameraPickerAvailable', () => {
  it('is hidden on web even when Device.isDevice is true', () => {
    expect(isCameraPickerAvailable('web', true)).toBe(false);
    expect(isCameraPickerAvailable('web', false)).toBe(false);
  });

  it('is hidden on iOS and Android simulators', () => {
    expect(isCameraPickerAvailable('ios', false)).toBe(false);
    expect(isCameraPickerAvailable('android', false)).toBe(false);
  });

  it('is available on real iOS and Android devices', () => {
    expect(isCameraPickerAvailable('ios', true)).toBe(true);
    expect(isCameraPickerAvailable('android', true)).toBe(true);
  });
});

describe('imagePickerOptions', () => {
  it('keeps gallery single-select unless multiple is requested', () => {
    expect(imagePickerOptions('gallery')).toEqual(singlePickerOptions);
    expect(imagePickerOptions('gallery', { multiple: false })).toEqual(singlePickerOptions);
  });

  it('enables multi-select with a default cap of 20 for album gallery', () => {
    expect(imagePickerOptions('gallery', { multiple: true })).toEqual(albumPickerOptions);
  });

  it('honors a custom selectionLimit when multiple is true', () => {
    expect(imagePickerOptions('gallery', { multiple: true, selectionLimit: 10 })).toEqual({
      ...albumPickerOptions,
      selectionLimit: 10,
    });
  });

  it('never enables multiple selection for camera captures', () => {
    expect(imagePickerOptions('camera', { multiple: true, selectionLimit: 20 })).toEqual(
      singlePickerOptions
    );
  });
});

describe('pickImageUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests camera permission then launches the camera', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://camera.jpg' }],
    });

    await expect(pickImageUri('camera')).resolves.toBe('file://camera.jpg');
    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchCameraAsync).toHaveBeenCalledWith(singlePickerOptions);
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('requests gallery permission then launches the library as single-select', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://gallery.jpg' }],
    });

    await expect(pickImageUri('gallery')).resolves.toBe('file://gallery.jpg');
    expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(singlePickerOptions);
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });

  it('forces single-select even if a caller passes multiple: true', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://one.jpg' }, { uri: 'file://two.jpg' }],
    });

    await expect(pickImageUri('gallery', { multiple: true })).resolves.toBe('file://one.jpg');
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(singlePickerOptions);
  });

  it('does not open the picker when permission is denied', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(pickImageUri('camera')).resolves.toBeNull();
    await expect(pickImageUri('gallery')).resolves.toBeNull();
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });
});

describe('pickImageUris', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns every selected gallery URI when multiple is enabled', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://one.jpg' }, { uri: 'file://two.jpg' }, { uri: 'file://three.jpg' }],
    });

    await expect(pickImageUris('gallery', { multiple: true })).resolves.toEqual([
      'file://one.jpg',
      'file://two.jpg',
      'file://three.jpg',
    ]);
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(albumPickerOptions);
  });

  it('returns an empty list when the picker is canceled', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await expect(pickImageUris('gallery', { multiple: true })).resolves.toEqual([]);
  });
});
