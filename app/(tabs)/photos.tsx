import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardSheet } from '@/components/KeyboardSheet';
import { PhotoEventRow } from '@/components/PhotoEventRow';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PhotoViewer } from '@/components/PhotoViewer';
import { UserAvatar } from '@/components/UserAvatar';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import type { Member, Photo, PhotoEvent } from '@/lib/database.types';
import { compressImage } from '@/lib/image-compress';
import { isLocalMode, localStore } from '@/lib/local-store';
import { uploadJpegToPhotos } from '@/lib/photo-upload';
import {
  deletePhotoEvent,
  formatPhotoCount,
  getPhotoPublicUrl,
  loadPhotoEventSummaries,
  type PhotoEventSummary,
} from '@/lib/photo-events';
import { albumBackAction, albumBackButtonText, albumBackLabel, firstSearchParam } from '@/lib/album-back';
import { isCameraPickerAvailable, pickImageUris } from '@/lib/pick-image';
import { deletePhoto } from '@/lib/photo-list';
import { formatRelativeTime } from '@/lib/time';
import { supabase } from '@/lib/supabase';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function PhotosScreen() {
  const { member } = useAuth();
  const params = useLocalSearchParams<{ eventId?: string | string[]; from?: string | string[] }>();
  const eventId = firstSearchParam(params.eventId);
  const from = firstSearchParam(params.from);
  const openedEventId = useRef<string | null>(null);
  const [summaries, setSummaries] = useState<PhotoEventSummary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PhotoEvent | null>(null);
  const [openedFromLink, setOpenedFromLink] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const loadSummaries = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const [data, groupMembers] = await Promise.all([
      loadPhotoEventSummaries(member.group_id),
      getGroupMembers(member.group_id),
    ]);
    setSummaries(data);
    setMembers(groupMembers);
    setLoading(false);
  }, [member]);

  const loadPhotos = useCallback(async (eventId: string) => {
    const data = isLocalMode()
      ? await localStore.getPhotos(eventId)
      : (await supabase.from('photos').select('*').eq('event_id', eventId).order('ai_score', { ascending: false, nullsFirst: false })).data ?? [];
    setPhotos(data);
  }, []);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    if (selectedEvent) loadPhotos(selectedEvent.id);
  }, [selectedEvent, loadPhotos]);

  useEffect(() => {
    if (!eventId || openedEventId.current === eventId) return;
    const match = summaries.find((item) => item.event.id === eventId);
    if (match) {
      openedEventId.current = eventId;
      setOpenedFromLink(true);
      setSelectedEvent(match.event);
    }
  }, [eventId, summaries]);

  const selectedSummary = summaries.find((s) => s.event.id === selectedEvent?.id);
  const nameForUser = (userId?: string | null) =>
    members.find((item) => item.user_id === userId)?.display_name
    ?? (member && userId === member.user_id ? member.display_name : 'Friend');

  const avatarForUser = (userId?: string | null) =>
    members.find((item) => item.user_id === userId)?.avatar_url
    ?? (member && userId === member.user_id ? member.avatar_url : null);

  const topPhotoIds = useMemo(() => {
    const scored = photos.filter((p) => p.ai_score != null);
    const topN = Math.max(10, Math.ceil(scored.length * 0.2));
    return new Set(scored.slice(0, topN).map((p) => p.id));
  }, [photos]);

  const getImageUrl = (photo: Photo, thumb = false) => getPhotoPublicUrl(photo, thumb);

  const handleCreateEvent = async () => {
    if (!member || !newTitle.trim()) return;
    const data = isLocalMode()
      ? await localStore.createPhotoEvent(member.group_id, newTitle.trim(), member.user_id)
      : (await supabase
          .from('photo_events')
          .insert({ group_id: member.group_id, title: newTitle.trim(), created_by: member.user_id })
          .select()
          .single()).data;
    if (data) {
      setOpenedFromLink(false);
      setSelectedEvent(data);
      await loadSummaries();
    }
    setShowCreate(false);
    setNewTitle('');
  };

  const persistAlbumPhoto = async (uri: string) => {
    if (!member || !selectedEvent) return;

    if (isLocalMode()) {
      const compressed = await compressImage(uri, { maxWidth: 1200, quality: 0.8, includeBase64: true });
      const thumb = await compressImage(uri, { maxWidth: 300, quality: 0.7, includeBase64: true });
      const fullUri = compressed.base64
        ? `data:image/jpeg;base64,${compressed.base64}`
        : compressed.uri;
      const thumbUri = thumb.base64 ? `data:image/jpeg;base64,${thumb.base64}` : thumb.uri;
      await localStore.addPhoto(selectedEvent.id, member.user_id, fullUri, thumbUri);
      return;
    }

    const compressed = await compressImage(uri, { maxWidth: 1200, quality: 0.8 });
    const photoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${member.group_id}/${selectedEvent.id}/${photoId}.jpg`;
    const thumbPath = `${member.group_id}/${selectedEvent.id}/${photoId}_thumb.jpg`;

    await uploadJpegToPhotos(storagePath, uri, { maxWidth: 1200, quality: 0.8 });
    await uploadJpegToPhotos(thumbPath, uri, { maxWidth: 300, quality: 0.7 });

    const { data: photo } = await supabase
      .from('photos')
      .insert({
        event_id: selectedEvent.id,
        uploaded_by: member.user_id,
        storage_path: storagePath,
        thumb_path: thumbPath,
        width: compressed.width,
        height: compressed.height,
      })
      .select()
      .single();

    if (photo) {
      await supabase.functions.invoke('score-photo', { body: { photo_id: photo.id } }).catch(() => undefined);
    }
  };

  const uploadImages = async (uris: string[]) => {
    if (!member || !selectedEvent || uris.length === 0) return;
    setUploading(true);
    try {
      for (const uri of uris) {
        try {
          await persistAlbumPhoto(uri);
        } catch {
          // Keep the rest of the batch; a single bad asset should not drop the others.
        }
      }
      await loadPhotos(selectedEvent.id);
      await loadSummaries();
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const uris = await pickImageUris('gallery', { multiple: true });
    await uploadImages(uris);
  };

  const takePhoto = async () => {
    const uris = await pickImageUris('camera');
    await uploadImages(uris);
  };

  const closeEvent = () => {
    setSelectedEvent(null);
    setOpenedFromLink(false);
    setPhotos([]);
    setViewerIndex(null);
    loadSummaries();
  };

  const handleAlbumBack = () => {
    const dest = albumBackAction({
      openedFromLink,
      from,
      canGoBack: router.canGoBack(),
    });
    closeEvent();
    if (dest.type === 'back') router.back();
    else if (dest.type === 'replace') router.replace(dest.href);
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!selectedEvent) return;
    await deletePhoto(photo);
    await loadPhotos(selectedEvent.id);
    await loadSummaries();
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deletePhotoEvent(eventId);
    if (selectedEvent?.id === eventId) {
      setOpenedFromLink(false);
      setSelectedEvent(null);
      setPhotos([]);
    }
    await loadSummaries();
  };

  if (loading) {
    return <Screen loading />;
  }

  if (selectedEvent) {
    const backFrom = openedFromLink ? from : undefined;
    return (
      <Screen>
        <Pressable
          onPress={handleAlbumBack}
          style={styles.backBtn}
          testID="album-back-btn"
          accessibilityRole="button"
          accessibilityLabel={albumBackLabel(backFrom)}
        >
          <Text style={styles.back}>{albumBackButtonText(backFrom)}</Text>
        </Pressable>
        <View style={[styles.detailHeader, sharedStyles.card]}>
          <UserAvatar
            name={nameForUser(selectedEvent.created_by)}
            size={48}
            imageUri={avatarForUser(selectedEvent.created_by)}
          />
          <View style={styles.detailTitleBlock}>
            <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
            <Text style={styles.detailMeta}>
              {nameForUser(selectedEvent.created_by)} · {formatRelativeTime(selectedEvent.created_at)}
              {selectedSummary ? ` · ${formatPhotoCount(selectedSummary.photoCount)}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => handleDeleteEvent(selectedEvent.id)}
            testID="delete-photo-event-detail"
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>

        {topPhotoIds.size > 0 && (
          <View style={styles.topBanner}>
            <Text style={styles.topLabel}>★ Top pictures ({topPhotoIds.size})</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, sharedStyles.primaryBtn, uploading && styles.actionDisabled]}
            onPress={pickFromGallery}
            disabled={uploading}
            testID="album-gallery-btn"
          >
            <Text style={sharedStyles.primaryBtnText}>Gallery</Text>
          </Pressable>
          {isCameraPickerAvailable() ? (
            <Pressable
              style={[styles.actionBtn, sharedStyles.secondaryBtn, uploading && styles.actionDisabled]}
              onPress={takePhoto}
              disabled={uploading}
            >
              <Text style={sharedStyles.secondaryBtnText}>Camera</Text>
            </Pressable>
          ) : null}
          {uploading && <ActivityIndicator color={theme.colors.primary} />}
        </View>

        <PhotoGrid
          photos={photos}
          topPhotoIds={topPhotoIds}
          getImageUrl={getImageUrl}
          onPhotoPress={(photo) => {
            const index = photos.findIndex((item) => item.id === photo.id);
            if (index >= 0) setViewerIndex(index);
          }}
          onDeletePhoto={handleDeletePhoto}
        />
        <PhotoViewer
          visible={viewerIndex != null}
          photos={photos}
          initialIndex={viewerIndex ?? 0}
          getImageUrl={getImageUrl}
          onClose={() => setViewerIndex(null)}
          onDelete={handleDeletePhoto}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.event.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={sharedStyles.toolBar}>
            <Text style={sharedStyles.toolBarTitle}>Albums</Text>
            <Pressable
              style={sharedStyles.toolBarAction}
              onPress={() => setShowCreate(true)}
              testID="create-photo-event-btn"
            >
              <Text style={sharedStyles.toolBarActionText}>New album</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <PhotoEventRow
            summary={item}
            authorName={nameForUser(item.event.created_by)}
            authorAvatarUrl={avatarForUser(item.event.created_by)}
            onPress={() => {
              setOpenedFromLink(false);
              setSelectedEvent(item.event);
            }}
            onDelete={() => handleDeleteEvent(item.event.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>
            No albums yet. Start one and drop in a few photos.
          </Text>
        }
      />

      <KeyboardSheet
        visible={showCreate}
        onRequestClose={() => setShowCreate(false)}
        testID="new-album-sheet"
      >
        <Text style={sharedStyles.modalTitle}>New photo event</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="e.g. July 2026, Ski trip"
          placeholderTextColor={theme.colors.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          testID="new-album-title"
        />
        <Pressable style={sharedStyles.primaryBtn} onPress={handleCreateEvent}>
          <Text style={sharedStyles.primaryBtnText}>Create</Text>
        </Pressable>
        <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </KeyboardSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    ...feedColumn,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  backBtn: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  back: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailTitleBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  topBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
  },
  topLabel: {
    fontWeight: '600',
    color: theme.colors.text,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
  },
  actionBtn: { flex: 1 },
  actionDisabled: { opacity: 0.45 },
  cancelBtn: { paddingVertical: theme.spacing.sm },
  cancel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 15 },
});
