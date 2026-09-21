import { FeedCard } from '@/components/FeedCard';
import type { PhotoEventSummary } from '@/lib/photo-events';
import { formatPhotoCount, getPhotoPublicUrl } from '@/lib/photo-events';

interface PhotoEventRowProps {
  summary: PhotoEventSummary;
  authorName: string;
  onPress: () => void;
  onDelete?: () => void;
}

export function PhotoEventRow({ summary, authorName, onPress, onDelete }: PhotoEventRowProps) {
  const { event, photoCount, coverPhoto } = summary;

  return (
    <FeedCard
      authorName={authorName}
      title={event.title}
      timestamp={event.created_at}
      caption={formatPhotoCount(photoCount)}
      imageUri={coverPhoto ? getPhotoPublicUrl(coverPhoto, false) : null}
      onPress={onPress}
      onDelete={onDelete}
      testID={`photo-event-${event.id}`}
      deleteTestID={`delete-photo-event-${event.id}`}
    />
  );
}
