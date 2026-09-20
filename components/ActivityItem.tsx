import { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { FeedPhoto } from '@/components/FeedPhoto';
import { activityKindLabel, type ActivityItem as ActivityItemData } from '@/lib/activity-feed';
import { ALBUM_FEED_THUMB_MAX } from '@/lib/album-previews';
import { formatRelativeTime } from '@/lib/time';
import { theme } from '@/constants/theme';

interface ActivityItemProps {
  item: ActivityItemData;
  onPress: () => void;
  onDelete?: () => void;
}

const THUMB_SIZE = 48;
const THUMB_OVERLAP = 16;

function AlbumThumbs({ uris, testID }: { uris: string[]; testID: string }) {
  const shown = uris.slice(0, ALBUM_FEED_THUMB_MAX);
  if (shown.length === 0) return null;

  return (
    <View style={styles.thumbs} testID={testID} accessibilityRole="image">
      {shown.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          source={{ uri }}
          style={[
            styles.thumb,
            index > 0 ? { marginLeft: -THUMB_OVERLAP } : null,
            { zIndex: shown.length - index },
          ]}
          resizeMode="cover"
          testID={`${testID}-${index}`}
        />
      ))}
    </View>
  );
}

export function ActivityItem({ item, onPress, onDelete }: ActivityItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const photoTestId = `feed-item-${item.id}-photo`;
  const thumbs = item.kind === 'post' ? [] : item.thumbUris ?? [];

  const row = (
    <Pressable
      style={styles.card}
      onPress={onPress}
      testID={`feed-item-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${activityKindLabel(item.kind)}: ${item.title}`}
    >
      <View style={styles.metaRow}>
        <View style={[styles.kind, item.kind === 'plan_lock' && styles.kindLocked]}>
          <Text style={[styles.kindText, item.kind === 'plan_lock' && styles.kindLockedText]}>
            {activityKindLabel(item.kind)}
          </Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={item.kind === 'post' ? 2 : 1}>
            {item.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.subtitle} · {item.authorName} · {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
        <AlbumThumbs uris={thumbs} testID={`feed-item-${item.id}-thumbs`} />
      </View>
      {item.kind === 'post' && item.imageUri ? (
        <FeedPhoto uri={item.imageUri} testID={photoTestId} />
      ) : null}
    </Pressable>
  );

  if (!onDelete) {
    return <View style={styles.wrap}>{row}</View>;
  }

  return (
    <View style={styles.wrap}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        enableTrackpadTwoFingerGesture
        renderRightActions={(_progress, _drag, swipeable) => (
          <Pressable
            style={styles.deleteAction}
            onPress={() => {
              (swipeable ?? swipeableRef.current)?.close();
              onDelete();
            }}
            testID={`delete-feed-item-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel="Delete post"
          >
            <Text style={styles.deleteActionText}>Delete</Text>
          </Pressable>
        )}
      >
        {row}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  kind: {
    minWidth: 58,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
  },
  kindLocked: {
    backgroundColor: theme.colors.successSoft,
  },
  kindText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  kindLockedText: {
    color: theme.colors.success,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  thumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.borderLight,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  deleteAction: {
    width: 88,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
