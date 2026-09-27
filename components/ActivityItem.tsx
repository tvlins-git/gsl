import { type ReactNode, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { FeedPhoto } from '@/components/FeedPhoto';
import { activityKindLabel, type ActivityItem as ActivityItemData } from '@/lib/activity-feed';
import {
  ALBUM_FEED_THUMB_GAP,
  ALBUM_FEED_THUMB_RADIUS,
  ALBUM_FEED_THUMB_SIZE,
  ALBUM_FEED_THUMB_VISIBLE,
  albumThumbOverflow,
} from '@/lib/album-previews';
import { formatThreadExpandLabel } from '@/lib/feed-post-replies';
import { formatRelativeTime } from '@/lib/time';
import { theme } from '@/constants/theme';

interface ActivityItemProps {
  item: ActivityItemData;
  onPress: () => void;
  onDelete?: () => void;
  /** Feed posts: expand/collapse the inline thread under this card. */
  threadExpanded?: boolean;
  onToggleThread?: () => void;
  threadPanel?: ReactNode;
}

function AlbumThumbs({
  uris,
  photoCount,
  testID,
}: {
  uris: string[];
  photoCount?: number;
  testID: string;
}) {
  const shown = uris.slice(0, ALBUM_FEED_THUMB_VISIBLE);
  if (shown.length === 0) return null;
  const overflow = albumThumbOverflow(photoCount ?? uris.length, shown.length);

  return (
    <View style={styles.thumbs} testID={testID} accessibilityRole="image">
      {shown.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          source={{ uri }}
          style={styles.thumb}
          resizeMode="cover"
          testID={`${testID}-${index}`}
        />
      ))}
      {overflow > 0 ? (
        <Text style={styles.more} testID={`${testID}-more`}>
          +{overflow}
        </Text>
      ) : null}
    </View>
  );
}

function MetaDot() {
  return <Text style={styles.meta}> · </Text>;
}

export function ActivityItem({
  item,
  onPress,
  onDelete,
  threadExpanded = false,
  onToggleThread,
  threadPanel,
}: ActivityItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const photoTestId = `feed-item-${item.id}-photo`;
  const thumbs = item.kind === 'post' ? [] : item.thumbUris ?? [];
  const isPost = item.kind === 'post';
  const replyCount = item.replyCount ?? 0;
  const showThreadControl = isPost && typeof onToggleThread === 'function';

  const meta = (
    <View style={styles.metaLine}>
      <Text style={styles.meta} numberOfLines={1}>
        {item.subtitle}
      </Text>
      {showThreadControl ? (
        <>
          <MetaDot />
          <Pressable
            onPress={() => {
              onToggleThread();
            }}
            hitSlop={6}
            testID={`feed-item-${item.id}-thread-toggle`}
            accessibilityRole="button"
            accessibilityState={{ expanded: threadExpanded }}
            accessibilityLabel={formatThreadExpandLabel(replyCount, threadExpanded)}
          >
            <Text style={styles.threadToggle}>
              {formatThreadExpandLabel(replyCount, threadExpanded)}
            </Text>
          </Pressable>
        </>
      ) : null}
      <MetaDot />
      <Text style={styles.meta} numberOfLines={1}>
        {item.authorName} · {formatRelativeTime(item.timestamp)}
      </Text>
    </View>
  );

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
          {meta}
        </View>
        <AlbumThumbs
          uris={thumbs}
          photoCount={item.photoCount}
          testID={`feed-item-${item.id}-thumbs`}
        />
      </View>
      {item.kind === 'post' && item.imageUri ? (
        <FeedPhoto uri={item.imageUri} testID={photoTestId} />
      ) : null}
    </Pressable>
  );

  const card = !onDelete ? (
    row
  ) : (
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
          accessibilityLabel={`Delete ${activityKindLabel(item.kind).toLowerCase()}`}
        >
          <Text style={styles.deleteActionText}>Delete</Text>
        </Pressable>
      )}
    >
      {row}
    </Swipeable>
  );

  return (
    <View style={styles.wrap}>
      {card}
      {threadExpanded ? threadPanel : null}
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
  metaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  threadToggle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  thumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ALBUM_FEED_THUMB_GAP,
    height: ALBUM_FEED_THUMB_SIZE,
  },
  thumb: {
    width: ALBUM_FEED_THUMB_SIZE,
    height: ALBUM_FEED_THUMB_SIZE,
    borderRadius: ALBUM_FEED_THUMB_RADIUS,
  },
  more: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
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
