import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PhotoEventRow } from '@/components/PhotoEventRow';
import { PhotoGrid } from '@/components/PhotoGrid';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import type { Photo, PhotoEvent } from '@/lib/database.types';
import { compressImage } from '@/lib/image-compress';
import { isLocalMode, localStore } from '@/lib/local-store';
import {
  deletePhotoEvent,
  formatEventDate,
  formatPhotoCount,
  loadPhotoEventSummaries,
  type PhotoEventSummary,
} from '@/lib/photo-events';
import { deletePhoto } from '@/lib/photo-list';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';

export default function PhotosScreen() {
  const { member } = useAuth();
  const [summaries, setSummaries] = useState<PhotoEventSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PhotoEvent | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const loadSummaries = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const data = await loadPhotoEventSummaries(member.group_id);
    setSummaries(data);
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

  const selectedSummary = summaries.find((s) => s.event.id === selectedEvent?.id);

  const topPhotoIds = useMemo(() => {
    const scored = photos.filter((p) => p.ai_score != null);
    const topN = Math.max(10, Math.ceil(scored.length * 0.2));
    return new Set(scored.slice(0, topN).map((p) => p.id));
  }, [photos]);

  const getImageUrl = (photo: Photo, thumb = false) => {
    if (isLocalMode()) {
      return thumb && photo.thumb_path ? photo.thumb_path : photo.storage_path;
    }
    const path = thumb && photo.thumb_path ? photo.thumb_path : photo.storage_path;
    const { data } = supabase.storage.from('photos').getPublicUrl(path);
    return data.publicUrl;
  };

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
      setSelectedEvent(data);
      await loadSummaries();
    }
    setShowCreate(false);
    setNewTitle('');
  };

  const uploadImage = async (uri: string) => {
    if (!member || !selectedEvent) return;
    setUploading(true);

    const compressed = await compressImage(uri, { maxWidth: 1200, quality: 0.8 });
    const thumb = await compressImage(uri, { maxWidth: 300, quality: 0.7 });

    if (isLocalMode()) {
      await localStore.addPhoto(selectedEvent.id, member.user_id, compressed.uri, thumb.uri);
      await loadPhotos(selectedEvent.id);
      await loadSummaries();
      setUploading(false);
      return;
    }

    const photoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${member.group_id}/${selectedEvent.id}/${photoId}.jpg`;
    const thumbPath = `${member.group_id}/${selectedEvent.id}/${photoId}_thumb.jpg`;

    const fullBlob = await (await fetch(compressed.uri)).blob();
    const thumbBlob = await (await fetch(thumb.uri)).blob();

    await supabase.storage.from('photos').upload(storagePath, fullBlob, { contentType: 'image/jpeg' });
    await supabase.storage.from('photos').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });

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
      await loadPhotos(selectedEvent.id);
      await loadSummaries();
    }

    setUploading(false);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const closeEvent = () => {
    setSelectedEvent(null);
    setPhotos([]);
    loadSummaries();
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
      setSelectedEvent(null);
      setPhotos([]);
    }
    await loadSummaries();
  };

  if (loading) {
    return <Screen loading />;
  }

  if (selectedEvent) {
    return (
      <Screen>
        <Pressable onPress={closeEvent} style={styles.backBtn}>
          <Text style={styles.back}>← Back to events</Text>
        </Pressable>
        <View style={[styles.detailHeader, sharedStyles.card]}>
          <View style={styles.detailTitleBlock}>
            <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
            <Text style={styles.detailMeta}>
              Added {formatEventDate(selectedEvent.created_at)}
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
          >
            <Text style={sharedStyles.primaryBtnText}>Gallery</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, sharedStyles.secondaryBtn, uploading && styles.actionDisabled]}
            onPress={takePhoto}
            disabled={uploading}
          >
            <Text style={sharedStyles.secondaryBtnText}>Camera</Text>
          </Pressable>
          {uploading && <ActivityIndicator color={theme.colors.primary} />}
        </View>

        <PhotoGrid
          photos={photos}
          topPhotoIds={topPhotoIds}
          getImageUrl={getImageUrl}
          onDeletePhoto={handleDeletePhoto}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable
        style={[styles.createBtn, sharedStyles.primaryBtn]}
        onPress={() => setShowCreate(true)}
        testID="create-photo-event-btn"
      >
        <Text style={sharedStyles.primaryBtnText}>+ New event</Text>
      </Pressable>

      <FlatList
        data={summaries}
        keyExtractor={(item) => item.event.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PhotoEventRow
            summary={item}
            onPress={() => setSelectedEvent(item.event)}
            onDelete={() => handleDeleteEvent(item.event.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>Create an event to start uploading photos.</Text>
        }
      />

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={sharedStyles.modalOverlay}>
          <View style={sharedStyles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={sharedStyles.modalTitle}>New photo event</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="e.g. July 2026, Ski trip"
              placeholderTextColor={theme.colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Pressable style={sharedStyles.primaryBtn} onPress={handleCreateEvent}>
              <Text style={sharedStyles.primaryBtnText}>Create</Text>
            </Pressable>
            <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  list: {
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cancelBtn: { paddingVertical: theme.spacing.sm },
  cancel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 15 },
});
