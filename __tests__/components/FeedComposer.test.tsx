import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FeedComposer } from '@/components/FeedComposer';
import { createFeedPost } from '@/lib/feed-posts';
import { isCameraPickerAvailable } from '@/lib/pick-image';
import { buildMember } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

jest.mock('@/lib/feed-posts', () => {
  const actual = jest.requireActual('@/lib/feed-posts');
  return {
    ...actual,
    createFeedPost: jest.fn().mockResolvedValue({ id: 'post-1' }),
  };
});

const mockPickImageUri = jest.fn();

jest.mock('@/lib/pick-image', () => ({
  isCameraPickerAvailable: jest.fn(() => true),
  pickImageUri: (...args: unknown[]) => mockPickImageUri(...args),
}));

const author = buildMember({
  id: 'm1',
  user_id: 'user-1',
  display_name: 'Hr. Lins',
  group_id: 'group-1',
});
const alice = buildMember({
  id: 'm2',
  user_id: 'user-2',
  display_name: 'Alice',
  group_id: 'group-1',
});

describe('FeedComposer', () => {
  beforeEach(() => {
    (createFeedPost as jest.Mock).mockClear();
    (isCameraPickerAvailable as jest.Mock).mockReturnValue(true);
    mockPickImageUri.mockReset();
    mockPickImageUri.mockResolvedValue('file://photo.jpg');
  });

  it('keeps Post disabled until there is text or a photo', () => {
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    expect(screen.getByTestId('feed-composer-post')).toBeDisabled();
    expect(screen.queryByTestId('feed-composer-tags')).toBeNull();
    expect(screen.queryByText('Everyone')).toBeNull();
  });

  it('posts text without mentions as untagged', async () => {
    const onPosted = jest.fn();
    render(<FeedComposer members={[author, alice]} author={author} onPosted={onPosted} />);
    fireEvent.changeText(screen.getByTestId('feed-composer-input'), 'Hello GSL');
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    await waitFor(() => expect(createFeedPost).toHaveBeenCalled());
    expect(createFeedPost).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Hello GSL',
        tagAll: false,
        taggedUserIds: [],
        authorId: 'user-1',
        imageUri: null,
      })
    );
    await waitFor(() => expect(onPosted).toHaveBeenCalled());
  });

  it('posts @everyone as tag_all', async () => {
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.changeText(screen.getByTestId('feed-composer-input'), 'hello @everyone');
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    await waitFor(() => expect(createFeedPost).toHaveBeenCalled());
    expect(createFeedPost).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'hello @everyone',
        tagAll: true,
        taggedUserIds: [],
      })
    );
  });

  it('posts @name mentions as tagged members', async () => {
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.changeText(screen.getByTestId('feed-composer-input'), 'hi @Alice');
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    await waitFor(() => expect(createFeedPost).toHaveBeenCalled());
    expect(createFeedPost).toHaveBeenCalledWith(
      expect.objectContaining({
        tagAll: false,
        taggedUserIds: ['user-2'],
      })
    );
  });

  it('exposes Camera and Gallery instead of a single Photo button', () => {
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    expect(screen.getByTestId('feed-composer-camera')).toBeTruthy();
    expect(screen.getByTestId('feed-composer-gallery')).toBeTruthy();
    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getByText('Gallery')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.queryByTestId('feed-composer-photo')).toBeNull();
    expect(screen.queryByText('Photo')).toBeNull();
    expect(screen.queryByText('HL')).toBeNull();
  });

  it('hides Camera on web while keeping Gallery', () => {
    (isCameraPickerAvailable as jest.Mock).mockReturnValue(false);
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    expect(screen.queryByTestId('feed-composer-camera')).toBeNull();
    expect(screen.getByTestId('feed-composer-gallery')).toBeTruthy();
  });

  it('attaches a camera photo through the camera entry point', async () => {
    mockPickImageUri.mockResolvedValue('file://camera.jpg');
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.press(screen.getByTestId('feed-composer-camera'));
    await waitFor(() => expect(mockPickImageUri).toHaveBeenCalledWith('camera'));
    await waitFor(() => expect(screen.getByTestId('feed-composer-remove-photo')).toBeTruthy());
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    await waitFor(() => expect(createFeedPost).toHaveBeenCalled());
    expect(createFeedPost).toHaveBeenCalledWith(
      expect.objectContaining({
        tagAll: false,
        taggedUserIds: [],
        imageUri: 'file://camera.jpg',
      })
    );
  });

  it('attaches a gallery photo through the gallery entry point', async () => {
    mockPickImageUri.mockResolvedValue('file://gallery.jpg');
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.press(screen.getByTestId('feed-composer-gallery'));
    await waitFor(() => expect(mockPickImageUri).toHaveBeenCalledWith('gallery'));
    await waitFor(() => expect(screen.getByTestId('feed-composer-remove-photo')).toBeTruthy());
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    await waitFor(() => expect(createFeedPost).toHaveBeenCalled());
    expect(createFeedPost).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUri: 'file://gallery.jpg',
      })
    );
  });

  it('shows mention suggestions while typing @', () => {
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.changeText(screen.getByTestId('feed-composer-input'), 'hi @');
    expect(screen.getByTestId('feed-mention-suggestions')).toBeTruthy();
    expect(screen.getByTestId('feed-mention-everyone')).toBeTruthy();
    expect(screen.getByTestId('feed-mention-member-user-2')).toBeTruthy();
  });

  it('inserts a suggestion into the composer text', async () => {
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.changeText(screen.getByTestId('feed-composer-input'), 'hi @');
    fireEvent.press(screen.getByTestId('feed-mention-member-user-2'));
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    await waitFor(() => expect(createFeedPost).toHaveBeenCalled());
    expect(createFeedPost).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'hi @Alice ',
        tagAll: false,
        taggedUserIds: ['user-2'],
      })
    );
  });

  it('surfaces a useful error instead of only the generic string', async () => {
    (createFeedPost as jest.Mock).mockRejectedValueOnce(
      new Error("Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported")
    );
    render(<FeedComposer members={[author, alice]} author={author} onPosted={() => {}} />);
    fireEvent.changeText(screen.getByTestId('feed-composer-input'), 'Flower');
    fireEvent.press(screen.getByTestId('feed-composer-post'));
    expect(await screen.findByText('Could not read the photo on this device. Try another photo.')).toBeTruthy();
    expect(screen.queryByText('Could not post. Try again.')).toBeNull();
  });
});
